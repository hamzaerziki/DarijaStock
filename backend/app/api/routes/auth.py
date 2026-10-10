from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, get_db, get_current_user, require_permissions
from app.core.permissions import Permission, Role, permissions_for_role
from app.models import User
from app.schemas.auth import LoginRequest, Me, Token, UserOut
from app.services import audit
from app.services.auth import authenticate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email wla passe kayn ghalat / البريد أو كلمة السر خاطئة")
    from app.core.security import create_access_token

    audit.record(
        db,
        action="auth.login",
        actor=user,
        ip_address=client_ip(request),
    )
    db.commit()
    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.get("/me", response_model=Me)
def me(user: User = Depends(get_current_user)):
    perms = sorted(p.value for p in permissions_for_role(Role(user.role)))
    return Me(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=Role(user.role),
        is_active=user.is_active,
        permissions=perms,
    )