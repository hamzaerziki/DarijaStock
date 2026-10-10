from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.permissions import Permission, Role, role_has_permission
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Makhassk tkon mconnecté / تسجيل الدخول مطلوب",
        )
    try:
        payload = decode_access_token(credentials.credentials)
        subject = payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session makhda / جلسة غير صالحة",
        )
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, int(subject))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
    return user


def require_permissions(*permissions: Permission) -> Callable[..., User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        role = Role(user.role)
        missing = [p.value for p in permissions if not role_has_permission(role, p)]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Ma3andekch permission: {', '.join(missing)}",
            )
        return user

    return dependency


def require_any_permissions(*permissions: Permission) -> Callable[..., User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        role = Role(user.role)
        if not any(role_has_permission(role, p) for p in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ma3andekch permission / ما عندكش الصلاحية",
            )
        return user

    return dependency


def client_ip(request: Request) -> str | None:
    if request.client:
        return request.client.host
    return None
