from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.services.audit import write_audit
from app.services.settings_service import (
    DEFAULT_ASSET_TAG_PREFIX,
    get_audit_interval_months,
    get_setting,
    set_setting,
)

router = APIRouter(prefix="/settings", tags=["settings"])


class AppSettingsRead(BaseModel):
    audit_interval_months: int
    asset_tag_prefix: str


class AppSettingsUpdate(BaseModel):
    audit_interval_months: Optional[int] = Field(default=None, ge=1, le=120)
    asset_tag_prefix: Optional[str] = Field(default=None, min_length=1, max_length=10)


async def _read(session: AsyncSession) -> AppSettingsRead:
    prefix = await get_setting(session, "asset_tag_prefix") or DEFAULT_ASSET_TAG_PREFIX
    return AppSettingsRead(
        audit_interval_months=await get_audit_interval_months(session),
        asset_tag_prefix=prefix,
    )


@router.get("", response_model=AppSettingsRead)
async def read_settings(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    return await _read(session)


@router.patch("", response_model=AppSettingsRead)
async def update_settings(
    body: AppSettingsUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    changes = {}
    if body.audit_interval_months is not None:
        old = await get_audit_interval_months(session)
        if old != body.audit_interval_months:
            await set_setting(session, "audit_interval_months", str(body.audit_interval_months))
            changes["audit_interval_months"] = {"from": old, "to": body.audit_interval_months}
    if body.asset_tag_prefix is not None:
        old_prefix = await get_setting(session, "asset_tag_prefix") or DEFAULT_ASSET_TAG_PREFIX
        if old_prefix != body.asset_tag_prefix:
            await set_setting(session, "asset_tag_prefix", body.asset_tag_prefix)
            changes["asset_tag_prefix"] = {"from": old_prefix, "to": body.asset_tag_prefix}
    if changes:
        await write_audit(
            session,
            actor=current_user,
            action="settings.updated",
            entity_type="settings",
            entity_label="App settings",
            payload=changes,
        )
    await session.commit()
    return await _read(session)
