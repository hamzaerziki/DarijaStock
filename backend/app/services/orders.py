from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import (
    Order,
    OrderItem,
    OrderSource,
    OrderStatus,
    OrderStatusHistory,
    Product,
    ProductUnit,
    User,
    Warehouse,
)
from app.services import inventory
from app.services.money import money, quantity


def _resolve_price(product: Product, unit_code: str | None, override: Decimal | None) -> tuple[Decimal, Decimal, Decimal]:
    """Return (unit_price, tax_rate, factor_to_base).

    unit_price is the price of ONE unit of the selected unit_code (e.g. one
    carton), computed as base price × factor unless the unit has an explicit
    price override. factor_to_base converts quantities to base units for stock.
    """
    tax_rate = product.tax_rate if product.tax_rate is not None else Decimal(settings.default_tax_rate)
    factor = Decimal("1")
    price = product.price
    if unit_code:
        unit = next((u for u in product.units if u.code == unit_code), None)
        if unit:
            factor = unit.factor_to_base
            if unit.price_override is not None:
                price = unit.price_override
            else:
                price = product.price * factor
    if override is not None:
        price = override
    return money(price), Decimal(tax_rate), factor


def recalc_totals(order: Order) -> Order:
    subtotal = Decimal("0")
    discount_total = Decimal("0")
    tax_total = Decimal("0")
    for item in order.items:
        line = money(Decimal(item.quantity) * Decimal(item.unit_price))
        line = money(line - Decimal(item.discount))
        if line < 0:
            line = Decimal("0.00")
        item.line_total = line
        subtotal += line
        discount_total += Decimal(item.discount)
        tax_total += money(line * Decimal(item.tax_rate) / Decimal("100"))
    order.subtotal = money(subtotal)
    order.discount_total = money(discount_total)
    order.tax_total = money(tax_total)
    order.total = money(order.subtotal + order.tax_total)
    return order


def _build_item(db: Session, order: Order, data) -> OrderItem:
    product = None
    if data.product_id:
        product = db.get(Product, data.product_id)
        if product is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Produit #{data.product_id} introuvable")
    if product is None and not data.raw_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Item needs product or raw text")

    if product:
        price, tax_rate, factor = _resolve_price(product, data.unit_code, data.unit_price)
        match_status = data.match_status or "matched"
        raw_text = data.raw_text or product.name
    else:
        price = money(data.unit_price if data.unit_price is not None else Decimal("0"))
        tax_rate = Decimal(data.tax_rate if data.tax_rate is not None else settings.default_tax_rate)
        factor = Decimal("1")
        match_status = "unmatched"
        raw_text = data.raw_text

    item = OrderItem(
        order_id=order.id,
        product_id=product.id if product else None,
        raw_text=raw_text,
        unit_code=data.unit_code,
        quantity=quantity(data.quantity),
        quantity_base=quantity(Decimal(data.quantity) * factor),
        unit_price=price,
        tax_rate=tax_rate,
        discount=money(data.discount or 0),
        match_status=match_status,
        note=data.note,
    )
    return item


def add_history(db: Session, order: Order, to_status: str, user: User | None, note: str | None = None, from_status: str | None = None):
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=from_status if from_status is not None else order.status,
            to_status=to_status,
            changed_by_id=user.id if user else None,
            note=note,
        )
    )


def create_order(db: Session, payload, user: User | None, *, source: str = OrderSource.manual) -> Order:
    from app.services.numbering import next_order_number

    if payload.external_ref:
        existing = db.scalar(select(Order).where(Order.external_ref == payload.external_ref))
        if existing:
            return existing

    warehouse_id = payload.warehouse_id
    if warehouse_id is None:
        warehouse_id = inventory.get_default_warehouse(db).id

    order = Order(
        order_number=next_order_number(db),
        customer_id=payload.customer_id,
        source=source,
        warehouse_id=warehouse_id,
        customer_note=payload.customer_note,
        internal_note=payload.internal_note,
        external_ref=payload.external_ref,
        currency=settings.currency,
        status=OrderStatus.new,
        created_by_id=user.id if user else None,
    )
    db.add(order)
    db.flush()

    for item_data in payload.items:
        order.items.append(_build_item(db, order, item_data))
    db.flush()
    recalc_totals(order)
    add_history(db, order, OrderStatus.new, user, note="Order created")
    db.flush()
    return order


def replace_items(db: Session, order: Order, items: list) -> Order:
    if order.status not in (OrderStatus.new, OrderStatus.needs_review):
        raise HTTPException(status.HTTP_409_CONFLICT, "Order ma ymkench tbedel / الطلبية ما يمكن تعديلها فهاد الحالة")
    order.items.clear()
    db.flush()
    for item_data in items:
        order.items.append(_build_item(db, order, item_data))
    db.flush()
    recalc_totals(order)
    order.status = OrderStatus.new
    db.flush()
    return order


def create_order_from_import(
    db: Session,
    *,
    customer_hint: dict,
    raw_items: list[dict],
    source: str,
    delivery_notes: str | None,
    user: User | None,
    requires_review: bool,
    external_hint: str | None = None,
) -> tuple[Order, bool]:
    from app.models import Customer
    from app.services import inventory
    from app.services.numbering import next_order_number

    warehouse_id = inventory.get_default_warehouse(db).id
    customer = None
    phone = (customer_hint or {}).get("phone")
    if phone:
        customer = db.scalar(select(Customer).where(Customer.phone == phone))

    order = Order(
        order_number=next_order_number(db),
        customer_id=customer.id if customer else None,
        source=source,
        warehouse_id=warehouse_id,
        customer_note=delivery_notes,
        external_ref=f"wa-{external_hint}" if external_hint else None,
        currency=settings.currency,
        status=OrderStatus.needs_review if requires_review else OrderStatus.new,
        created_by_id=user.id if user else None,
    )
    db.add(order)
    db.flush()

    unresolved = False
    for it in raw_items:
        product = None
        if it.get("product_id"):
            product = db.get(Product, it["product_id"])
        price = Decimal("0.00")
        tax_rate = Decimal(str(settings.default_tax_rate))
        factor = Decimal("1")
        if product:
            price, tax_rate, factor = _resolve_price(product, it.get("unit"), None)
            status_value = it.get("match_status", "matched")
        else:
            status_value = "unmatched"
            unresolved = True

        qty_text = it.get("quantity")
        try:
            qty = Decimal(str(qty_text)) if qty_text is not None else Decimal("0")
        except Exception:
            qty = Decimal("0")
        if qty <= 0:
            qty = Decimal("0")
            unresolved = True

        order.items.append(
            OrderItem(
                order_id=order.id,
                product_id=product.id if product else None,
                raw_text=it.get("raw_text") or (product.name if product else ""),
                unit_code=it.get("unit"),
                quantity=qty,
                quantity_base=quantity(qty * factor),
                unit_price=price,
                tax_rate=tax_rate,
                match_status=status_value,
                match_confidence=Decimal(str(it.get("match_confidence") or 0)),
                note="",
            )
        )
    db.flush()
    recalc_totals(order)
    add_history(
        db,
        order,
        OrderStatus.needs_review if requires_review else OrderStatus.new,
        user,
        note="Imported from WhatsApp message",
    )
    db.flush()
    return order, unresolved


def create_web_order(db: Session, payload, ip_note: str | None = None) -> Order:
    """Create an order from the public customer form.

    The payload contains a fresh customer name/phone; we reuse an existing
    customer when the phone already exists. The order starts as
    ``needs_review`` and requires business approval before fulfillment.
    """
    from app.models import Customer
    from app.services import inventory, numbering

    customer = None
    if payload.phone:
        customer = db.scalar(select(Customer).where(Customer.phone == payload.phone))
    if customer is None:
        code = "WEB" + payload.phone[-6:] if payload.phone else "WEB"
        idx = 0
        while db.scalar(select(Customer).where(Customer.code == code)):
            idx += 1
            code = f"WEB{idx}" + (payload.phone[-6:] if payload.phone else "")
        customer = Customer(
            code=code,
            name=payload.name,
            phone=payload.phone,
            city=payload.city,
            address=payload.address,
        )
        db.add(customer)
        db.flush()

    warehouse_id = inventory.get_default_warehouse(db).id
    order = Order(
        order_number=numbering.next_order_number(db),
        customer_id=customer.id,
        source=OrderSource.web,
        warehouse_id=warehouse_id,
        customer_note=payload.note,
        currency=settings.currency,
        status=OrderStatus.needs_review,
    )
    db.add(order)
    db.flush()

    for item_in in payload.items:
        product = db.get(Product, item_in.product_id)
        if product is None or not product.is_active or not product.show_in_public:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Produit invalide: {item_in.product_id}")
        price, tax_rate, factor = _resolve_price(product, product.base_unit, None)
        order.items.append(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                raw_text=product.name,
                unit_code=product.base_unit,
                quantity=quantity(item_in.quantity),
                quantity_base=quantity(Decimal(item_in.quantity) * factor),
                unit_price=price,
                tax_rate=tax_rate,
                match_status="matched",
            )
        )
    db.flush()
    recalc_totals(order)
    add_history(db, order, OrderStatus.needs_review, None, note="Customer web order")
    db.flush()

    from app.services import audit

    audit.record(
        db,
        action="web_order.created",
        entity_type="order",
        entity_id=order.id,
        details={"customer_id": customer.id, "items": len(order.items), "ip": ip_note},
        note="Created via public order form",
    )
    return order


def _has_unresolved(order: Order) -> bool:
    for item in order.items:
        if item.product_id is None or item.match_status in ("ambiguous", "unmatched"):
            return True
    return False


def confirm_order(db: Session, order: Order, user: User | None) -> Order:
    if order.status not in (OrderStatus.new, OrderStatus.needs_review):
        raise HTTPException(status.HTTP_409_CONFLICT, "Order déjà confirmée / الطلبية مؤكدة من قبل")
    if not order.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order khawi / الطلبية خاوية")
    if _has_unresolved(order):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Kayn produits ma mwitch / كاينين منتوجات ما تما طلاقهم. خاصك تراجعهم قبل التأكيد.",
        )
    from_status = order.status
    order.status = OrderStatus.confirmed
    order.confirmed_at = datetime.now(timezone.utc)
    if settings.reserve_on_confirm:
        _reserve_order(db, order, user)
    add_history(db, order, OrderStatus.confirmed, user, from_status=from_status)
    db.flush()
    return order


def _reserve_order(db: Session, order: Order, user: User | None) -> None:
    wh = order.warehouse_id or inventory.get_default_warehouse(db).id
    for item in order.items:
        inventory.reserve_for_order_item(
            db,
            warehouse_id=wh,
            product_id=item.product_id,
            order_id=order.id,
            order_item_id=item.id,
            qty_base=Decimal(item.quantity_base),
            user=user,
        )
    order.status = OrderStatus.reserved


def mark_preparing(db: Session, order: Order, user: User | None) -> Order:
    if order.status not in (OrderStatus.confirmed, OrderStatus.reserved):
        raise HTTPException(status.HTTP_409_CONFLICT, "Statut ma ymkench / الحالة ما يمكن")
    from_status = order.status
    order.status = OrderStatus.preparing
    add_history(db, order, OrderStatus.preparing, user, from_status=from_status)
    db.flush()
    return order


def fulfill_order(db: Session, order: Order, user: User | None) -> Order:
    if order.status not in (OrderStatus.confirmed, OrderStatus.reserved, OrderStatus.preparing):
        raise HTTPException(status.HTTP_409_CONFLICT, "Order khass tkoun confirmée 9bel / خاص الطلبية تكون مؤكدة")
    from_status = order.status
    had_reservations = any(r.status == "active" for r in _reservations(db, order.id))
    if had_reservations:
        inventory.dispatch_reservations_for_order(db, order.id, user=user)
    else:
        wh = order.warehouse_id or inventory.get_default_warehouse(db).id
        for item in order.items:
            inventory.apply_physical(
                db,
                warehouse_id=wh,
                product_id=item.product_id,
                delta=-Decimal(item.quantity_base),
                movement_type=inventory.MovementType.dispatch,
                reference_type="order",
                reference_id=order.id,
                user=user,
            )
    order.status = OrderStatus.fulfilled
    order.fulfilled_at = datetime.now(timezone.utc)
    add_history(db, order, OrderStatus.fulfilled, user, from_status=from_status)
    db.flush()
    return order


def _reservations(db: Session, order_id: int):
    from app.models import InventoryReservation

    return list(db.scalars(select(InventoryReservation).where(InventoryReservation.order_id == order_id)))


def cancel_order(db: Session, order: Order, user: User | None, reason: str | None = None) -> Order:
    if order.status == OrderStatus.cancelled:
        return order
    if order.status == OrderStatus.fulfilled:
        raise HTTPException(status.HTTP_409_CONFLICT, "Order mfulfiliya / الطلبية موصلة ما يمكن إلغاؤها")
    inventory.release_reservations_for_order(db, order.id, user=user)
    from_status = order.status
    order.status = OrderStatus.cancelled
    order.cancelled_at = datetime.now(timezone.utc)
    add_history(db, order, OrderStatus.cancelled, user, note=reason, from_status=from_status)
    db.flush()
    return order


def list_orders(
    db: Session,
    *,
    q: str | None = None,
    status_filter: str | None = None,
    source: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Order], int]:
    stmt = select(Order)
    count_stmt = select(func.count()).select_from(Order)
    conditions = []
    if q:
        like = f"%{q}%"
        conditions.append(or_(Order.order_number.ilike(like), Order.customer_note.ilike(like)))
    if status_filter:
        conditions.append(Order.status == status_filter)
    if source:
        conditions.append(Order.source == source)
    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    stmt = stmt.order_by(Order.id.desc()).offset(offset).limit(limit)
    items = list(db.scalars(stmt).unique())
    total = db.scalar(count_stmt) or 0
    return items, total
