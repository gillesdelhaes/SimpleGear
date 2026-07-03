from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import AppSetting

DEFAULT_AUDIT_INTERVAL_MONTHS = 12
DEFAULT_ASSET_TAG_PREFIX = "SG-"


async def get_setting(session: AsyncSession, key: str) -> Optional[str]:
    result = await session.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()
    return setting.value if setting else None


async def set_setting(session: AsyncSession, key: str, value: str) -> None:
    result = await session.execute(select(AppSetting).where(AppSetting.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = value
    else:
        session.add(AppSetting(key=key, value=value))


async def get_audit_interval_months(session: AsyncSession) -> int:
    value = await get_setting(session, "audit_interval_months")
    try:
        return max(1, int(value)) if value else DEFAULT_AUDIT_INTERVAL_MONTHS
    except ValueError:
        return DEFAULT_AUDIT_INTERVAL_MONTHS
