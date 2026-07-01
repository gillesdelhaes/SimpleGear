from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import get_current_user
from app.database import get_session
from app.models import Asset, AssetCategory, AssetStatus, Assignment, Person
from app.schemas.dashboard import ActivityItem, Alert, CategoryCount, DashboardStats, StatusCount

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    total_r = await session.execute(select(func.count()).select_from(Asset))
    total = total_r.scalar_one()

    assigned_r = await session.execute(select(func.count()).where(Asset.assigned_to_id.isnot(None)))
    assigned_count = assigned_r.scalar_one()

    value_r = await session.execute(select(func.sum(Asset.purchase_price)))
    total_value = value_r.scalar_one()

    statuses_r = await session.execute(select(AssetStatus).order_by(AssetStatus.sort_order))
    statuses = statuses_r.scalars().all()

    by_status = []
    for s in statuses:
        count_r = await session.execute(select(func.count()).where(Asset.status_id == s.id))
        count = count_r.scalar_one()
        by_status.append(StatusCount(status_id=s.id, name=s.name, color=s.color, count=count))

    categories_r = await session.execute(select(AssetCategory).order_by(AssetCategory.name))
    categories = categories_r.scalars().all()

    by_category = []
    for c in categories:
        count_r = await session.execute(select(func.count()).where(Asset.category_id == c.id))
        count = count_r.scalar_one()
        if count > 0:
            by_category.append(CategoryCount(category_id=c.id, name=c.name, count=count))

    return DashboardStats(
        total=total,
        assigned_count=assigned_count,
        unassigned_count=total - assigned_count,
        total_value=float(total_value) if total_value else None,
        by_status=by_status,
        by_category=by_category,
    )


@router.get("/alerts", response_model=list[Alert])
async def dashboard_alerts(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    threshold = date.today() + timedelta(days=90)
    today = date.today()
    alerts = []

    eol_r = await session.execute(
        select(Asset).where(Asset.eol_date.isnot(None), Asset.eol_date <= threshold).order_by(Asset.eol_date)
    )
    for asset in eol_r.scalars().all():
        alerts.append(Alert(
            type="eol",
            asset_id=asset.id,
            asset_name=asset.name,
            asset_tag=asset.asset_tag,
            date=str(asset.eol_date),
            days_remaining=(asset.eol_date - today).days,
        ))

    warranty_r = await session.execute(
        select(Asset).where(Asset.warranty_expiry.isnot(None), Asset.warranty_expiry <= threshold).order_by(Asset.warranty_expiry)
    )
    for asset in warranty_r.scalars().all():
        alerts.append(Alert(
            type="warranty",
            asset_id=asset.id,
            asset_name=asset.name,
            asset_tag=asset.asset_tag,
            date=str(asset.warranty_expiry),
            days_remaining=(asset.warranty_expiry - today).days,
        ))

    alerts.sort(key=lambda a: a.days_remaining)
    return alerts


@router.get("/activity", response_model=list[ActivityItem])
async def dashboard_activity(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(
        select(Assignment).order_by(Assignment.assigned_at.desc()).limit(20)
    )
    assignments = result.scalars().all()

    items = []
    for a in assignments:
        asset_r = await session.execute(select(Asset).where(Asset.id == a.asset_id))
        asset = asset_r.scalar_one_or_none()
        person_r = await session.execute(select(Person).where(Person.id == a.person_id))
        person = person_r.scalar_one_or_none()

        items.append(ActivityItem(
            type="released" if a.released_at else "assigned",
            assignment_id=a.id,
            asset_id=a.asset_id,
            asset_name=asset.name if asset else "",
            person_id=a.person_id,
            person_name=person.name if person else "",
            note=a.note,
            occurred_at=a.released_at if a.released_at else a.assigned_at,
        ))

    return items
