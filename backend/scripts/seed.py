"""Seed a default warehouse and a few clearly-labelled demo catalog entries.

Optional. Real deployments should create their own catalog through the UI.

Usage:
    python -m scripts.seed
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from decimal import Decimal  # noqa: E402

from sqlalchemy import select  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.models import Product, ProductAlias, ProductUnit, Warehouse  # noqa: E402
from app.services.text import normalize  # noqa: E402

DEMO_PRODUCTS = [
    ("DEMO-COLA", "Coca-Cola 1L", "كوكا 1 لتر", "Coca-Cola 1 litre", "Boissons", "MAD", "12.00",
     ["كوكا", "coca", "cola", "كوكا كولا"]),
    ("DEMO-EAU", "Eau minérale 1.5L", "ما معدني 1.5 لتر", "Eau minérale 1.5L", "Boissons", "MAD", "6.00",
     ["ما", "eau", "ماء", "لتر"]),
    ("DEMO-SUCRE", "Sucre 1kg", "سكر 1 كيلو", "Sucre en poudre 1kg", "Épicerie", "MAD", "11.00",
     ["سكر", "sucre", "sucre 1kg"]),
    ("DEMO-HUILE", "Huile 5L", "زيت 5 لتر", "Huile de table 5L", "Épicerie", "MAD", "75.00",
     ["زيت", "huile", "زيت 5 لتر"]),
]


def main() -> int:
    with SessionLocal() as db:
        wh = db.scalar(select(Warehouse).where(Warehouse.is_default.is_(True)))
        if not wh:
            wh = Warehouse(code="MAIN", name="المخزن الرئيسي", is_default=True)
            db.add(wh)
            db.flush()
            print("Created default warehouse MAIN")

        for sku, name, name_ar, name_fr, category, cur, price, aliases in DEMO_PRODUCTS:
            if db.scalar(select(Product).where(Product.sku == sku)):
                continue
            product = Product(
                sku=sku, name=name, name_ar=name_ar, name_fr=name_fr, category=category,
                base_unit="piece", price=Decimal(price), tax_rate=Decimal("0.00"),
                reorder_threshold=Decimal("10"),
            )
            product.units.append(ProductUnit(code="piece", name="pièce", factor_to_base=Decimal("1"), is_base=True))
            product.units.append(ProductUnit(code="carton", name="carton", factor_to_base=Decimal("12")))
            for a in aliases:
                product.aliases.append(ProductAlias(alias=a, normalized=normalize(a)))
            db.add(product)
            print(f"Created demo product {sku}")
        db.commit()
    print("Seed complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())