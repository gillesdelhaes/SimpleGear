from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user
from app.database import get_session
from app.models import Asset, AssetMaintenance, SystemUser
from app.schemas.maintenance import MaintenanceCreate, MaintenanceRead, MaintenanceUpdate
from app.services.audit import write_audit

router = APIRouter(tags=["maintenance"])


async def _to_read(m: AssetMaintenance, session: AsyncSession) -> MaintenanceRead:
    created_by_name = None
    if m.created_by_id:
        user_result = await session.execute(select(SystemUser).where(SystemUser.id == m.created_by_id))
        user = user_result.scalar_one_or_none()
        created_by_name = user.name if user else None
    return MaintenanceRead(
        id=m.id,
        asset_id=m.asset_id,
        maintenance_type=m.maintenance_type,
        title=m.title,
        notes=m.notes,
        start_date=m.start_date,
        completed_date=m.completed_date,
        cost=float(m.cost) if m.cost is not None else None,
        provider=m.provider,
        created_by_id=m.created_by_id,
        created_by_name=created_by_name,
        created_at=m.created_at,
    )


async def _get_asset(asset_id: int, session: AsyncSession) -> Asset:
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/assets/{asset_id}/maintenance", response_model=list[MaintenanceRead])
async def list_maintenance(asset_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    await _get_asset(asset_id, session)
    result = await session.execute(
        select(AssetMaintenance)
        .where(AssetMaintenance.asset_id == asset_id)
        .order_by(AssetMaintenance.created_at.desc())
    )
    return [await _to_read(m, session) for m in result.scalars().all()]


@router.post("/assets/{asset_id}/maintenance", response_model=MaintenanceRead, status_code=201)
async def create_maintenance(
    asset_id: int,
    body: MaintenanceCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    asset = await _get_asset(asset_id, session)
    m = AssetMaintenance(asset_id=asset_id, created_by_id=current_user["id"], **body.model_dump())
    session.add(m)
    await write_audit(
        session,
        actor=current_user,
        action="asset.maintenance_added",
        entity_type="asset",
        entity_id=asset_id,
        entity_label=f"{asset.asset_tag} — {asset.name}",
        payload={"type": body.maintenance_type, "title": body.title, "cost": body.cost},
    )
    await session.commit()
    await session.refresh(m)
    return await _to_read(m, session)


@router.patch("/assets/{asset_id}/maintenance/{maintenance_id}", response_model=MaintenanceRead)
async def update_maintenance(
    asset_id: int,
    maintenance_id: int,
    body: MaintenanceUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    asset = await _get_asset(asset_id, session)
    result = await session.execute(
        select(AssetMaintenance).where(
            AssetMaintenance.id == maintenance_id, AssetMaintenance.asset_id == asset_id
        )
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await write_audit(
        session,
        actor=current_user,
        action="asset.maintenance_updated",
        entity_type="asset",
        entity_id=asset_id,
        entity_label=f"{asset.asset_tag} — {asset.name}",
        payload={"title": m.title, "completed": m.completed_date is not None},
    )
    await session.commit()
    await session.refresh(m)
    return await _to_read(m, session)


@router.delete("/assets/{asset_id}/maintenance/{maintenance_id}", status_code=204)
async def delete_maintenance(
    asset_id: int,
    maintenance_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    asset = await _get_asset(asset_id, session)
    result = await session.execute(
        select(AssetMaintenance).where(
            AssetMaintenance.id == maintenance_id, AssetMaintenance.asset_id == asset_id
        )
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    await session.delete(m)
    await write_audit(
        session,
        actor=current_user,
        action="asset.maintenance_deleted",
        entity_type="asset",
        entity_id=asset_id,
        entity_label=f"{asset.asset_tag} — {asset.name}",
        payload={"title": m.title},
    )
    await session.commit()
