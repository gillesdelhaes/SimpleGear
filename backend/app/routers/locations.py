from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import Location
from app.schemas.location import LocationCreate, LocationRead, LocationTree, LocationUpdate
from app.services.audit import write_audit

router = APIRouter(prefix="/locations", tags=["locations"])


def _build_tree(locations: list[Location], parent_id: int | None = None) -> list[LocationTree]:
    return [
        LocationTree(
            id=loc.id,
            name=loc.name,
            address=loc.address,
            parent_id=loc.parent_id,
            children=_build_tree(locations, loc.id),
        )
        for loc in locations
        if loc.parent_id == parent_id
    ]


@router.get("", response_model=list[LocationRead])
async def list_locations(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Location).order_by(Location.name))
    return [LocationRead.model_validate(loc, from_attributes=True) for loc in result.scalars().all()]


@router.get("/tree", response_model=list[LocationTree])
async def location_tree(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Location).order_by(Location.name))
    locs = result.scalars().all()
    return _build_tree(locs)


@router.post("", response_model=LocationRead, status_code=201)
async def create_location(body: LocationCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    loc = Location(**body.model_dump())
    session.add(loc)
    await session.flush()
    await write_audit(session, actor=current_user, action="location.created", entity_type="location", entity_id=loc.id, entity_label=loc.name)
    await session.commit()
    await session.refresh(loc)
    return LocationRead.model_validate(loc, from_attributes=True)


@router.patch("/{location_id}", response_model=LocationRead)
async def update_location(location_id: int, body: LocationUpdate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(loc, k, v)
    await write_audit(session, actor=current_user, action="location.updated", entity_type="location", entity_id=loc.id, entity_label=loc.name)
    await session.commit()
    await session.refresh(loc)
    return LocationRead.model_validate(loc, from_attributes=True)


@router.delete("/{location_id}", status_code=204)
async def delete_location(location_id: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(Location).where(Location.id == location_id))
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    await write_audit(session, actor=current_user, action="location.deleted", entity_type="location", entity_id=loc.id, entity_label=loc.name)
    await session.delete(loc)
    await session.commit()
