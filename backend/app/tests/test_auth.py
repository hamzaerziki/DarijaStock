def test_login_success(client, admin_user):
    resp = client.post("/api/auth/login", json={"email": admin_user.email, "password": "Password123!"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client, admin_user):
    resp = client.post("/api/auth/login", json={"email": admin_user.email, "password": "wrong"})
    assert resp.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_permissions(admin_client):
    resp = admin_client.get("/api/auth/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "admin"
    assert "manage_users" in body["permissions"]


def test_operator_cannot_manage_products(operator_client):
    resp = operator_client.post("/api/products", json={"sku": "X1", "name": "Test", "price": "5.00"})
    assert resp.status_code == 403


def test_operator_cannot_manage_users(operator_client):
    assert operator_client.get("/api/users").status_code == 403


def test_admin_can_list_users(admin_client, admin_user):
    resp = admin_client.get("/api/users")
    assert resp.status_code == 200
    assert any(u["email"] == admin_user.email for u in resp.json())


def test_read_only_role_permissions(admin_client):
    # create a read-only user then verify restricted actions
    created = admin_client.post(
        "/api/users",
        json={"email": "ro@example.com", "full_name": "RO", "role": "read_only", "password": "Password123!"},
    )
    assert created.status_code == 200
    token = admin_client.post("/api/auth/login", json={"email": "ro@example.com", "password": "Password123!"}).json()
    headers = {"Authorization": f"Bearer {token['access_token']}"}
    # read_only cannot create orders
    assert admin_client.post("/api/orders", json={"items": []}, headers=headers).status_code == 403
    # but can read dashboard
    assert admin_client.get("/api/dashboard", headers=headers).status_code == 200