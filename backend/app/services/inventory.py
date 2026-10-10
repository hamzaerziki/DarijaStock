from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    InventoryMovement,
    InventoryReservation,
    Product,
    StockBalance,
    User,
    Warehouse,
)
from app.services.money import quantity


class MovementType:
    opening = "opening"
    receipt = "receipt"
    dispatch = "dispatch"
    return_ = "return"
    adjustment = "adjustment"
    reserve = "reserve"
    release = "release"


def get_default_warehouse(db: Session) -> Warehouse:
    wh = db.scalar(select(Warehouse).where(Warehouse.is_default.is_(True)))
    if wh is None:
        wh = db.scalar(select(Warehouse).order_by(Warehouse.id))
    if wh is None:
        wh = Warehouse(code="MAIN", name="المخزن الرئيسي", is_default=True)
        db.add(wh)
        db.flush()
    return wh


def get_or_create_balance(db: Session, warehouse_id: int, product_id: int) -> StockBalance:
    balance = db.scalar(
        select(StockBalance)
        .where(
            StockBalance.warehouse_id == warehouse_id,
            StockBalance.product_id == product_id,
        )
        .with_for_update()
    )
    if balance is None:
        balance = StockBalance(
            warehouse_id=warehouse_id, product_id=product_id, physical=Decimal("0"), reserved=Decimal("0")
        )
        db.add(balance)
        try:
            db.flush()
        except Exception:
            db.rollback()
            balance = db.scalar(
                select(StockBalance)
                .where(
                    StockBalance.warehouse_id == warehouse_id,
                    StockBalance.product_id == product_id,
                )
                .with_for_update()
            )
            if balance is None:
                raise
    return balance


def _movement(
    db: Session,
    *,
    warehouse_id: int,
    product_id: int,
    movement_type: str,
    physical_delta: Decimal = Decimal("0"),
    reserved_delta: Decimal = Decimal("0"),
    quantity_base: Decimal = Decimal("0"),
    reference_type: str | None = None,
    reference_id: int | None = None,
    note: str | None = None,
    user: User | None = None,
) -> InventoryMovement:
    mv = InventoryMovement(
        warehouse_id=warehouse_id,
        product_id=product_id,
        movement_type=movement_type,
        physical_delta=quantity(physical_delta),
        reserved_delta=quantity(reserved_delta),
        quantity_base=quantity(quantity_base),
        reference_type=reference_type,
        reference_id=reference_id,
        note=note,
        created_by_id=user.id if user else None,
    )
    db.add(mv)
    return mv


def apply_physical(
    db: Session,
    *,
    warehouse_id: int,
    product_id: int,
    delta: Decimal,
    movement_type: str,
    reference_type: str | None = None,
    reference_id: int | None = None,
    note: str | None = None,
    user: User | None = None,
    allow_negative: bool | None = None,
) -> StockBalance:
    """Apply a signed physical stock change with row-level locking."""
    if allow_negative is None:
        allow_negative = settings.allow_negative_stock
    balance = get_or_create_balance(db, warehouse_id, product_id)
    new_physical = balance.physical + quantity(delta)
    if new_physical < 0 and not allow_negative:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Stock insuffisant / الستوك ما كافيش (produit #{product_id})",
        )
    balance.physical = quantity(new_physical)
    _movement(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
        movement_type=movement_type,
        physical_delta=delta,
        quantity_base=delta,
        reference_type=reference_type,
        reference_id=reference_id,
        note=note,
        user=user,
    )
    db.flush()
    return balance


def receive_stock(
    db: Session,
    *,
    warehouse_id: int,
    product_id: int,
    amount: Decimal,
    reference_type: str = "manual",
    reference_id: int | None = None,
    note: str | None = None,
    user: User | None = None,
) -> StockBalance:
    if amount <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Quantité khass tkoun > 0")
    return apply_physical(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
        delta=quantity(amount),
        movement_type=MovementType.receipt,
        reference_type=reference_type,
        reference_id=reference_id,
        note=note,
        user=user,
    )


def adjust_stock(
    db: Session,
    *,
    warehouse_id: int,
    product_id: int,
    new_physical: Decimal,
    note: str | None = None,
    user: User | None = None,
) -> StockBalance:
    balance = get_or_create_balance(db, warehouse_id, product_id)
    delta = quantity(new_physical) - balance.physical
    if delta == 0:
        return balance
    return apply_physical(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
        delta=delta,
        movement_type=MovementType.adjustment,
        reference_type="adjustment",
        note=note,
        user=user,
    )


def reserve_for_order_item(
    db: Session,
    *,
    warehouse_id: int,
    product_id: int,
    order_id: int,
    order_item_id: int,
    qty_base: Decimal,
    user: User | None = None,
) -> InventoryReservation:
    balance = get_or_create_balance(db, warehouse_id, product_id)
    available = balance.physical - balance.reserved
    if available < qty_base and not settings.allow_negative_stock:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Stock disponible insuffisant / الستوك المتاح ما كافيش (produit #{product_id})",
        )
    balance.reserved = quantity(balance.reserved + qty_base)
    _movement(
        db,
        warehouse_id=warehouse_id,
        product_id=product_id,
        movement_type=MovementType.reserve,
        reserved_delta=qty_base,
        quantity_base=qty_base,
        reference_type="order",
        reference_id=order_id,
        user=user,
    )
    reservation = InventoryReservation(
        warehouse_id=warehouse_id,
        product_id=product_id,
        order_id=order_id,
        order_item_id=order_item_id,
        quantity_base=quantity(qty_base),
        status="active",
    )
    db.add(reservation)
    db.flush()
    return reservation


def release_reservations_for_order(
    db: Session, order_id: int, *, user: User | None = None
) -> None:
    active = list(
        db.scalars(
            select(InventoryReservation).where(
                InventoryReservation.order_id == order_id,
                InventoryReservation.status == "active",
            )
        )
    )
    for res in active:
        balance = get_or_create_balance(db, res.warehouse_id, res.product_id)
        balance.reserved = quantity(max(Decimal("0"), balance.reserved - res.quantity_base))
        _movement(
            db,
            warehouse_id=res.warehouse_id,
            product_id=res.product_id,
            movement_type=MovementType.release,
            reserved_delta=-res.quantity_base,
            quantity_base=res.quantity_base,
            reference_type="order",
            reference_id=order_id,
            user=user,
        )
        res.status = "released"
    db.flush()


def dispatch_reservations_for_order(
    db: Session, order_id: int, *, user: User | None = None
) -> None:
    """Convert active reservations into a physical stock deduction."""
    active = list(
        db.scalars(
            select(InventoryReservation).where(
                InventoryReservation.order_id == order_id,
                InventoryReservation.status == "active",
            )
        )
    )
    for res in active:
        balance = get_or_create_balance(db, res.warehouse_id, res.product_id)
        new_physical = balance.physical - res.quantity_base
        if new_physical < 0 and not settings.allow_negative_stock:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Stock insuffisant lors du dispatch / الستوك ما كافيش (produit #{res.product_id})",
            )
        balance.physical = quantity(new_physical)
        balance.reserved = quantity(max(Decimal("0"), balance.reserved - res.quantity_base))
        _movement(
            db,
            warehouse_id=res.warehouse_id,
            product_id=res.product_id,
            movement_type=MovementType.dispatch,
            physical_delta=-res.quantity_base,
            reserved_delta=-res.quantity_base,
            quantity_base=res.quantity_base,
            reference_type="order",
            reference_id=order_id,
            user=user,
        )
        res.status = "consumed"
    db.flush()


def stock_overview(
    db: Session,
    *,
    q: str | None = None,
    warehouse_id: int | None = None,
    low_only: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[tuple[Product, Decimal, Decimal]], int]:
    """Return (product, physical, reserved) joined with product data."""
    # Aggregate balances per product (across warehouses unless one is specified).
    filters = []
    if warehouse_id is not None:
        filters.append(StockBalance.warehouse_id == warehouse_id)

    totals = (
        select(
            StockBalance.product_id.label("product_id"),
            func.coalesce(func.sum(StockBalance.physical), 0).label("physical"),
            func.coalesce(func.sum(StockBalance.reserved), 0).label("reserved"),
        )
        .group_by(StockBalance.product_id)
    )
    for f in filters:
        totals = totals.where(f)
    totals = totals.subquery()

    stmt = select(Product, totals.c.physical, totals.c.reserved).join(
        totals, totals.c.product_id == Product.id, isouter=True
    )
    count_stmt = select(func.count()).select_from(Product)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like), Product.name_ar.ilike(like)))
        count_stmt = count_stmt.where(or_(Product.name.ilike(like), Product.sku.ilike(like), Product.name_ar.ilike(like)))
    if low_only:
        stmt = stmt.where(func.coalesce(totals.c.physical, 0) <= Product.reorder_threshold)
    stmt = stmt.order_by(Product.name).offset(offset).limit(limit)

    rows = db.execute(stmt).all()
    # Count approximation for low_only is handled client-side; keep simple count.
    total = db.scalar(count_stmt) or 0
    result = [
        (row[0], Decimal(str(row[1] or 0)), Decimal(str(row[2] or 0))) for row in rows
    ]
    return result, total


def movement_history(
    db: Session,
    *,
    product_id: int | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[InventoryMovement], int]:
    stmt = select(InventoryMovement)
    count_stmt = select(func.count()).select_from(InventoryMovement)
    if product_id is not None:
        stmt = stmt.where(InventoryMovement.product_id == product_id)
        count_stmt = count_stmt.where(InventoryMovement.product_id == product_id)
    stmt = stmt.order_by(InventoryMovement.id.desc()).offset(offset).limit(limit)
    items = list(db.scalars(stmt).unique())
    total = db.scalar(count_stmt) or 0
    return items, total
