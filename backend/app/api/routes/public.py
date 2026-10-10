from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, get_db
from app.db.session import get_db as _get_db  # noqa: F401
from app.models import Order, Product
from app.schemas.catalog import PublicProduct
from app.schemas.order import PublicOrderCreate, OrderOut
from app.services import orders

router = APIRouter(prefix="/public", tags=["public"])


class TrackRequest(BaseModel):
    order_number: str = Field(min_length=3, max_length=40)
    phone: str = Field(min_length=6, max_length=50)


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
        "message": "Mrc! Wasalna order dyalek, ghadi n3aytokom / تشكرنا، توصلنا بطلبيتك وسنتواصل معك قريبا",
    }


@router.post("/orders/track", response_model=OrderOut)
def track_order(payload: TrackRequest, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.order_number == payload.order_number))
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable / الطلبية ما لقاتش")
    if order.customer and order.customer.phone:
        p = order.customer.phone.replace("\D", "")
        pp = payload.phone.replace("\D", "")
        if p != pp:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable / الطلبية ما لقاتش")
    return order


@router.get("/orders/{order_number}", response_model=OrderOut)
def get_order_public(order_number: str, phone: str | None = None, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.order_number == order_number))
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable")
    if phone and order.customer and order.customer.phone:
        if order.customer.phone.replace("\D", "") != phone.replace("\D", ""):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Commande introuvable")
    return order
