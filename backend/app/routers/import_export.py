import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user
from app.database import get_session
from app.models import Asset, AssetCategory, AssetStatus, Location, Person
from app.schemas.asset import ImportResult

router = APIRouter(tags=["import"])

HEADER_MAP = {
    "name": "name",
    "asset tag": "asset_tag",
    "asset_tag": "asset_tag",
    "serial": "serial",
    "serial number": "serial",
    "manufacturer": "make",
    "make": "make",
    "model": "model",
    "model number": "model_number",
    "model_number": "model_number",
    "category": "category",
    "status": "status",
    "assigned to": "assigned_to",
    "assigned_to": "assigned_to",
    "checkout to": "assigned_to",
    "location": "location",
    "purchase date": "purchase_date",
    "purchase_date": "purchase_date",
    "purchase cost": "purchase_price",
    "purchase cost (usd)": "purchase_price",
    "purchase_price": "purchase_price",
    "cost": "purchase_price",
    "warranty (months)": "warranty_months",
    "warranty months": "warranty_months",
    "warranty_months": "warranty_months",
    "eol date": "eol_date",
    "eol_date": "eol_date",
    "eol": "eol_date",
    "notes": "notes",
    "note": "notes",
    "supplier": "supplier",
}


def _parse_date(val: str):
    if not val or not val.strip():
        return None
    try:
        from dateutil import parser as dateparser
        return dateparser.parse(val.strip()).date()
    except Exception:
        return None


def _parse_float(val: str):
    if not val or not val.strip():
        return None
    try:
        return float(val.strip().replace("$", "").replace(",", ""))
    except Exception:
        return None


def _parse_int(val: str):
    if not val or not val.strip():
        return None
    try:
        return int(float(val.strip()))
    except Exception:
        return None


@router.post("/assets/import", response_model=ImportResult)
async def import_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a CSV")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=422, detail="Empty or invalid CSV")

    normalized_headers = {h.strip().lower(): h for h in reader.fieldnames}

    category_cache: dict[str, int] = {}
    location_cache: dict[str, int] = {}
    status_cache: dict[str, int] = {}
    person_cache: dict[str, int] = {}

    async def get_or_create_category(name: str) -> int:
        key = name.strip().lower()
        if key in category_cache:
            return category_cache[key]
        r = await session.execute(select(AssetCategory).where(AssetCategory.name.ilike(name.strip())))
        existing = r.scalar_one_or_none()
        if existing:
            category_cache[key] = existing.id
            return existing.id
        new = AssetCategory(name=name.strip(), type="Hardware")
        session.add(new)
        await session.flush()
        category_cache[key] = new.id
        return new.id

    async def get_or_create_location(name: str) -> int:
        key = name.strip().lower()
        if key in location_cache:
            return location_cache[key]
        r = await session.execute(select(Location).where(Location.name.ilike(name.strip())))
        existing = r.scalar_one_or_none()
        if existing:
            location_cache[key] = existing.id
            return existing.id
        new = Location(name=name.strip())
        session.add(new)
        await session.flush()
        location_cache[key] = new.id
        return new.id

    async def get_or_create_status(name: str) -> int:
        key = name.strip().lower()
        if key in status_cache:
            return status_cache[key]
        r = await session.execute(select(AssetStatus).where(AssetStatus.name.ilike(name.strip())))
        existing = r.scalar_one_or_none()
        if existing:
            status_cache[key] = existing.id
            return existing.id
        new = AssetStatus(name=name.strip(), color="#6B7280", is_deployable=False)
        session.add(new)
        await session.flush()
        status_cache[key] = new.id
        return new.id

    async def get_or_create_person(name: str) -> int:
        key = name.strip().lower()
        if key in person_cache:
            return person_cache[key]
        r = await session.execute(select(Person).where(Person.name.ilike(name.strip())))
        existing = r.scalar_one_or_none()
        if existing:
            person_cache[key] = existing.id
            return existing.id
        new = Person(name=name.strip(), created_at=datetime.utcnow())
        session.add(new)
        await session.flush()
        person_cache[key] = new.id
        return new.id

    def get_field(row: dict, field: str) -> str:
        for norm_key, orig_key in normalized_headers.items():
            if HEADER_MAP.get(norm_key) == field:
                return row.get(orig_key, "").strip()
        return ""

    default_status_r = await session.execute(select(AssetStatus).order_by(AssetStatus.sort_order).limit(1))
    default_status = default_status_r.scalar_one_or_none()
    default_status_id = default_status.id if default_status else 1

    total = 0
    imported = 0
    skipped = 0
    errors = 0
    rows = []

    for row in reader:
        total += 1
        asset_tag = get_field(row, "asset_tag")
        name = get_field(row, "name")

        if not asset_tag:
            errors += 1
            rows.append({"row": total, "status": "error", "reason": "Missing asset tag"})
            continue

        if not name:
            name = asset_tag

        existing_r = await session.execute(select(Asset).where(Asset.asset_tag == asset_tag))
        if existing_r.scalar_one_or_none():
            skipped += 1
            rows.append({"row": total, "asset_tag": asset_tag, "status": "skipped", "reason": "Duplicate asset tag"})
            continue

        try:
            category_id = None
            cat_name = get_field(row, "category")
            if cat_name:
                category_id = await get_or_create_category(cat_name)

            location_id = None
            loc_name = get_field(row, "location")
            if loc_name:
                location_id = await get_or_create_location(loc_name)

            status_id = default_status_id
            status_name = get_field(row, "status")
            if status_name:
                status_id = await get_or_create_status(status_name)

            assigned_to_id = None
            person_name = get_field(row, "assigned_to")
            if person_name:
                assigned_to_id = await get_or_create_person(person_name)

            asset = Asset(
                name=name,
                asset_tag=asset_tag,
                serial=get_field(row, "serial") or None,
                make=get_field(row, "make") or None,
                model=get_field(row, "model") or None,
                model_number=get_field(row, "model_number") or None,
                category_id=category_id,
                location_id=location_id,
                status_id=status_id,
                assigned_to_id=assigned_to_id,
                purchase_date=_parse_date(get_field(row, "purchase_date")),
                purchase_price=_parse_float(get_field(row, "purchase_price")),
                warranty_months=_parse_int(get_field(row, "warranty_months")),
                eol_date=_parse_date(get_field(row, "eol_date")),
                supplier=get_field(row, "supplier") or None,
                notes=get_field(row, "notes") or None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(asset)
            await session.flush()

            if assigned_to_id:
                from app.models.assignment import Assignment
                session.add(Assignment(
                    asset_id=asset.id,
                    person_id=assigned_to_id,
                    assigned_at=datetime.utcnow(),
                    note="Imported from CSV",
                    assigned_by_id=current_user["id"],
                ))

            imported += 1
            rows.append({"row": total, "asset_tag": asset_tag, "name": name, "status": "imported"})

        except Exception as e:
            errors += 1
            rows.append({"row": total, "asset_tag": asset_tag, "status": "error", "reason": str(e)})

    await session.commit()
    return ImportResult(total=total, imported=imported, skipped=skipped, errors=errors, rows=rows)
