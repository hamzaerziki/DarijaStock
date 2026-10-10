from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, get_db
from app.db.session import get_db as _get_db  # noqa: F401
from app.models import Product
from app.schemas.catalog import PublicProduct
from app.schemas.order import PublicOrderCreate
from app.services import orders

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/products", response_model=list[PublicProduct])
def public_products(db: Session = Depends(get_db)):
    items = list(
        db.scalars(
            select(Product)
            .where(Product.is_active.is_(True), Product.show_in_public.is_(True))
            .order_by(Product.category, Product.name)
        ).unique()
    )
    return items


@router.post("/orders", status_code=status.HTTP_201_CREATED)
def submit_order(payload: PublicOrderCreate, request: Request, db: Session = Depends(get_db)):
    order = orders.create_web_order(db, payload, ip_note=client_ip(request))
    db.commit()
    return {
        "order_number": order.order_number,
        "status": order.status,
        "message": "Mrc! Wasalna order dyalek, ghadi n3aytokom / شكرا، توصلنا بطلبيتك وسنتواصل معك قريبا",
    }