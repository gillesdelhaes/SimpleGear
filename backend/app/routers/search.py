from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user
from app.database import get_session
from app.models import Asset, AssetCategory, AssetStatus, Assignment, Location, Person

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(min_length=2),
    type: str = "all",
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_user),
):
    term = f"%{q}%"
    results: dict = {"assets": [], "people": [], "notes": []}

    if type in ("all", "assets"):
        asset_result = await session.execute(
            select(Asset).where(
                Asset.name.ilike(term)
                | Asset.asset_tag.ilike(term)
                | Asset.serial.ilike(term)
                | Asset.make.ilike(term)
                | Asset.model.ilike(term)
                | Asset.model_number.ilike(term)
                | Asset.supplier.ilike(term)
                | Asset.notes.ilike(term)
            ).limit(10)
        )
        assets = asset_result.scalars().all()

        for asset in assets:
            status_r = await session.execute(select(AssetStatus).where(AssetStatus.id == asset.status_id))
            status = status_r.scalar_one_or_none()

            category = None
            if asset.category_id:
                cat_r = await session.execute(select(AssetCategory).where(AssetCategory.id == asset.category_id))
                cat = cat_r.scalar_one_or_none()
                if cat:
                    category = {"id": cat.id, "name": cat.name, "type": cat.type, "eol_years": cat.eol_years, "color": cat.color}

            assigned_to = None
            if asset.assigned_to_id:
                p_r = await session.execute(select(Person).where(Person.id == asset.assigned_to_id))
                p = p_r.scalar_one_or_none()
                if p:
                    assigned_to = {"id": p.id, "name": p.name}

            results["assets"].append({
                "id": asset.id,
                "name": asset.name,
                "asset_tag": asset.asset_tag,
                "serial": asset.serial,
                "status": {"id": status.id, "name": status.name, "color": status.color, "is_deployable": status.is_deployable, "sort_order": status.sort_order} if status else None,
                "category": category,
                "assigned_to": assigned_to,
            })

    if type in ("all", "people"):
        people_result = await session.execute(
            select(Person).where(
                Person.name.ilike(term)
                | Person.email.ilike(term)
                | Person.department.ilike(term)
                | Person.employee_id.ilike(term)
                | Person.phone.ilike(term)
            ).limit(10)
        )
        people = people_result.scalars().all()

        for p in people:
            from sqlmodel import func
            count_r = await session.execute(select(func.count()).where(Asset.assigned_to_id == p.id))
            count = count_r.scalar_one()
            results["people"].append({
                "id": p.id,
                "name": p.name,
                "email": p.email,
                "department": p.department,
                "asset_count": count,
            })

    if type in ("all", "notes"):
        notes_result = await session.execute(
            select(Assignment).where(
                Assignment.note.ilike(term)
            ).order_by(Assignment.assigned_at.desc()).limit(10)
        )
        assignments = notes_result.scalars().all()

        for a in assignments:
            asset_r = await session.execute(select(Asset).where(Asset.id == a.asset_id))
            asset = asset_r.scalar_one_or_none()
            person_r = await session.execute(select(Person).where(Person.id == a.person_id))
            person = person_r.scalar_one_or_none()

            results["notes"].append({
                "assignment_id": a.id,
                "asset_id": a.asset_id,
                "asset_name": asset.name if asset else "",
                "person_id": a.person_id,
                "person_name": person.name if person else "",
                "note": a.note,
                "occurred_at": a.assigned_at,
            })

    return results
