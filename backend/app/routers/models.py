from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import Asset
from app.models.asset_model import AssetModel
from app.schemas.asset_model import AssetModelCreate, AssetModelRead, AssetModelUpdate
from app.services.audit import write_audit

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[AssetModelRead])
async def list_models(
    category_id: Optional[int] = None,
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_user),
):
    q = select(AssetModel).order_by(AssetModel.manufacturer, AssetModel.name)
    if category_id is not None:
        q = q.where(AssetModel.category_id == category_id)
    result = await session.execute(q)
    models = result.scalars().all()

    counts_r = await session.execute(
        select(
            Asset.asset_model_id,
            func.count(),
            func.count(Asset.assigned_to_id),
        ).where(Asset.asset_model_id.isnot(None)).group_by(Asset.asset_model_id)
    )
    counts = {model_id: (total, assigned) for model_id, total, assigned in counts_r.all()}

    out = []
    for m in models:
        total, assigned = counts.get(m.id, (0, 0))
        read = AssetModelRead.model_validate(m, from_attributes=True)
        read.asset_count = total
        read.assigned_count = assigned
        out.append(read)
    return out


@router.post("", response_model=AssetModelRead, status_code=201)
async def create_model(
    body: AssetModelCreate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    m = AssetModel(**body.model_dump())
    session.add(m)
    await session.flush()
    await write_audit(session, actor=current_user, action="model.created", entity_type="model", entity_id=m.id, entity_label=m.name)
    await session.commit()
    await session.refresh(m)
    return m


@router.patch("/{model_id}", response_model=AssetModelRead)
async def update_model(
    model_id: int,
    body: AssetModelUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    result = await session.execute(select(AssetModel).where(AssetModel.id == model_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await write_audit(session, actor=current_user, action="model.updated", entity_type="model", entity_id=m.id, entity_label=m.name)
    await session.commit()
    await session.refresh(m)
    return m


@router.delete("/{model_id}", status_code=204)
async def delete_model(
    model_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(require_admin),
):
    result = await session.execute(select(AssetModel).where(AssetModel.id == model_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    await write_audit(session, actor=current_user, action="model.deleted", entity_type="model", entity_id=m.id, entity_label=m.name)
    await session.delete(m)
    await session.commit()
