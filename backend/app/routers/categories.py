from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import AssetCategory
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.audit import write_audit

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
async def list_categories(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(AssetCategory).order_by(AssetCategory.name))
    return [CategoryRead.model_validate(c, from_attributes=True) for c in result.scalars().all()]


@router.post("", response_model=CategoryRead, status_code=201)
async def create_category(body: CategoryCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    c = AssetCategory(**body.model_dump())
    session.add(c)
    await session.flush()
    await write_audit(session, actor=current_user, action="category.created", entity_type="category", entity_id=c.id, entity_label=c.name)
    await session.commit()
    await session.refresh(c)
    return CategoryRead.model_validate(c, from_attributes=True)


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(category_id: int, body: CategoryUpdate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(AssetCategory).where(AssetCategory.id == category_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    await write_audit(session, actor=current_user, action="category.updated", entity_type="category", entity_id=c.id, entity_label=c.name)
    await session.commit()
    await session.refresh(c)
    return CategoryRead.model_validate(c, from_attributes=True)


@router.delete("/{category_id}", status_code=204)
async def delete_category(category_id: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(AssetCategory).where(AssetCategory.id == category_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Category not found")
    await write_audit(session, actor=current_user, action="category.deleted", entity_type="category", entity_id=c.id, entity_label=c.name)
    await session.delete(c)
    await session.commit()
