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
from app.models import Asset, AssetCategory, AssetModel, AssetStatus, Assignment, Location, Person, SystemUser
from app.schemas.asset import (
    AssetCreate, AssetRead, AssetUpdate, AssignmentRead, AssignRequest,
    BulkRequest, ReleaseRequest,
)
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


@router.get("")
async def list_assets(
    q: Optional[str] = None,
    status_id: Optional[int] = None,
    category_id: Optional[int] = None,
    location_id: Optional[int] = None,
    assigned_to_id: Optional[int] = None,
    unassigned: Optional[bool] = None,
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

    skip = (page - 1) * per_page
    paged_query = base_query.order_by(Asset.asset_tag).offset(skip).limit(per_page)
    result = await session.execute(paged_query)
    assets = result.scalars().all()
    items = [await _build_asset_read(a, session) for a in assets]

    import math
    return {"items": items, "total": total, "pages": max(1, math.ceil(total / per_page))}


@router.post("", response_model=AssetRead, status_code=201)
async def create_asset(body: AssetCreate, session: AsyncSession = Depends(get_session), current_user: dict = Depends(get_current_user)):
    existing = await session.execute(select(Asset).where(Asset.asset_tag == body.asset_tag))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Asset tag already exists")
    asset = Asset(**body.model_dump(), created_at=datetime.utcnow(), updated_at=datetime.utcnow())
    session.add(asset)
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
async def update_asset(asset_id: int, body: AssetUpdate, session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(asset, k, v)
    asset.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: int, session: AsyncSession = Depends(get_session), _=Depends(require_admin)):
    result = await session.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
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
    if not person_result.scalar_one_or_none():
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

    await session.commit()
    await session.refresh(asset)
    return await _build_asset_read(asset, session)


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
            await session.delete(asset)

    elif body.action == "status":
        if not body.status_id:
            raise HTTPException(status_code=422, detail="status_id required")
        for asset in assets:
            asset.status_id = body.status_id
            asset.updated_at = datetime.utcnow()

    elif body.action == "location":
        for asset in assets:
            asset.location_id = body.location_id
            asset.updated_at = datetime.utcnow()

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

    else:
        raise HTTPException(status_code=422, detail=f"Unknown action: {body.action}")

    await session.commit()
    return {"affected": affected, "action": body.action}
