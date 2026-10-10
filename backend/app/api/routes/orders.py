from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_any_permissions, require_permissions
from app.core.permissions import Permission
from app.models import Order, OrderStatusHistory, User
from app.schemas.common import Page
from app.schemas.order import (
    OrderCreate,
    OrderItemIn,
    OrderOut,
    OrderStatusChange,
    OrderUpdate,
)
from app.services import audit, orders

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=Page[OrderOut])
def list_orders(
    q: str | None = None,
    status_filter: str | None = None,
    source: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_authorized_records)),
):
    items, total = orders.list_orders(
        db, q=q, status_filter=status_filter, source=source,
        offset=(page - 1) * page_size, limit=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_authorized_records)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable / الطلبية ماموجوداش")
    return order


@router.get("/{order_id}/history", response_model=list[dict])
def order_history(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_authorized_records)),
):
    rows = list(
        db.scalars(select(OrderStatusHistory).where(OrderStatusHistory.order_id == order_id).order_by(OrderStatusHistory.id))
    )
    return [
        {
            "id": r.id, "from_status": r.from_status, "to_status": r.to_status,
            "changed_by_id": r.changed_by_id, "note": r.note, "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("", response_model=OrderOut)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.create_orders)),
):
    if not payload.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order khass ت 3endha items / خاص الطلبية يكون فيها عناصر")
    order = orders.create_order(db, payload, actor, source=payload.source)
    audit.record(db, action="order.created", actor=actor, entity_type="order", entity_id=order.id,
                 details={"number": order.order_number, "source": order.source, "items": len(order.items)})
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}", response_model=OrderOut)
def update_order(
    order_id: int,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.edit_unconfirmed_orders, Permission.manage_orders)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    if order.status in ("fulfilled", "cancelled"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Order mchi f état li khasser / الطلبية فحالة لا يمكن تعديلها")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(order, k, v)
    audit.record(db, action="order.updated", actor=actor, entity_type="order", entity_id=order.id,
                 details={"fields": list(data.keys())})
    db.commit()
    db.refresh(order)
    return order


class ItemsPayload(BaseModel):
    items: list[OrderItemIn]


@router.put("/{order_id}/items", response_model=OrderOut)
def replace_items(
    order_id: int,
    payload: ItemsPayload,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.edit_unconfirmed_orders, Permission.manage_orders)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    orders.replace_items(db, order, payload.items)
    audit.record(db, action="order.items_updated", actor=actor, entity_type="order", entity_id=order.id,
                 details={"items": len(payload.items)})
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/confirm", response_model=OrderOut)
def confirm_order(
    order_id: int,
    payload: OrderStatusChange | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.approve_orders)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    orders.confirm_order(db, order, actor)
    audit.record(db, action="order.confirmed", actor=actor, entity_type="order", entity_id=order.id,
                 details={"number": order.order_number})
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/prepare", response_model=OrderOut)
def prepare_order(
    order_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.manage_orders, Permission.approve_orders)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    orders.mark_preparing(db, order, actor)
    audit.record(db, action="order.preparing", actor=actor, entity_type="order", entity_id=order.id)
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/fulfill", response_model=OrderOut)
def fulfill_order(
    order_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.dispatch_stock, Permission.manage_orders, Permission.manage_inventory)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    orders.fulfill_order(db, order, actor)
    audit.record(db, action="order.fulfilled", actor=actor, entity_type="order", entity_id=order.id,
                 details={"number": order.order_number})
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: int,
    payload: OrderStatusChange | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.manage_orders, Permission.reject_orders)),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order introuvable")
    note = payload.note if payload else None
    orders.cancel_order(db, order, actor, reason=note)
    audit.record(db, action="order.cancelled", actor=actor, entity_type="order", entity_id=order.id,
                 details={"number": order.order_number, "reason": note})
    db.commit()
    db.refresh(order)
    return order