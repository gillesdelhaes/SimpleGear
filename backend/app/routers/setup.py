from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database import get_session
from app.models import AppSetting, SystemUser, AssetStatus, AssetCategory
from app.services.passwords import hash_password

router = APIRouter(prefix="/setup", tags=["setup"])

DEFAULT_STATUSES = [
    {"name": "Ready", "color": "#22C55E", "is_deployable": True, "sort_order": 0},
    {"name": "Assigned", "color": "#3B82F6", "is_deployable": True, "sort_order": 1},
    {"name": "Broken", "color": "#EF4444", "is_deployable": False, "sort_order": 2},
    {"name": "In Repair", "color": "#F59E0B", "is_deployable": False, "sort_order": 3},
    {"name": "EOL", "color": "#6B7280", "is_deployable": False, "sort_order": 4},
    {"name": "Archived", "color": "#374151", "is_deployable": False, "sort_order": 5},
]

DEFAULT_CATEGORIES = [
    {"name": "Laptop", "type": "Hardware", "eol_years": 5},
    {"name": "Desktop", "type": "Hardware", "eol_years": 7},
    {"name": "Monitor", "type": "Hardware", "eol_years": 10},
    {"name": "Phone", "type": "Hardware", "eol_years": 3},
    {"name": "Tablet", "type": "Hardware", "eol_years": 4},
    {"name": "Server", "type": "Hardware", "eol_years": 7},
    {"name": "Network Equipment", "type": "Hardware", "eol_years": 7},
    {"name": "Peripheral", "type": "Hardware", "eol_years": 5},
]


@router.get("/status")
async def setup_status(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == "setup_complete")
    )
    setting = result.scalar_one_or_none()
    return {"complete": setting is not None and setting.value == "true"}


class SetupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


@router.post("", status_code=status.HTTP_201_CREATED)
async def run_setup(body: SetupRequest, session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(AppSetting).where(AppSetting.key == "setup_complete")
    )
    existing = result.scalar_one_or_none()
    if existing and existing.value == "true":
        raise HTTPException(status_code=409, detail="Setup already complete")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    user = SystemUser(
        email=body.email.lower(),
        name=body.name,
        password_hash=hash_password(body.password),
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
    )
    session.add(user)

    for s in DEFAULT_STATUSES:
        session.add(AssetStatus(**s))

    for c in DEFAULT_CATEGORIES:
        session.add(AssetCategory(**c))

    setting = AppSetting(key="setup_complete", value="true")
    session.add(setting)

    await session.commit()
    return {"message": "Setup complete"}
