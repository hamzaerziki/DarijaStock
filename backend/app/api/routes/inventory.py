from decimal import Decimal
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_any_permissions, require_permissions
from app.core.permissions import Permission
from app.models import User, Warehouse
from app.schemas.common import Page
from app.services import audit, inventory
from app.services.inventory import movement_history, stock_overview

router = APIRouter(prefix="/inventory", tags=["inventory"])


class WarehouseOut(BaseModel):
    id: int
    code: str
    name: str
    is_default: bool
    model_config = {"from_attributes": True}


class StockRow(BaseModel):
    product_id: int
    sku: str
    name: str
    name_ar: str | None = None
    unit: str
    price: Decimal
    reorder_threshold: Decimal
    physical: Decimal
    reserved: Decimal
    available: Decimal
    low_stock: bool
    model_config = {"from_attributes": True}


class StockMutation(BaseModel):
    warehouse_id: int | None = None
    amount: Decimal = Field(gt=0)
    note: str | None = None


class StockAdjust(BaseModel):
    warehouse_id: int | None = None
    new_physical: Decimal = Field(ge=0)
    note: str | None = None


class MovementOut(BaseModel):
    id: int
    movement_type: str
    physical_delta: Decimal
    reserved_delta: Decimal
    quantity_base: Decimal
    reference_type: str | None
    reference_id: int | None
    note: str | None
    product_id: int
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


@router.get("/warehouses", response_model=list[WarehouseOut])
def list_warehouses(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_inventory)),
):
    return list(db.scalars(select(Warehouse).order_by(Warehouse.is_default.desc(), Warehouse.id)))


@router.get("/stock", response_model=Page[StockRow])
def stock(
    q: str | None = None,
    warehouse_id: int | None = None,
    low_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_inventory)),
):
    rows, total = stock_overview(
        db, q=q, warehouse_id=warehouse_id, low_only=low_only,
        offset=(page - 1) * page_size, limit=page_size,
    )
    items = []
    for product, physical, reserved in rows:
        available = physical - reserved
        items.append(
            StockRow(
                product_id=product.id, sku=product.sku, name=product.name, name_ar=product.name_ar,
                unit=product.base_unit, price=product.price, reorder_threshold=product.reorder_threshold,
                physical=physical, reserved=reserved, available=available,
                low_stock=physical <= product.reorder_threshold,
            )
        )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/movements", response_model=Page[MovementOut])
def movements(
    product_id: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_inventory)),
):
    items, total = movement_history(db, product_id=product_id, offset=(page - 1) * page_size, limit=page_size)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("/receipts")
def receive(
    product_id: int,
    payload: StockMutation,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.receive_stock, Permission.manage_inventory)),
):
    wh = payload.warehouse_id or inventory.get_default_warehouse(db).id
    inventory.receive_stock(
        db, warehouse_id=wh, product_id=product_id, amount=payload.amount,
        reference_type="manual_receipt", note=payload.note, user=actor,
    )
    audit.record(db, action="inventory.receive", actor=actor, entity_type="product", entity_id=product_id,
                 details={"amount": str(payload.amount), "warehouse_id": wh})
    db.commit()
    return {"ok": True, "physical": _physical(db, wh, product_id)}


@router.post("/dispatch")
def dispatch(
    product_id: int,
    payload: StockMutation,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.dispatch_stock, Permission.manage_inventory)),
):
    wh = payload.warehouse_id or inventory.get_default_warehouse(db).id
    inventory.apply_physical(
        db, warehouse_id=wh, product_id=product_id, delta=-payload.amount,
        movement_type=inventory.MovementType.dispatch, reference_type="manual_dispatch",
        note=payload.note, user=actor,
    )
    audit.record(db, action="inventory.dispatch", actor=actor, entity_type="product", entity_id=product_id,
                 details={"amount": str(payload.amount), "warehouse_id": wh})
    db.commit()
    return {"ok": True, "physical": _physical(db, wh, product_id)}


@router.post("/adjust")
def adjust(
    product_id: int,
    payload: StockAdjust,
    db: Session = Depends(get_db),
    actor: User = Depends(require_any_permissions(Permission.adjust_stock, Permission.manage_inventory)),
):
    wh = payload.warehouse_id or inventory.get_default_warehouse(db).id
    inventory.adjust_stock(
        db, warehouse_id=wh, product_id=product_id, new_physical=payload.new_physical,
        note=payload.note, user=actor,
    )
    audit.record(db, action="inventory.adjust", actor=actor, entity_type="product", entity_id=product_id,
                 details={"new_physical": str(payload.new_physical), "warehouse_id": wh})
    db.commit()
    return {"ok": True, "physical": _physical(db, wh, product_id)}


def _physical(db: Session, wh: int, product_id: int) -> str:
    from app.models import StockBalance

    b = db.scalar(select(StockBalance).where(StockBalance.warehouse_id == wh, StockBalance.product_id == product_id))
    return str(b.physical) if b else "0"