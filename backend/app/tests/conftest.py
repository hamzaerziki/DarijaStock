from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

os.environ.setdefault(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://darjastock:darjastock@localhost:5433/darjastock_test",
)

if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

import psycopg  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.api.deps import get_current_user  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402

TEST_DATABASE_URL = os.environ["TEST_DATABASE_URL"]
# Parse out the maintenance connection info.
_parts = TEST_DATABASE_URL.split("@")[1]
_hostport, _dbname = _parts.split("/")
_host, _port = _hostport.split(":")


def _ensure_database() -> None:
    conn = psycopg.connect(
        host=_host, port=_port, dbname="postgres", user=os.environ.get("TEST_DB_USER", "darjastock"),
        password=os.environ.get("TEST_DB_PASSWORD", "darjastock"), autocommit=True,
    )
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (_dbname,))
    if cur.fetchone() is None:
        cur.execute(f'CREATE DATABASE "{_dbname}"')
    conn.close()


_ensure_database()

engine = create_engine(TEST_DATABASE_URL, future=True)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture(autouse=True)
def _clean_tables(_schema):
    from sqlalchemy import text

    with engine.begin() as conn:
        tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


def _make_user(db, email: str, role: str, password: str = "Password123!") -> User:
    user = User(
        email=email, full_name=email.split("@")[0], role=role, is_active=True,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_user(db):
    return _make_user(db, "admin@example.com", "admin")


@pytest.fixture()
def operator_user(db):
    return _make_user(db, "operator@example.com", "order_operator")


@pytest.fixture()
def approver_user(db):
    return _make_user(db, "approver@example.com", "order_approver")


@pytest.fixture()
def stock_user(db):
    return _make_user(db, "stock@example.com", "stock_manager")


@pytest.fixture()
def client():
    def _override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _auth_headers(client: TestClient, email: str, password: str = "Password123!") -> dict:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def admin_client(client, admin_user):
    client.headers.update(_auth_headers(client, admin_user.email))
    return client


@pytest.fixture()
def operator_client(client, operator_user):
    client.headers.update(_auth_headers(client, operator_user.email))
    return client


@pytest.fixture()
def approver_client(client, approver_user):
    client.headers.update(_auth_headers(client, approver_user.email))
    return client


@pytest.fixture()
def stock_client(client, stock_user):
    client.headers.update(_auth_headers(client, stock_user.email))
    return client


@pytest.fixture()
def auth_headers():
    return _auth_headers