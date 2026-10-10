from sqlalchemy import select

from app.models import Product, ProductAlias
from app.services.matching import match_text, build_index
from app.services.text import normalize


def _make_product(db, sku, name, aliases):
    product = Product(sku=sku, name=name, price=10)
    db.add(product)
    db.flush()
    for a in aliases:
        db.add(ProductAlias(product_id=product.id, alias=a, normalized=normalize(a)))
    db.commit()
    return product


def test_exact_alias_match(db):
    _make_product(db, "C1", "Coca-Cola 1L", ["كوكا", "coca cola"])
    index = build_index(db)
    result = match_text("كوكا", index)
    assert result.status == "matched"
    assert result.confidence == 1.0


def test_fuzzy_match(db):
    _make_product(db, "C2", "Eau minérale 1.5L", [])
    index = build_index(db)
    result = match_text("eau mineral", index)
    assert result.status == "matched"
    assert result.product_id is not None


def test_unmatched(db):
    _make_product(db, "C3", "Chocolat", [])
    index = build_index(db)
    result = match_text("qsdqsdfsqdfg no such product", index)
    assert result.status == "unmatched"
    assert result.product_id is None


def test_ambiguous_returns_candidates(db):
    _make_product(db, "A1", "Sucre 1kg", [])
    _make_product(db, "A2", "Sucre morceaux 1kg", [])
    index = build_index(db)
    result = match_text("Sucre", index)
    assert result.status == "ambiguous"
    assert len(result.candidates) >= 2


def test_normalize_arabic_variants():
    assert normalize("كوكا") == normalize("كوكا كولا").split(" ")[0]
    assert "ا" == normalize("أ") == normalize("آ")