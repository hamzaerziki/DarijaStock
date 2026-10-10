from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.models import InventoryMovement, Product, StockBalance, Warehouse
from app.services import inventory


def _setup(db):
    wh = Warehouse(code="W1", name="Magasin 1", is_default=True)
    db.add(wh)
    product = Product(sku="INV1", name="Product INV", price=10)
    db.add(product)
    db.commit()
    db.refresh(wh)
    db.refresh(product)
    return wh, product


def test_receive_and_dispatch(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("50"))
    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 50
    assert balance.reserved == 0

    inventory.apply_physical(
        db, warehouse_id=wh.id, product_id=product.id, delta=Decimal("-10"),
        movement_type=inventory.MovementType.dispatch, user=None,
    )
    db.commit()
    assert inventory.get_or_create_balance(db, wh.id, product.id).physical == 40

    movements = db.scalars(select(InventoryMovement).order_by(InventoryMovement.id)).all()
    assert len(movements) == 2
    assert movements[0].movement_type == "receipt"


def test_negative_stock_prevented(db):
    wh, product = _setup(db)
    from fastapi import HTTPException

    try:
        inventory.apply_physical(
            db, warehouse_id=wh.id, product_id=product.id, delta=Decimal("-5"),
            movement_type=inventory.MovementType.dispatch, user=None,
        )
        assert False, "should have raised"
    except HTTPException as exc:
        assert exc.status_code == 409


def test_adjust_stock(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("20"))
    inventory.adjust_stock(db, warehouse_id=wh.id, product_id=product.id, new_physical=Decimal("30"))
    db.commit()
    assert inventory.get_or_create_balance(db, wh.id, product.id).physical == 30


def test_reservation_locked(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("10"))
    inv = inventory.reserve_for_order_item(
        db, warehouse_id=wh.id, product_id=product.id, order_id=None, order_item_id=None, qty_base=Decimal("4")
    )
    db.commit()
    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 10
    assert balance.reserved == 4
    # available = 6; cannot reserve more than available
    from fastapi import HTTPException

    try:
        inventory.reserve_for_order_item(
            db, warehouse_id=wh.id, product_id=product.id, order_id=None, order_item_id=None, qty_base=Decimal("7")
        )
        assert False
    except HTTPException as exc:
        assert exc.status_code == 409


def test_concurrent_receipts_are_atomic(db):
    """Ten concurrent +1 receipts on a shared row must never go negative or lose updates."""
    import threading

    wh, product = _setup(db)
    errors: list[Exception] = []

    def worker(index: int):
        from app.db.session import SessionLocal as _SL
        from sqlalchemy import create_engine
        from app.core.config import settings

        engine = create_engine(settings.database_url, future=True)
        from sqlalchemy.orm import sessionmaker

        SessionT = sessionmaker(bind=engine, future=True, autoflush=False, autocommit=False)
        s = SessionT()
        try:
            inventory.receive_stock(
                s, warehouse_id=wh.id, product_id=product.id, amount=Decimal("5"),
                reference_type="test", note=f"worker-{index}",
            )
            s.commit()
        except Exception as exc:  # noqa: BLE001
            s.rollback()
            errors.append(exc)
        finally:
            s.close()

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, errors
    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 50


def test_concurrent_dispatch_never_negative(db):
    """Ten threads each removing 5 from a starting 30 must leave 0 at most, never negative."""
    import threading

    from fastapi import HTTPException

    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("30"))
    db.commit()

    results: list[str] = []
    lock = threading.Lock()

    def worker(index: int):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        engine = create_engine(settings.database_url, future=True)
        SessionT = sessionmaker(bind=engine, future=True, autoflush=False, autocommit=False)
        s = SessionT()
        try:
            inventory.apply_physical(
                s, warehouse_id=wh.id, product_id=product.id, delta=Decimal("-5"),
                movement_type=inventory.MovementType.dispatch, user=None,
            )
            s.commit()
            with lock:
                results.append("ok")
        except HTTPException as exc:
            s.rollback()
            with lock:
                results.append(f"conflict:{exc.status_code}")
        finally:
            s.close()

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical >= 0
    ok_count = results.count("ok")
    assert ok_count == 6  # 6 x 5 = 30
    assert balance.physical == 0