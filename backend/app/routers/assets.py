import csv
import io
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import get_current_user, require_admin
from app.database import get_session
from app.models import Asset, AssetCategory, AssetModel, AssetStatus, Assignment, AuditLog, Location, Person, SystemUser
from app.schemas.activity import AuditLogRead
from app.schemas.asset import (
    AssetCreate, AssetRead, AssetUpdate, AssignmentRead, AssignRequest,
    AuditRequest, BulkRequest, ReleaseRequest,
)
from app.services.audit import diff_fields, write_audit
from app.services.settings_service import DEFAULT_ASSET_TAG_PREFIX, get_audit_interval_months, get_setting
from app.schemas.asset_model import AssetModelRead
from app.schemas.category import CategoryRead
from app.schemas.location import LocationRead
from app.schemas.person import PersonRead
from app.schemas.status import StatusRead

router = APIRouter(prefix="/assets", tags=["assets"])


def _days_until(d: Optional[date]) -> Optional[int]:
    if d is None:
        return None
    return (d - date.today()).days


def _asset_label(asset: Asset) -> str:
    return f"{asset.asset_tag} — {asset.name}"


async def next_asset_tag(session: AsyncSession) -> str:
    """Generate the next sequential asset tag from the configured prefix."""
    prefix = await get_setting(session, "asset_tag_prefix") or DEFAULT_ASSET_TAG_PREFIX
    result = await session.execute(select(Asset.asset_tag).where(Asset.asset_tag.like(f"{prefix}%")))
    max_n = 0
    for (tag,) in result.all():
        suffix = tag[len(prefix):]
        if suffix.isdigit():
            max_n = max(max_n, int(suffix))
    return f"{prefix}{max_n + 1:04d}"


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                      31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


async def _build_asset_read(asset: Asset, session: AsyncSession) -> AssetRead:
    status_result = await session.execute(select(AssetStatus).where(AssetStatus.id == asset.status_id))
    status = status_result.scalar_one()

    asset_model = None
    if asset.asset_model_id:
        am_result = await session.execute(select(AssetModel).where(AssetModel.id == asset.asset_model_id))
        am = am_result.scalar_one_or_none()
        if am:
            asset_model = AssetModelRead.model_validate(am, from_attributes=True)

    category = None
    if asset.category_id:
        cat_result = await session.execute(select(AssetCategory).where(AssetCategory.id == asset.category_id))
        cat = cat_result.scalar_one_or_none()
        if cat:
            category = CategoryRead.model_validate(cat, from_attributes=True)

    location = None
    if asset.location_id:
        loc_result = await session.execute(select(Location).where(Location.id == asset.location_id))
        loc = loc_result.scalar_one_or_none()
        if loc:
            location = LocationRead.model_validate(loc, from_attributes=True)

    assigned_to = None
    if asset.assigned_to_id:
        person_result = await session.execute(select(Person).where(Person.id == asset.assigned_to_id))
        person = person_result.scalar_one_or_none()
        if person:
            from app.schemas.asset import PersonBrief
            assigned_to = PersonBrief(id=person.id, name=person.name, department=person.department, email=person.email)

    last_audit_by_name = None
    if asset.last_audit_by_id:
        auditor_result = await session.execute(select(SystemUser).where(SystemUser.id == asset.last_audit_by_id))
        auditor = auditor_result.scalar_one_or_none()
        last_audit_by_name = auditor.name if auditor else None

    return AssetRead(
        id=asset.id,
        name=asset.name,
        asset_tag=asset.asset_tag,
        serial=asset.serial,
        asset_model_id=asset.asset_model_id,
        asset_model=asset_model,
        make=asset.make,
        model=asset.model,
        model_number=asset.model_number,
        category_id=asset.category_id,
        location_id=asset.location_id,
        status_id=asset.status_id,
        assigned_to_id=asset.assigned_to_id,
        purchase_date=asset.purchase_date,
        purchase_price=asset.purchase_price,
        warranty_months=asset.warranty_months,
        warranty_expiry=asset.warranty_expiry,
        eol_date=asset.eol_date,
        supplier=asset.supplier,
        notes=asset.notes,
        last_audit_at=asset.last_audit_at,
        last_audit_by_name=last_audit_by_name,
        next_audit_date=asset.next_audit_date,
        days_to_next_audit=_days_until(asset.next_audit_date),
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        status=StatusRead.model_validate(status, from_attributes=True),
        category=category,
        location=location,
        assigned_to=assigned_to,
        days_to_eol=_days_until(asset.eol_date),
        days_to_warranty_expiry=_days_until(asset.warranty_expiry),
    )


@router.get("/export")
async def export_assets(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Asset).order_by(Asset.asset_tag))
    assets = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Asset Tag", "Name", "Serial", "Make", "Model", "Model Number",
        "Category", "Location", "Status", "Assigned To",
        "Purchase Date", "Purchase Cost", "Warranty (months)", "Warranty Expiry",
        "EOL Date", "Supplier", "Notes", "Created At",
    ])

    for asset in assets:
        category_name = ""
        if asset.category_id:
            cr = await session.execute(select(AssetCategory).where(AssetCategory.id == asset.category_id))
            cat = cr.scalar_one_or_none()
            category_name = cat.name if cat else ""

        location_name = ""
        if asset.location_id:
            lr = await session.execute(select(Location).where(Location.id == asset.location_id))
            loc = lr.scalar_one_or_none()
            location_name = loc.name if loc else ""

        status_name = ""
        sr = await session.execute(select(AssetStatus).where(AssetStatus.id == asset.status_id))
        st = sr.scalar_one_or_none()
        status_name = st.name if st else ""

        person_name = ""
        if asset.assigned_to_id:
            pr = await session.execute(select(Person).where(Person.id == asset.assigned_to_id))
            person = pr.scalar_one_or_none()
            person_name = person.name if person else ""

        writer.writerow([
            asset.asset_tag, asset.name, asset.serial or "", asset.make or "",
            asset.model or "", asset.model_number or "", category_name, location_name,
            status_name, person_name,
            str(asset.purchase_date) if asset.purchase_date else "",
            str(asset.purchase_price) if asset.purchase_price else "",
            str(asset.warranty_months) if asset.warranty_months else "",
            str(asset.warranty_expiry) if asset.warranty_expiry else "",
            str(asset.eol_date) if asset.eol_date else "",
            asset.supplier or "", asset.notes or "",
            str(asset.created_at) if asset.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=simplegear-assets.csv"},
    )


# Direct column sorts
SORT_COLUMNS = {
    "name": Asset.name,
    "asset_tag": Asset.asset_tag,
    "serial": Asset.serial,
    "supplier": Asset.supplier,
    "purchase_date": Asset.purchase_date,
    "purchase_price": Asset.purchase_price,
    "warranty_expiry": Asset.warranty_expiry,
    "eol_date": Asset.eol_date,
    "next_audit_date": Asset.next_audit_date,
    "last_audit_at": Asset.last_audit_at,
    "created_at": Asset.created_at,
    "updated_at": Asset.updated_at,
}

# Sorts that need a join to order by the related name
SORT_JOINS = {
    "status": (AssetStatus, Asset.status_id == AssetStatus.id, AssetStatus.name),
    "category": (AssetCategory, Asset.category_id == AssetCategory.id, AssetCategory.name),
    "location": (Location, Asset.location_id == Location.id, Location.name),
    "assigned_to": (Person, Asset.assigned_to_id == Person.id, Person.name),
}


@router.get("")
async def list_assets(
    q: Optional[str] = None,
    status_id: Optional[int] = None,
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    unassigned: Optional[bool] = None,
    sort: Optional[str] = None,
    dir: str = "asc",
    page: int = 1,
    per_page: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
    _=Depends(get_current_user),
):
    base_query = select(Asset)
    if q:
        term = f"%{q}%"
        base_query = base_query.where(
            Asset.name.ilike(term)
            | Asset.asset_tag.ilike(term)
            | Asset.serial.ilike(term)
            | Asset.make.ilike(term)
            | Asset.model.ilike(term)
            | Asset.model_number.ilike(term)
            | Asset.supplier.ilike(term)
            | Asset.notes.ilike(term)
        )
    if status_id is not None:
        base_query = base_query.where(Asset.status_id == status_id)
    if category_id is not None:
        base_query = base_query.where(Asset.category_id == category_id)
    if location_id is not None:
        base_query = base_query.where(Asset.location_id == location_id)
    if assigned_to_id is not None:
        base_query = base_query.where(Asset.assigned_to_id == assigned_to_id)
    if unassigned is True:
        base_query = base_query.where(Asset.assigned_to_id.is_(None))
    elif unassigned is False:
        base_query = base_query.where(Asset.assigned_to_id.isnot(None))

    count_result = await session.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    if sort in SORT_COLUMNS:
        col = SORT_COLUMNS[sort]
        order = col.desc().nullslast() if dir == "desc" else col.asc().nullslast()
        base_query = base_query.order_by(order, Asset.asset_tag)
    elif sort in SORT_JOINS:
        model, cond, name_col = SORT_JOINS[sort]
        order = name_col.desc().nullslast() if dir == "desc" else name_col.asc().nullslast()
        base_query = base_query.outerjoin(model, cond).order_by(order, Asset.asset_tag)
    else:
        base_query = base_query.order_by(Asset.asset_tag)

    skip = (page - 1) * per_page
    paged_query = base_query.offset(skip).limit(per_page)
    result = await session.execute(paged_query)
    assets = result.scalars().all()
    items = [await _build_asset_read(a, session) for a in assets]

    import math
    return {"items": items, "total": total, "pages": max(1, math.ceil(total / per_page))}


@router.get("/next-tag")
async def get_next_tag(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    return {"tag": await next_asset_tag(session)}


@router.post("", response_model=AssetRead, status_code=201)
async def create_asset(body: AssetCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(get_current_user)):
    data = body.model_dump()
    if not (data.get("asset_tag") or "").strip():
        data["asset_tag"] = await next_asset_tag(session)
    else:
        data["asset_tag"] = data["asset_tag"].strip()
        existing = await session.execute(select(Asset).where(Asset.asset_tag == data["asset_tag"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Asset tag already exists")
    asset = Asset(**data, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    session.add(asset)
    await session.flush()
    await write_audit(
        session, actor=current_user, action="asset.created",
        entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
        payload={"asset_tag": asset.asset_tag, "serial": asset.serial},
    )
    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


@router.get("/{asset_id}", response_model=AssetRead)
async def get_asset(asset_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return await _build_asset_read(asset, session)


@router.patch("/{asset_id}", response_model=AssetRead)
async def update_asset(asset_id: int, body: AssetUpdate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(get_current_user)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    updates = body.model_dump(exclude_unset=True)
    before = {k: getattr(asset, k) for k in updates}
    for k, v in updates.items():
        setattr(asset, k, v)
    asset.updated_at = datetime.utcnow()
    changes = diff_fields(before, updates)
    if changes:
        await write_audit(
            session, actor=current_user, action="asset.updated",
            entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
            payload={"changes": changes},
        )
    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: int, session: AsyncSession = Depends(get_session), current_user: dict = Depends(require_admin)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await write_audit(
        session, actor=current_user, action="asset.deleted",
        entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
        payload={"asset_tag": asset.asset_tag, "serial": asset.serial},
    )
    await session.delete(asset)
    await session.commit()


@router.post("/{asset_id}/assign", response_model=AssetRead)
async def assign_asset(
    asset_id: int,
    body: AssignRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    person_result = await session.execute(select(Person).where(Person.id == body.person_id))
    person = person_result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    if asset.assigned_to_id:
        open_assign = await session.execute(
            select(Assignment).where(Assignment.asset_id == asset_id, Assignment.released_at.is_(None))
        )
        existing = open_assign.scalar_one_or_none()
        if existing:
            existing.released_at = datetime.utcnow()

    assigned_status = await session.execute(
        select(AssetStatus).where(AssetStatus.name == "Assigned").limit(1)
    )
    assigned_st = assigned_status.scalar_one_or_none()

    asset.assigned_to_id = body.person_id
    if assigned_st:
        asset.status_id = assigned_st.id
    asset.updated_at = datetime.utcnow()

    assignment = Assignment(
        asset_id=asset_id,
        person_id=body.person_id,
        assigned_at=datetime.utcnow(),
        note=body.note,
        assigned_by_id=current_user["id"],
    )
    session.add(assignment)
    await write_audit(
        session, actor=current_user, action="asset.assigned",
        entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
        payload={"person_id": body.person_id, "person_name": person.name, "note": body.note},
    )
    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


@router.post("/{asset_id}/release", response_model=AssetRead)
async def release_asset(
    asset_id: int,
    body: ReleaseRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    open_assign = await session.execute(
        select(Assignment).where(Assignment.asset_id == asset_id, Assignment.released_at.is_(None))
    )
    assignment = open_assign.scalar_one_or_none()
    if assignment:
        assignment.released_at = datetime.utcnow()
        if body.note:
            assignment.note = body.note

    asset.assigned_to_id = None
    if body.new_status_id:
        asset.status_id = body.new_status_id
    else:
        ready_result = await session.execute(
            select(AssetStatus).where(AssetStatus.name == "Ready").limit(1)
        )
        ready = ready_result.scalar_one_or_none()
        if ready:
            asset.status_id = ready.id
    asset.updated_at = datetime.utcnow()

    await write_audit(
        session, actor=current_user, action="asset.released",
        entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
        payload={"note": body.note},
    )
    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


@router.post("/{asset_id}/audit", response_model=AssetRead)
async def audit_asset(
    asset_id: int,
    body: AuditRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Record a physical audit: the asset was sighted and verified."""
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    payload: dict = {"note": body.note}
    if body.location_id is not None and body.location_id != asset.location_id:
        loc_result = await session.execute(select(Location).where(Location.id == body.location_id))
        loc = loc_result.scalar_one_or_none()
        if not loc:
            raise HTTPException(status_code=404, detail="Location not found")
        payload["location_corrected_to"] = loc.name
        asset.location_id = body.location_id

    now = datetime.utcnow()
    asset.last_audit_at = now
    asset.last_audit_by_id = current_user["id"]
    if body.next_audit_date:
        asset.next_audit_date = body.next_audit_date
    else:
        interval = await get_audit_interval_months(session)
        asset.next_audit_date = _add_months(now.date(), interval)
    asset.updated_at = now
    payload["next_audit_date"] = asset.next_audit_date.isoformat()

    await write_audit(
        session, actor=current_user, action="asset.audited",
        entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
        payload=payload,
    )
    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


@router.get("/{asset_id}/activity", response_model=list[AuditLogRead])
async def asset_activity(asset_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Asset not found")
    entries = await session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "asset", AuditLog.entity_id == str(asset_id))
        .order_by(AuditLog.created_at.desc())
        .limit(200)
    )
    return [
        AuditLogRead(
            id=e.id, actor_id=e.actor_id, actor_name=e.actor_name, action=e.action,
            entity_type=e.entity_type, entity_id=e.entity_id, entity_label=e.entity_label,
            payload=e.payload, created_at=e.created_at,
        )
        for e in entries.scalars().all()
    ]


@router.get("/{asset_id}/history", response_model=list[AssignmentRead])
async def asset_history(asset_id: int, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Asset not found")

    hist = await session.execute(
        select(Assignment).where(Assignment.asset_id == asset_id).order_by(Assignment.assigned_at.desc())
    )
    assignments = hist.scalars().all()

    out = []
    for a in assignments:
        person_result = await session.execute(select(Person).where(Person.id == a.person_id))
        person = person_result.scalar_one_or_none()

        asset_result = await session.execute(select(Asset).where(Asset.id == a.asset_id))
        asset_obj = asset_result.scalar_one_or_none()

        assigned_by_name = None
        if a.assigned_by_id:
            user_result = await session.execute(select(SystemUser).where(SystemUser.id == a.assigned_by_id))
            user = user_result.scalar_one_or_none()
            assigned_by_name = user.name if user else None

        out.append(AssignmentRead(
            id=a.id,
            asset_id=a.asset_id,
            asset_name=asset_obj.name if asset_obj else "",
            person_id=a.person_id,
            person_name=person.name if person else "",
            assigned_at=a.assigned_at,
            released_at=a.released_at,
            note=a.note,
            assigned_by_name=assigned_by_name,
        ))
    return out


@router.post("/bulk")
async def bulk_action(
    body: BulkRequest,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if not body.ids:
        raise HTTPException(status_code=422, detail="No asset IDs provided")

    result = await session.execute(select(Asset).where(Asset.id.in_(body.ids)))
    assets = result.scalars().all()
    affected = len(assets)

    if body.action == "delete":
        for asset in assets:
            await write_audit(
                session, actor=current_user, action="asset.deleted",
                entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
                payload={"bulk": True},
            )
            await session.delete(asset)

    elif body.action == "status":
        if not body.status_id:
            raise HTTPException(status_code=422, detail="status_id required")
        for asset in assets:
            await write_audit(
                session, actor=current_user, action="asset.updated",
                entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
                payload={"bulk": True, "changes": {"status_id": {"from": asset.status_id, "to": body.status_id}}},
            )
            asset.status_id = body.status_id
            asset.updated_at = datetime.utcnow()

    elif body.action == "location":
        for asset in assets:
            await write_audit(
                session, actor=current_user, action="asset.updated",
                entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
                payload={"bulk": True, "changes": {"location_id": {"from": asset.location_id, "to": body.location_id}}},
            )
            asset.location_id = body.location_id
            asset.updated_at = datetime.utcnow()

    elif body.action == "audit":
        interval = await get_audit_interval_months(session)
        now = datetime.utcnow()
        next_date = _add_months(now.date(), interval)
        for asset in assets:
            asset.last_audit_at = now
            asset.last_audit_by_id = current_user["id"]
            asset.next_audit_date = next_date
            asset.updated_at = now
            await write_audit(
                session, actor=current_user, action="asset.audited",
                entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
                payload={"bulk": True, "note": body.note, "next_audit_date": next_date.isoformat()},
            )

    elif body.action == "assign":
        if not body.person_id:
            raise HTTPException(status_code=422, detail="person_id required")
        assigned_status = await session.execute(
            select(AssetStatus).where(AssetStatus.name == "Assigned").limit(1)
        )
        assigned_st = assigned_status.scalar_one_or_none()
        for asset in assets:
            if asset.assigned_to_id:
                open_assign = await session.execute(
                    select(Assignment).where(Assignment.asset_id == asset.id, Assignment.released_at.is_(None))
                )
                existing = open_assign.scalar_one_or_none()
                if existing:
                    existing.released_at = datetime.utcnow()
            asset.assigned_to_id = body.person_id
            if assigned_st:
                asset.status_id = assigned_st.id
            asset.updated_at = datetime.utcnow()
            session.add(Assignment(
                asset_id=asset.id,
                person_id=body.person_id,
                assigned_at=datetime.utcnow(),
                note=body.note,
                assigned_by_id=current_user["id"],
            ))
            await write_audit(
                session, actor=current_user, action="asset.assigned",
                entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
                payload={"bulk": True, "person_id": body.person_id, "note": body.note},
            )

    elif body.action == "release":
        ready_result = await session.execute(
            select(AssetStatus).where(AssetStatus.name == "Ready").limit(1)
        )
        ready = ready_result.scalar_one_or_none()
        for asset in assets:
            open_assign = await session.execute(
                select(Assignment).where(Assignment.asset_id == asset.id, Assignment.released_at.is_(None))
            )
            assignment = open_assign.scalar_one_or_none()
            if assignment:
                assignment.released_at = datetime.utcnow()
                if body.note:
                    assignment.note = body.note
            asset.assigned_to_id = None
            if ready:
                asset.status_id = ready.id
            asset.updated_at = datetime.utcnow()
            await write_audit(
                session, actor=current_user, action="asset.released",
                entity_type="asset", entity_id=asset.id, entity_label=_asset_label(asset),
                payload={"bulk": True, "note": body.note},
            )

    else:
        raise HTTPException(status_code=422, detail=f"Unknown action: {body.action}")

    await session.commit()
    return {"affected": affected, "action": body.action}
