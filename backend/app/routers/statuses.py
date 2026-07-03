from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import AssetStatus, Asset
from app.schemas.status import StatusCreate, StatusRead, StatusUpdate
from app.services.audit import write_audit

router = APIRouter(prefix="/statuses", tags=["statuses"])


@router.get("", response_model=list[StatusRead])
async def list_statuses(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(AssetStatus).order_by(AssetStatus.sort_order, AssetStatus.name))
    return [StatusRead.model_validate(s, from_attributes=True) for s in result.scalars().all()]


@router.post("", response_model=StatusRead, status_code=201)
async def create_status(body: StatusCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    s = AssetStatus(**body.model_dump())
    session.add(s)
    await session.flush()
    await write_audit(session, actor=current_user, action="status.created", entity_type="status", entity_id=s.id, entity_label=s.name)
    await session.commit()
    await session.refresh(s)
    return StatusRead.model_validate(s, from_attributes=True)


@router.patch("/{status_id}", response_model=StatusRead)
async def update_status(status_id: int, body: StatusUpdate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(AssetStatus).where(AssetStatus.id == status_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Status not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    await write_audit(session, actor=current_user, action="status.updated", entity_type="status", entity_id=s.id, entity_label=s.name)
    await session.commit()
    await session.refresh(s)
    return StatusRead.model_validate(s, from_attributes=True)


@router.delete("/{status_id}", status_code=204)
async def delete_status(status_id: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(AssetStatus).where(AssetStatus.id == status_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Status not found")
    count_result = await session.execute(select(func.count()).where(Asset.status_id == status_id))
    count = count_result.scalar_one()
    if count > 0:
        raise HTTPException(status_code=409, detail=f"Cannot delete: {count} asset(s) use this status")
    await write_audit(session, actor=current_user, action="status.deleted", entity_type="status", entity_id=s.id, entity_label=s.name)
    await session.delete(s)
    await session.commit()
