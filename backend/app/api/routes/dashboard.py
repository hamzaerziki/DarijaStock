from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.permissions import Permission
from app.models import (
    Customer,
    ImportBatch,
    InventoryMovement,
    Invoice,
    Order,
    Product,
    StockBalance,
    User,
)
from app.services import inventory

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_authorized_records)),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Orders by status.
    status_rows = db.execute(
        select(Order.status, func.count(Order.id)).group_by(Order.status)
    ).all()
    orders_by_status = {s: c for s, c in status_rows}

    # Orders in period.
    orders_in_period = db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= since)
    ) or 0

    # Stock summary.
    total_physical = db.scalar(select(func.coalesce(func.sum(StockBalance.physical), 0))) or Decimal("0")
    total_reserved = db.scalar(select(func.coalesce(func.sum(StockBalance.reserved), 0))) or Decimal("0")

    # Low stock count (per product aggregated).
    totals = (
        select(
            StockBalance.product_id.label("pid"),
            func.coalesce(func.sum(StockBalance.physical), 0).label("physical"),
        )
        .group_by(StockBalance.product_id)
        .subquery()
    )
    low_stock_rows = db.execute(
        select(Product.id, Product.name, Product.sku, Product.base_unit, Product.reorder_threshold, totals.c.physical)
        .join(totals, totals.c.pid == Product.id, isouter=True)
        .where(func.coalesce(totals.c.physical, 0) <= Product.reorder_threshold)
        .order_by(Product.name)
        .limit(20)
    ).all()
    low_stock = [
        {
            "product_id": r[0], "name": r[1], "sku": r[2], "unit": r[3],
            "reorder_threshold": str(r[4]), "physical": str(r[5] or 0),
        }
        for r in low_stock_rows
    ]

    # Recent movements.
    movements = list(db.scalars(select(InventoryMovement).order_by(InventoryMovement.id.desc()).limit(10)))
    recent_movements = [
        {
            "id": m.id, "type": m.movement_type,
            "physical_delta": str(m.physical_delta), "reserved_delta": str(m.reserved_delta),
            "product_id": m.product_id,
            "product_name": m.product.name if m.product else None,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in movements
    ]

    # Invoice activity.
    invoice_status_rows = db.execute(
        select(Invoice.status, func.count(Invoice.id)).group_by(Invoice.status)
    ).all()
    invoices_by_status = {s: c for s, c in invoice_status_rows}
    issued_in_period = db.scalar(
        select(func.count(Invoice.id)).where(Invoice.issued_at >= since)
    ) or 0
    issued_total = db.scalar(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(
            Invoice.status == "issued", Invoice.issued_at >= since
        )
    ) or Decimal("0")

    # Counts.
    products_count = db.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True))) or 0
    customers_count = db.scalar(select(func.count(Customer.id)).where(Customer.is_active.is_(True))) or 0
    pending_imports = db.scalar(
        select(func.count(ImportBatch.id)).where(ImportBatch.status == "processing")
    ) or 0

    return {
        "orders_by_status": orders_by_status,
        "orders_in_period": orders_in_period,
        "products_count": products_count,
        "customers_count": customers_count,
        "pending_imports": pending_imports,
        "stock": {
            "physical": str(total_physical),
            "reserved": str(total_reserved),
            "available": str(total_physical - total_reserved),
        },
        "low_stock": low_stock,
        "low_stock_count": len(low_stock),
        "recent_movements": recent_movements,
        "invoices_by_status": invoices_by_status,
        "invoices_issued_in_period": issued_in_period,
        "invoices_total_in_period": str(issued_total),
        "period_days": days,
    }