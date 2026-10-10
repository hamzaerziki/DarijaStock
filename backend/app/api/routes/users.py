from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permissions
from app.core.permissions import Permission
from app.core.security import hash_password
from app.models import User
from app.schemas.auth import UserCreate, UserOut, UserUpdate
from app.services import audit

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_permissions(Permission.manage_users)),
):
    return list(db.scalars(select(User).order_by(User.email)))


@router.post("", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_users)),
):
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email déjà utilisé / هاد الإيميل مستعمل")
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        role=payload.role.value,
        is_active=payload.is_active,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()
    audit.record(db, action="user.created", actor=actor, entity_type="user", entity_id=user.id,
                 details={"email": user.email, "role": user.role})
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permissions(Permission.manage_users)),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User introuvable")
    data = payload.model_dump(exclude_unset=True)
    if data.get("email"):
        email = data["email"].lower()
        existing = db.scalar(select(User).where(User.email == email, User.id != user_id))
        if existing:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email déjà utilisé")
        user.email = email
    if data.get("full_name"):
        user.full_name = data["full_name"]
    if data.get("role"):
        user.role = data["role"].value
    if data.get("is_active") is not None:
        user.is_active = data["is_active"]
    if data.get("password"):
        user.hashed_password = hash_password(data["password"])
    db.flush()
    audit.record(db, action="user.updated", actor=actor, entity_type="user", entity_id=user.id,
                 details={"fields": [k for k in data.keys()]})
    db.commit()
    db.refresh(user)
    return user