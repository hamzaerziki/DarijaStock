from decimal import Decimal

from sqlalchemy import select

from app.models import (
    InventoryReservation,
    Order,
    StockBalance,
    Warehouse,
)
from app.services import inventory, orders


def _setup(db):
    wh = Warehouse(code="W1", name="Wh", is_default=True)
    db.add(wh)
    prod = models_product(db, "ORD1", "Produit", Decimal("20.00"))
    return wh, prod


def models_product(db, sku, name, price):
    from app.models import Product, ProductUnit

    p = Product(sku=sku, name=name, price=price, tax_rate=Decimal("10.00"))
    db.add(p)
    db.flush()
    db.add(ProductUnit(product_id=p.id, code="piece", name="pièce", factor_to_base=1, is_base=True))
    db.add(ProductUnit(product_id=p.id, code="carton", name="carton", factor_to_base=Decimal("12")))
    db.commit()
    db.refresh(p)
    return p


class _C:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def _item(product, qty=2, unit=None):
    return _C(product_id=product.id, raw_text=None, unit_code=unit, quantity=Decimal(qty),
              unit_price=None, tax_rate=None, discount=Decimal("0"), note=None, match_status="matched")


def test_manual_order_totals_with_tax(db):
    wh, product = _setup(db)
    create = _C(customer_id=None, source="manual", warehouse_id=wh.id,
                customer_note=None, internal_note=None, items=[_item(product, 2), _item(product, 1, "carton")],
                external_ref=None)
    order = orders.create_order(db, create, None)
    # prices: 2 * 20.00 + 1 carton (12 pcs) * 20.00 = 40 + 240 = 280 subtotal
    assert order.subtotal == Decimal("280.00"), order.subtotal
    # tax 10% => 28
    assert order.tax_total == Decimal("28.00")
    assert order.total == Decimal("308.00")


def test_draft_does_not_touch_stock(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("100"))
    db.flush()

    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None, items=[_item(product, 5)], external_ref=None)
    order = orders.create_order(db, create, None)
    db.commit()

    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 100
    assert balance.reserved == 0
    assert order.status == "new"


def test_confirm_reserves_stock(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("100"))
    db.flush()

    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None, items=[_item(product, 5)], external_ref=None)
    order = orders.create_order(db, create, None)
    db.flush()
    orders.confirm_order(db, order, None)
    db.commit()

    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 100
    assert balance.reserved == 5
    res = db.scalars(select(InventoryReservation)).all()
    assert len(res) == 1 and res[0].status == "active"


def test_confirm_requires_resolved_products(db):
    wh, product = _setup(db)
    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None,
                items=[_C(product_id=None, raw_text="Unknown thing", unit_code=None, quantity=Decimal("2"),
                          unit_price=Decimal("5"), tax_rate=Decimal("0"), discount=Decimal("0"), note=None,
                          match_status="unmatched")], external_ref=None)
    order = orders.create_order(db, create, None)
    from fastapi import HTTPException

    try:
        orders.confirm_order(db, order, None)
        assert False
    except HTTPException as exc:
        assert exc.status_code == 400


def test_fulfill_deducts_physical(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("100"))
    db.flush()

    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None, items=[_item(product, 5)], external_ref=None)
    order = orders.create_order(db, create, None)
    db.flush()
    orders.confirm_order(db, order, None)
    db.flush()
    orders.fulfill_order(db, order, None)
    db.commit()

    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 95
    assert balance.reserved == 0
    assert order.status == "fulfilled"


def test_cancel_releases_reservations(db):
    wh, product = _setup(db)
    inventory.receive_stock(db, warehouse_id=wh.id, product_id=product.id, amount=Decimal("100"))
    db.flush()

    create = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                internal_note=None, items=[_item(product, 5)], external_ref=None)
    order = orders.create_order(db, create, None)
    db.flush()
    orders.confirm_order(db, order, None)
    db.flush()
    orders.cancel_order(db, order, None, reason="test")
    db.commit()

    balance = inventory.get_or_create_balance(db, wh.id, product.id)
    assert balance.physical == 100
    assert balance.reserved == 0
    assert order.status == "cancelled"


def test_order_number_unique_and_idempotent_external_ref(db):
    wh, product = _setup(db)
    item = _item(product, 1)
    create1 = _C(customer_id=None, source="manual", warehouse_id=wh.id, customer_note=None,
                 internal_note=None, items=[item], external_ref="ext-abcdef")
    o1 = orders.create_order(db, create1, None)
    o2 = orders.create_order(db, create1, None)
    assert o1.id == o2.id  # same external_ref deduplicated
    assert o1.order_number == o2.order_number