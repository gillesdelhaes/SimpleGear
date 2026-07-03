from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlmodel import select, func

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import Person, Asset, Assignment, Location
from app.schemas.person import PersonCreate, PersonRead, PersonUpdate
from app.schemas.asset import AssignmentRead
from app.routers.assets import _build_asset_read
from app.services.audit import diff_fields, write_audit

router = APIRouter(prefix="/people", tags=["people"])


async def _build_person_read(person: Person, session: AsyncSession) -> PersonRead:
    asset_count_result = await session.execute(
        select(func.count()).where(Asset.assigned_to_id == person.id)
    )
    asset_count = asset_count_result.scalar_one()

    location_name = None
    if person.location_id:
        loc_result = await session.execute(select(Location).where(Location.id == person.location_id))
        loc = loc_result.scalar_one_or_none()
        location_name = loc.name if loc else None

    return PersonRead(
        id=person.id,
        name=person.name,
        email=person.email,
        phone=person.phone,
        department=person.department,
        employee_id=person.employee_id,
        location_id=person.location_id,
        location_name=location_name,
        notes=person.notes,
        is_active=person.is_active,
        created_at=person.created_at,
        asset_count=asset_count,
    )


@router.get("")
async def list_people(
    q: str | None = None,
    is_active: bool | None = None,
    page: int = 1,
    per_page: int = 100,
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_user),
):
    import math
    base_query = select(Person)
    if q:
        term = f"%{q}%"
        base_query = base_query.where(
            Person.name.ilike(term)
            | Person.email.ilike(term)
            | Person.department.ilike(term)
            | Person.employee_id.ilike(term)
            | Person.phone.ilike(term)
        )
    if is_active is not None:
        base_query = base_query.where(Person.is_active == is_active)

    count_result = await session.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    skip = (page - 1) * per_page
    paged_query = base_query.order_by(Person.name).offset(skip).limit(per_page)
    result = await session.execute(paged_query)
    people = result.scalars().all()
    items = [await _build_person_read(p, session) for p in people]
    return {"items": items, "total": total, "pages": max(1, math.ceil(total / per_page))}


@router.post("", response_model=PersonRead, status_code=201)
async def create_person(body: PersonCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(get_current_user)):
    p = Person(**body.model_dump(), created_at=datetime.utcnow())
    session.add(p)
    await session.flush()
    await write_audit(
        session, actor=current_user, action="person.created",
        entity_type="person", entity_id=p.id, entity_label=p.name,
    )
    await session.commit()
    await session.refresh(p)
    return await _build_person_read(p, session)


@router.get("/{person_id}", response_model=PersonRead)
async def get_person(person_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Person).where(Person.id == person_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    return await _build_person_read(p, session)


@router.patch("/{person_id}", response_model=PersonRead)
async def update_person(person_id: int, body: PersonUpdate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(get_current_user)):
    result = await session.execute(select(Person).where(Person.id == person_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    updates = body.model_dump(exclude_none=True)
    before = {k: getattr(p, k) for k in updates}
    for k, v in updates.items():
        setattr(p, k, v)
    changes = diff_fields(before, updates)
    if changes:
        await write_audit(
            session, actor=current_user, action="person.updated",
            entity_type="person", entity_id=p.id, entity_label=p.name,
            payload={"changes": changes},
        )
    await session.commit()
    await session.refresh(p)
    return await _build_person_read(p, session)


@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(Person).where(Person.id == person_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Person not found")
    await write_audit(
        session, actor=current_user, action="person.deleted",
        entity_type="person", entity_id=p.id, entity_label=p.name,
    )
    await session.delete(p)
    await session.commit()


@router.get("/{person_id}/assets")
async def person_assets(person_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    from app.models import AssetStatus, AssetCategory
    result = await session.execute(select(Person).where(Person.id == person_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Person not found")

    assets_result = await session.execute(select(Asset).where(Asset.assigned_to_id == person_id))
    current_assets = assets_result.scalars().all()
    current = [await _build_asset_read(a, session) for a in current_assets]

    history_result = await session.execute(
        select(Assignment).where(
            Assignment.person_id == person_id,
            Assignment.released_at.isnot(None)
        ).order_by(Assignment.assigned_at.desc()).limit(50)
    )
    past_assignments = history_result.scalars().all()
    history = []
    for a in past_assignments:
        asset_r = await session.execute(select(Asset).where(Asset.id == a.asset_id))
        asset = asset_r.scalar_one_or_none()
        history.append({
            "id": a.id,
            "asset_id": a.asset_id,
            "asset_name": asset.name if asset else "",
            "person_id": person_id,
            "person_name": "",
            "assigned_at": a.assigned_at,
            "released_at": a.released_at,
            "note": a.note,
            "assigned_by_name": None,
        })

    return {"current": current, "history": history}
