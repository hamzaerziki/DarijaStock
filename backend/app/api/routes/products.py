from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.permissions import Permission
from app.models import Product, User
from app.schemas.catalog import ProductCreate, ProductOut, ProductUpdate
from app.schemas.common import Message, Page
from app.services import audit, catalog

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=Page[ProductOut])
def list_products(
    q: str | None = None,
    category: str | None = None,
    active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_permitted_products)),
):
    items, total = catalog.list_products(
        db, q=q, category=category, active=active, offset=(page - 1) * page_size, limit=page_size
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.view_permitted_products)),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    return product


@router.post("", response_model=ProductOut)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_products)),
):
    product = catalog.create_product(db, payload)
    audit.record(db, action="product.created", actor=actor, entity_type="product", entity_id=product.id,
                 details={"sku": product.sku})
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_products)),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    catalog.update_product(db, product, payload)
    audit.record(db, action="product.updated", actor=actor, entity_type="product", entity_id=product.id)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}/aliases", response_model=list[dict])
def get_aliases(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.manage_products)),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    return [{"id": a.id, "alias": a.alias, "normalized": a.normalized, "language": a.language} for a in product.aliases]


@router.put("/{product_id}/aliases", response_model=list[dict])
def replace_aliases(
    product_id: int,
    payload: list[dict],
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_products)),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Produit introuvable")
    product.aliases.clear()
    from app.models import ProductAlias
    from app.services.text import normalize

    seen = set()
    for a in payload:
        if not a.get("alias"):
            continue
        norm = normalize(str(a["alias"]))
        if not norm or norm in seen:
            continue
        seen.add(norm)
        product.aliases.append(ProductAlias(alias=str(a["alias"]).strip(), normalized=norm, language=a.get("language")))
    audit.record(db, action="product.aliases_updated", actor=actor, entity_type="product", entity_id=product.id)
    db.commit()
    return [{"id": a.id, "alias": a.alias, "normalized": a.normalized, "language": a.language} for a in product.aliases]