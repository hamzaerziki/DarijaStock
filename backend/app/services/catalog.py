from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Customer, Product, ProductAlias, ProductUnit
from app.schemas.catalog import (
    CustomerCreate,
    CustomerUpdate,
    ProductCreate,
    ProductUpdate,
)
from app.services.text import normalize

_DEFAULT_UNIT_FACTORS = {
    "piece": Decimal("1"),
    "pack": Decimal("1"),
    "carton": Decimal("1"),
    "box": Decimal("1"),
}


# --------------------------------------------------------------------------
# Products
# --------------------------------------------------------------------------
def _sync_aliases(db: Session, product: Product, aliases) -> None:
    product.aliases.clear()
    seen: set[str] = set()
    for a in aliases:
        norm = normalize(a.alias)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        product.aliases.append(
            ProductAlias(alias=a.alias.strip(), normalized=norm, language=a.language)
        )


def _sync_units(db: Session, product: Product, units) -> None:
    if not units:
        # Always guarantee a base unit exists.
        if not any(u.is_base for u in product.units):
            product.units.append(
                ProductUnit(
                    code=product.base_unit,
                    name=product.base_unit,
                    factor_to_base=Decimal("1"),
                    is_base=True,
                )
            )
        return
    product.units.clear()
    for u in units:
        product.units.append(
            ProductUnit(
                code=u.code.strip(),
                name=u.name.strip(),
                factor_to_base=u.factor_to_base,
                price_override=u.price_override,
                is_base=u.is_base,
            )
        )


def create_product(db: Session, payload: ProductCreate) -> Product:
    if db.scalar(select(Product).where(Product.sku == payload.sku)):
        raise HTTPException(status.HTTP_409_CONFLICT, "SKU déjà utilisé / هاد الكود مستعمل")
    data = payload.model_dump(exclude={"aliases", "units"})
    product = Product(**data)
    _sync_aliases(db, product, payload.aliases)
    db.add(product)
    db.flush()
    _sync_units(db, product, payload.units)
    db.flush()
    return product


def update_product(db: Session, product: Product, payload: ProductUpdate) -> Product:
    data = payload.model_dump(exclude_unset=True)
    if "sku" in data and data["sku"] != product.sku:
        if db.scalar(select(Product).where(Product.sku == data["sku"])):
            raise HTTPException(status.HTTP_409_CONFLICT, "SKU déjà utilisé / هاد الكود مستعمل")
    for key, value in data.items():
        setattr(product, key, value)
    db.flush()
    return product


def list_products(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    active: bool | None = None,
    public_only: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Product], int]:
    stmt = select(Product)
    count_stmt = select(func.count()).select_from(Product)
    conditions = []
    if q:
        like = f"%{q}%"
        norm = normalize(q)
        alias_subq = select(ProductAlias.product_id).where(ProductAlias.normalized.ilike(f"%{norm}%"))
        conditions.append(
            or_(
                Product.name.ilike(like),
                Product.sku.ilike(like),
                Product.name_ar.ilike(like),
                Product.name_fr.ilike(like),
                Product.id.in_(alias_subq),
            )
        )
    if category:
        conditions.append(Product.category == category)
    if active is not None:
        conditions.append(Product.is_active == active)
    if public_only:
        conditions.append(Product.show_in_public.is_(True))
        conditions.append(Product.is_active.is_(True))
    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    stmt = stmt.order_by(Product.name).offset(offset).limit(limit)
    items = list(db.scalars(stmt).unique())
    total = db.scalar(count_stmt) or 0
    return items, total


# --------------------------------------------------------------------------
# Customers
# --------------------------------------------------------------------------
def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    if db.scalar(select(Customer).where(Customer.code == payload.code)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Kode client déjà utilisé / هاد الكود مستعمل")
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.flush()
    return customer


def update_customer(db: Session, customer: Customer, payload: CustomerUpdate) -> Customer:
    data = payload.model_dump(exclude_unset=True)
    if "code" in data and data["code"] != customer.code:
        if db.scalar(select(Customer).where(Customer.code == data["code"])):
            raise HTTPException(status.HTTP_409_CONFLICT, "Kode client déjà utilisé / هاد الكود مستعمل")
    for key, value in data.items():
        setattr(customer, key, value)
    db.flush()
    return customer


def list_customers(
    db: Session,
    *,
    q: str | None = None,
    active: bool | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Customer], int]:
    stmt = select(Customer)
    count_stmt = select(func.count()).select_from(Customer)
    conditions = []
    if q:
        like = f"%{q}%"
        conditions.append(
            or_(
                Customer.name.ilike(like),
                Customer.code.ilike(like),
                Customer.phone.ilike(like),
            )
        )
    if active is not None:
        conditions.append(Customer.is_active == active)
    for cond in conditions:
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)
    stmt = stmt.order_by(Customer.name).offset(offset).limit(limit)
    items = list(db.scalars(stmt))
    total = db.scalar(count_stmt) or 0
    return items, total
