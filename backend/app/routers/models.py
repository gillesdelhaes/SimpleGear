from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models.asset_model import AssetModel
from app.schemas.asset_model import AssetModelCreate, AssetModelRead, AssetModelUpdate

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
    return result.scalars().all()


@router.post("", response_model=AssetModelRead, status_code=201)
async def create_model(
    body: AssetModelCreate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    m = AssetModel(**body.model_dump())
    session.add(m)
    await session.commit()
    await session.refresh(m)
    return m


@router.patch("/{model_id}", response_model=AssetModelRead)
async def update_model(
    model_id: int,
    body: AssetModelUpdate,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    result = await session.execute(select(AssetModel).where(AssetModel.id == model_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    await session.commit()
    await session.refresh(m)
    return m


@router.delete("/{model_id}", status_code=204)
async def delete_model(
    model_id: int,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    result = await session.execute(select(AssetModel).where(AssetModel.id == model_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    await session.delete(m)
    await session.commit()
