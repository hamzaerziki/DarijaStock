from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.permissions import Permission
from app.models import AuditEvent, Customer, Invoice, Order, Product, StockBalance, User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_authorized_reports)),
):
    return {
        "products": db.scalar(select(func.count(Product.id))) or 0,
        "customers": db.scalar(select(func.count(Customer.id))) or 0,
        "orders": db.scalar(select(func.count(Order.id))) or 0,
        "invoices": db.scalar(select(func.count(Invoice.id))) or 0,
        "issued_invoices_total": str(
            db.scalar(select(func.coalesce(func.sum(Invoice.total), 0)).where(Invoice.status == "issued")) or 0
        ),
        "stock_physical": str(
            db.scalar(select(func.coalesce(func.sum(StockBalance.physical), 0))) or 0
        ),
        "stock_reserved": str(
            db.scalar(select(func.coalesce(func.sum(StockBalance.reserved), 0))) or 0
        ),
    }


@router.get("/audit")
def audit_log(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_reports)),
):
    events = list(db.scalars(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(limit)))
    return [
        {
            "id": e.id, "action": e.action, "actor_name": e.actor_name,
            "entity_type": e.entity_type, "entity_id": e.entity_id,
            "details": e.details, "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]