from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import SystemUser
from app.schemas.auth import UserRead
from app.services.audit import write_audit
from app.services.passwords import hash_password

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "viewer"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


@router.get("", response_model=list[UserRead])
async def list_users(session: AsyncSession = Depends(get_session), _=Depends(require_admin)):
    result = await session.execute(select(SystemUser).order_by(SystemUser.name))
    return [UserRead(id=u.id, email=u.email, name=u.name, role=u.role, is_active=u.is_active) for u in result.scalars().all()]


@router.post("", response_model=UserRead, status_code=201)
async def create_user(body: UserCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    existing = await session.execute(select(SystemUser).where(SystemUser.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    u = SystemUser(
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
        created_at=datetime.utcnow(),
    )
    session.add(u)
    await session.flush()
    await write_audit(
        session, actor=current_user, action="user.created",
        entity_type="user", entity_id=u.id, entity_label=u.email,
        payload={"role": u.role},
    )
    await session.commit()
    await session.refresh(u)
    return UserRead(id=u.id, email=u.email, name=u.name, role=u.role, is_active=u.is_active)


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    body: UserUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    result = await session.execute(select(SystemUser).where(SystemUser.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if body.is_active is False and user_id == current_user["id"]:
        raise HTTPException(status_code=409, detail="Cannot deactivate yourself")
    if body.name:
        u.name = body.name
    if body.role:
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    if body.password:
        if len(body.password) < 8:
            raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
        u.password_hash = hash_password(body.password)
    await write_audit(
        session, actor=current_user, action="user.updated",
        entity_type="user", entity_id=u.id, entity_label=u.email,
        payload={
            "role": u.role,
            "is_active": u.is_active,
            "password_changed": bool(body.password),
        },
    )
    await session.commit()
    await session.refresh(u)
    return UserRead(id=u.id, email=u.email, name=u.name, role=u.role, is_active=u.is_active)


@router.delete("/{user_id}", status_code=204)
async def delete_user(user_id: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=409, detail="Cannot delete yourself")
    result = await session.execute(select(SystemUser).where(SystemUser.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    await write_audit(
        session, actor=current_user, action="user.deleted",
        entity_type="user", entity_id=u.id, entity_label=u.email,
    )
    await session.delete(u)
    await session.commit()
