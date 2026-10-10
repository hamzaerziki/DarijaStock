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
    ("DEMO-COLA", "Coca-Cola 1L", "كوكاكولا 1 لتر", "Coca-Cola 1 litre", "Boissons", "MAD", "12.00",
     ["coca", "cola", "كوكا", "كوكاكولا"],
     "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=480&auto=format&fit=crop"),
    ("DEMO-EAU", "Eau minérale 1.5L", "ماء معدني 1.5 لتر", "Eau minérale 1.5L", "Boissons", "MAD", "6.00",
     ["eau", "ماء", "ماء معدني"],
     "https://images.unsplash.com/photo-1526401485004-46910ecc8e51?q=80&w=480&auto=format&fit=crop"),
    ("DEMO-SUCRE", "Sucre 1kg", "سكر 1 كيلو", "Sucre en poudre 1kg", "Épicerie", "MAD", "11.00",
     ["sucre", "سكر", "سكر 1kg"],
     "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=480&auto=format&fit=crop"),
    ("DEMO-HUILE", "Huile 5L", "زيت 5 لترات", "Huile de table 5L", "Épicerie", "MAD", "75.00",
     ["huile", "زيت", "زيت 5 لتر"],
     "https://images.unsplash.com/photo-1509315703195-529879416a7d?q=80&w=480&auto=format&fit=crop"),
]


def main() -> int:
    with SessionLocal() as db:
        wh = db.scalar(select(Warehouse).where(Warehouse.is_default.is_(True)))
        if not wh:
            wh = Warehouse(code="MAIN", name="المخزن الرئيسي", is_default=True)
            db.add(wh)
            db.flush()
            print("Created default warehouse MAIN")

        for sku, name, name_ar, name_fr, category, cur, price, aliases, *img in DEMO_PRODUCTS:
            if db.scalar(select(Product).where(Product.sku == sku)):
                continue
            product = Product(
                sku=sku, name=name, name_ar=name_ar, name_fr=name_fr, category=category,
                base_unit="piece", price=Decimal(price), tax_rate=Decimal("0.00"),
                reorder_threshold=Decimal("10"),
            )
            if img:
                product.image_url = str(img[0])
            for a in aliases:
                product.aliases.append(ProductAlias(alias=a, normalized=normalize(a)))
            db.add(product)
            print(f"Created demo product {sku}")
        db.commit()
    print("Seed complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())