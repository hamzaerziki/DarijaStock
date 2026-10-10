from decimal import Decimal

from sqlalchemy import select

from app.models import Product, Warehouse
from app.services import inventory


def _product(db, sku, price, show=True):
    p = Product(sku=sku, name=sku, price=Decimal(price), show_in_public=show)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def test_public_products_only_show_enabled(client, db):
    _product(db, "PUB1", "10.00")
    _product(db, "PUB2", "20.00", show=False)
    resp = client.get("/api/public/products")
    assert resp.status_code == 200
    skus = [p["sku"] for p in resp.json()]
    assert "PUB1" in skus
    assert "PUB2" not in skus


def test_public_order_creates_needs_review(client, db):
    wh = Warehouse(code="W1", name="Wh", is_default=True)
    db.add(wh)
    db.commit()
    p = _product(db, "PUB-O1", "15.00")
    resp = client.post(
        "/api/public/orders",
        json={"name": "Hassan", "phone": "0622334455", "city": "Marrakech",
              "items": [{"product_id": p.id, "quantity": "2"}]},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["status"] == "needs_review"


def test_public_order_rejects_invalid_product(client, db):
    wh = Warehouse(code="W1", name="Wh", is_default=True)
    db.add(wh)
    db.commit()
    resp = client.post(
        "/api/public/orders",
        json={"name": "X", "phone": "0622334455", "items": [{"product_id": 99999, "quantity": "1"}]},
    )
    assert resp.status_code == 400


def test_public_order_requires_items(client):
    resp = client.post("/api/public/orders", json={"name": "X", "phone": "0611111111", "items": []})
    assert resp.status_code == 422