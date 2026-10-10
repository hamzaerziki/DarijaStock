def _product_payload(sku="P1", name="Coca 1L"):
    return {
        "sku": sku,
        "name": name,
        "name_ar": "كوكا",
        "name_fr": "Coca-Cola",
        "price": "12.00",
        "base_unit": "piece",
        "aliases": [{"alias": "كوكا كولا", "language": "ar"}, {"alias": "coca", "language": "latin"}],
        "units": [
            {"code": "piece", "name": "pièce", "factor_to_base": "1", "is_base": True},
            {"code": "carton", "name": "carton", "factor_to_base": "12"},
        ],
    }


def test_create_and_get_product(admin_client):
    resp = admin_client.post("/api/products", json=_product_payload())
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["sku"] == "P1"
    assert len(body["aliases"]) == 2
    assert len(body["units"]) == 2

    got = admin_client.get(f"/api/products/{body['id']}")
    assert got.status_code == 200
    assert got.json()["name_ar"] == "كوكا"


def test_duplicate_sku_rejected(admin_client):
    admin_client.post("/api/products", json=_product_payload())
    resp = admin_client.post("/api/products", json=_product_payload(name="Other"))
    assert resp.status_code == 409


def test_search_by_alias(admin_client):
    admin_client.post("/api/products", json=_product_payload())
    resp = admin_client.get("/api/products", params={"q": "coca"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_search_by_arabic(admin_client):
    admin_client.post("/api/products", json=_product_payload())
    resp = admin_client.get("/api/products", params={"q": "كوكا"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


def test_pagination(admin_client):
    for i in range(5):
        admin_client.post("/api/products", json=_product_payload(sku=f"PAG{i}", name=f"Prod {i}"))
    resp = admin_client.get("/api/products", params={"page": 1, "page_size": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["total"] == 5


def test_customer_crud(admin_client):
    payload = {"code": "C001", "name": "Boulangerie Amine", "phone": "0612345678", "city": "Casablanca"}
    resp = admin_client.post("/api/customers", json=payload)
    assert resp.status_code == 200
    cid = resp.json()["id"]

    upd = admin_client.patch(f"/api/customers/{cid}", json={"city": "Rabat"})
    assert upd.status_code == 200
    assert upd.json()["city"] == "Rabat"

    lst = admin_client.get("/api/customers", params={"q": "Amine"})
    assert lst.json()["total"] == 1


def test_duplicate_customer_code(admin_client):
    payload = {"code": "C1", "name": "A"}
    admin_client.post("/api/customers", json=payload)
    assert admin_client.post("/api/customers", json=payload).status_code == 409