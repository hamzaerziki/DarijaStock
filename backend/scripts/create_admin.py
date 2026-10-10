"""Create the initial administrator account.

Usage:
    python -m scripts.create_admin
    # or set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in the environment.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import User  # noqa: E402


def main() -> int:
    email = os.getenv("ADMIN_EMAIL", "admin@darjastock.local").lower()
    password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")
    name = os.getenv("ADMIN_NAME", "Administrateur")

    if len(password) < 8:
        print("ADMIN_PASSWORD must be at least 8 characters.", file=sys.stderr)
        return 2

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            existing.hashed_password = hash_password(password)
            existing.role = "admin"
            existing.is_active = True
            db.commit()
            print(f"Admin '{email}' already existed; password/role updated.")
            return 0
        user = User(
            email=email,
            full_name=name,
            role="admin",
            is_active=True,
            hashed_password=hash_password(password),
        )
        db.add(user)
        db.commit()
        print(f"Admin account created: {email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())