from decimal import Decimal


def test_full_workflow_http(admin_client):
    # 1. Create product + customer over the API
    prod = admin_client.post(
        "/api/products",
        json={
            "sku": "W0", "name": "Lait 1L", "name_ar": "حليب", "price": "8.00",
            "tax_rate": "0", "aliases": [{"alias": "حليب", "language": "ar"}, {"alias": "lait", "language": "fr"}],
            "units": [{"code": "piece", "name": "pièce", "factor_to_base": "1", "is_base": True}],
        },
    )
    assert prod.status_code == 200, prod.text
    pid = prod.json()["id"]

    cust = admin_client.post(
        "/api/customers",
        json={"code": "CC1", "name": "Hamid", "phone": "0661122334"},
    )
    cid = cust.json()["id"]

    # 2. Receive stock
    recv = admin_client.post(f"/api/inventory/receipts?product_id={pid}", json={"amount": "50"})
    assert recv.status_code == 200, recv.text

    # 3. Import a WhatsApp-like message
    imp = admin_client.post(
        "/api/import/messages",
        json={"messages": [{"raw_text": "Salam, ghadi n3awd:\n5 حليب\nmerci"}]},
    )
    assert imp.status_code == 200, imp.text
    body = imp.json()
    assert body["orders_created"] == 1
    order_id = body["messages"][0]["order_id"]
    order_number = body["messages"][0]["order_number"]

    # 4. Confirm order (admin has approve rights) -> reservation
    conf = admin_client.post(f"/api/orders/{order_id}/confirm")
    assert conf.status_code == 200, conf.text
    assert conf.json()["status"] == "reserved"

    # 5. Fulfill -> dispatch stock
    full = admin_client.post(f"/api/orders/{order_id}/fulfill")
    assert full.status_code == 200, full.text
    assert full.json()["status"] == "fulfilled"

    # 6. Stock should be 45
    stock = admin_client.get("/api/inventory/stock")
    row = next(r for r in stock.json()["items"] if r["sku"] == "W0")
    assert Decimal(row["physical"]) == Decimal("45")
    assert Decimal(row["reserved"]) == Decimal("0")

    # 7. Invoice from order + issue
    inv = admin_client.post(f"/api/invoices/from-order/{order_id}")
    assert inv.status_code == 200, inv.text
    inv_id = inv.json()["id"]
    issued = admin_client.post(f"/api/invoices/{inv_id}/issue")
    assert issued.status_code == 200, issued.text
    assert issued.json()["status"] == "issued"
    assert issued.json()["number"].startswith("FA-")

    # 8. Dashboard reflects counts
    dash = admin_client.get("/api/dashboard")
    assert dash.status_code == 200
    assert dash.json()["invoices_by_status"].get("issued") == 1


def test_import_missing_product_flags_review(admin_client):
    imp = admin_client.post(
        "/api/import/messages",
        json={"messages": [{"raw_text": "10 كيندر بوينو"}]},
    )
    assert imp.status_code == 200
    order_id = imp.json()["messages"][0]["order_id"]
    order = admin_client.get(f"/api/orders/{order_id}")
    assert order.json()["status"] == "needs_review"
    assert all(i["match_status"] == "unmatched" for i in order.json()["items"])


def test_duplicate_import_safe_retry(admin_client):
    payload = {"messages": [{"raw_text": "3 حليب"}], "idempotency_key": "retry-test"}
    r1 = admin_client.post("/api/import/messages", json=payload)
    r2 = admin_client.post("/api/import/messages", json=payload)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["batch_id"] == r2.json()["batch_id"]