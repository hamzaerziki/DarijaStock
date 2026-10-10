from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.permissions import Permission
from app.models import Customer, User
from app.schemas.catalog import CustomerCreate, CustomerOut, CustomerUpdate
from app.schemas.common import Page
from app.services import audit, catalog

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=Page[CustomerOut])
def list_customers(
    q: str | None = None,
    active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_permitted_customers)),
):
    items, total = catalog.list_customers(
        db, q=q, active=active, offset=(page - 1) * page_size, limit=page_size
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_permitted_customers)),
):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable / الزبون ماموجودش")
    return customer


@router.post("", response_model=CustomerOut)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_customers)),
):
    customer = catalog.create_customer(db, payload)
    audit.record(db, action="customer.created", actor=actor, entity_type="customer", entity_id=customer.id,
                 details={"code": customer.code})
    db.commit()
    db.refresh(customer)
    return customer


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_customers)),
):
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client introuvable")
    catalog.update_customer(db, customer, payload)
    audit.record(db, action="customer.updated", actor=actor, entity_type="customer", entity_id=customer.id)
    db.commit()
    db.refresh(customer)
    return customer