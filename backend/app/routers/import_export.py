import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import get_current_user
from app.database import get_session
from app.models import Asset, AssetCategory, AssetModel, AssetStatus, Location, Person
from app.routers.assets import next_asset_tag
from app.schemas.asset import ImportResult
from app.services.audit import write_audit

router = APIRouter(tags=["import"])


def _csv_response(filename: str, header: list[str], rows: list[list]) -> PlainTextResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)
    writer.writerows(rows)
    return PlainTextResponse(
        output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )




@router.get("/assets/import/template")
async def assets_import_template(_=Depends(get_current_user)):
    return _csv_response(
        "simplegear-assets-template.csv",
        ["Asset Tag", "Name", "Serial", "Manufacturer", "Model", "Model Number",
         "Category", "Status", "Assigned To", "Location", "Purchase Date",
         "Purchase Cost", "Warranty (months)", "EOL Date", "Supplier", "Notes"],
        [
            ["", "MacBook Pro 14 — Jane", "C02XY1234", "Apple", "MacBook Pro 14", "MNW93LL/A",
             "Laptop", "Assigned", "Jane Smith", "HQ — Floor 2", "2025-03-15",
             "1999.00", "36", "2030-03-15", "CDW", "Leave Asset Tag blank to auto-generate"],
            ["LAP-042", "ThinkPad T16", "PF3XYZ01", "Lenovo", "ThinkPad T16", "21MN000MUS",
             "Laptop", "Ready", "", "Warehouse", "2026-01-10", "1149.00", "36", "", "", ""],
        ],
    )


@router.get("/people/import/template")
async def people_import_template(_=Depends(get_current_user)):
    return _csv_response(
        "simplegear-people-template.csv",
        ["Name", "Email", "Phone", "Department", "Employee ID", "Location", "Notes"],
        [
            ["Jane Smith", "jane@company.com", "+1 555 0100", "Engineering", "E-1042", "HQ — Floor 2", ""],
            ["Bob Jones", "bob@company.com", "", "Sales", "", "", "Contractor until Q4"],
        ],
    )


@router.get("/locations/import/template")
async def locations_import_template(_=Depends(get_current_user)):
    return _csv_response(
        "simplegear-locations-template.csv",
        ["Name", "Address", "Parent"],
        [
            ["HQ", "123 Main St, Springfield", ""],
            ["HQ — Floor 2", "", "HQ"],
        ],
    )

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

        if not asset_tag and not name:
            errors += 1
            rows.append({"row": total, "status": "error", "reason": "Missing both asset tag and name"})
            continue

        if not asset_tag:
            asset_tag = await next_asset_tag(session)

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

    await write_audit(
        session, actor=current_user, action="import.completed",
        entity_type="system", entity_label=file.filename,
        payload={"kind": "assets", "total": total, "imported": imported, "skipped": skipped, "errors": errors},
    )
    await session.commit()
    return ImportResult(total=total, imported=imported, skipped=skipped, errors=errors, rows=rows)


def _read_csv(content: bytes) -> csv.DictReader:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=422, detail="Empty or invalid CSV")
    return reader


def _row_getter(fieldnames: list[str], aliases: dict[str, str]):
    """Map normalized header names to canonical fields, mirroring the asset import."""
    normalized = {h.strip().lower(): h for h in fieldnames}

    def get(row: dict, field: str) -> str:
        for norm_key, orig_key in normalized.items():
            if aliases.get(norm_key) == field:
                return (row.get(orig_key) or "").strip()
        return ""

    return get


PEOPLE_HEADER_MAP = {
    "name": "name",
    "full name": "name",
    "email": "email",
    "email address": "email",
    "phone": "phone",
    "phone number": "phone",
    "department": "department",
    "employee id": "employee_id",
    "employee_id": "employee_id",
    "location": "location",
    "notes": "notes",
    "note": "notes",
}


@router.post("/people/import", response_model=ImportResult)
async def import_people_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a CSV")

    reader = _read_csv(await file.read())
    get_field = _row_getter(reader.fieldnames, PEOPLE_HEADER_MAP)

    location_cache: dict[str, int] = {}

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

    total = imported = skipped = errors = 0
    rows = []

    for row in reader:
        total += 1
        name = get_field(row, "name")
        email = get_field(row, "email") or None

        if not name:
            errors += 1
            rows.append({"row": total, "status": "error", "reason": "Missing name"})
            continue

        if email:
            dup_r = await session.execute(select(Person).where(Person.email.ilike(email)))
        else:
            dup_r = await session.execute(select(Person).where(Person.name.ilike(name)))
        if dup_r.scalars().first():
            skipped += 1
            rows.append({"row": total, "name": name, "status": "skipped", "reason": "Duplicate person"})
            continue

        try:
            location_id = None
            loc_name = get_field(row, "location")
            if loc_name:
                location_id = await get_or_create_location(loc_name)

            session.add(Person(
                name=name,
                email=email,
                phone=get_field(row, "phone") or None,
                department=get_field(row, "department") or None,
                employee_id=get_field(row, "employee_id") or None,
                location_id=location_id,
                notes=get_field(row, "notes") or None,
                created_at=datetime.utcnow(),
            ))
            imported += 1
            rows.append({"row": total, "name": name, "status": "imported"})
        except Exception as e:
            errors += 1
            rows.append({"row": total, "name": name, "status": "error", "reason": str(e)})

    await write_audit(
        session, actor=current_user, action="import.completed",
        entity_type="system", entity_label=file.filename,
        payload={"kind": "people", "total": total, "imported": imported, "skipped": skipped, "errors": errors},
    )
    await session.commit()
    return ImportResult(total=total, imported=imported, skipped=skipped, errors=errors, rows=rows)


LOCATIONS_HEADER_MAP = {
    "name": "name",
    "location": "name",
    "address": "address",
    "parent": "parent",
    "parent location": "parent",
}


@router.post("/locations/import", response_model=ImportResult)
async def import_locations_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a CSV")

    reader = _read_csv(await file.read())
    get_field = _row_getter(reader.fieldnames, LOCATIONS_HEADER_MAP)

    async def find_location(name: str) -> Location | None:
        r = await session.execute(select(Location).where(Location.name.ilike(name.strip())))
        return r.scalars().first()

    total = imported = skipped = errors = 0
    rows = []
    parent_links: list[tuple[int, str]] = []  # (location_id, parent_name) resolved after all rows

    for row in reader:
        total += 1
        name = get_field(row, "name")
        if not name:
            errors += 1
            rows.append({"row": total, "status": "error", "reason": "Missing name"})
            continue

        if await find_location(name):
            skipped += 1
            rows.append({"row": total, "name": name, "status": "skipped", "reason": "Duplicate location"})
            continue

        loc = Location(name=name, address=get_field(row, "address") or None)
        session.add(loc)
        await session.flush()
        parent_name = get_field(row, "parent")
        if parent_name:
            parent_links.append((loc.id, parent_name))
        imported += 1
        rows.append({"row": total, "name": name, "status": "imported"})

    # Second pass: resolve parents (they may have been created later in the same file)
    for loc_id, parent_name in parent_links:
        parent = await find_location(parent_name)
        if parent and parent.id != loc_id:
            r = await session.execute(select(Location).where(Location.id == loc_id))
            loc = r.scalar_one()
            loc.parent_id = parent.id

    await write_audit(
        session, actor=current_user, action="import.completed",
        entity_type="system", entity_label=file.filename,
        payload={"kind": "locations", "total": total, "imported": imported, "skipped": skipped, "errors": errors},
    )
    await session.commit()
    return ImportResult(total=total, imported=imported, skipped=skipped, errors=errors, rows=rows)


@router.get("/people/export")
async def export_people(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(Person).order_by(Person.name))
    people = result.scalars().all()

    locations_r = await session.execute(select(Location))
    locations = {l.id: l.name for l in locations_r.scalars().all()}

    counts_r = await session.execute(
        select(Asset.assigned_to_id, func.count()).where(Asset.assigned_to_id.isnot(None)).group_by(Asset.assigned_to_id)
    )
    asset_counts = dict(counts_r.all())

    rows = []
    for p in people:
        rows.append([
            p.name, p.email or "", p.phone or "", p.department or "",
            p.employee_id or "",
            locations.get(p.location_id, "") if p.location_id else "",
            p.notes or "",
            "yes" if p.is_active else "no",
            asset_counts.get(p.id, 0),
        ])
    return _csv_response(
        "simplegear-people.csv",
        ["Name", "Email", "Phone", "Department", "Employee ID", "Location", "Notes", "Active", "Assets Assigned"],
        rows,
    )


MODELS_HEADER_MAP = {
    "name": "name",
    "model": "name",
    "model name": "name",
    "manufacturer": "manufacturer",
    "make": "manufacturer",
    "model number": "model_number",
    "model_number": "model_number",
    "category": "category",
    "eol years": "eol_years",
    "eol_years": "eol_years",
    "eol (years)": "eol_years",
    "notes": "notes",
    "note": "notes",
}


@router.get("/models/import/template")
async def models_import_template(_=Depends(get_current_user)):
    return _csv_response(
        "simplegear-models-template.csv",
        ["Name", "Manufacturer", "Model Number", "Category", "EOL Years", "Notes"],
        [
            ["MacBook Air M4 16GB", "Apple", "MC7X4LL/A", "Laptop", "5", ""],
            ["UltraSharp U2723QE", "Dell", "U2723QE", "Monitor", "8", "Standard issue monitor"],
        ],
    )


@router.get("/models/export")
async def export_models(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(select(AssetModel).order_by(AssetModel.manufacturer, AssetModel.name))
    models = result.scalars().all()

    categories_r = await session.execute(select(AssetCategory))
    categories = {c.id: c.name for c in categories_r.scalars().all()}

    counts_r = await session.execute(
        select(Asset.asset_model_id, func.count()).where(Asset.asset_model_id.isnot(None)).group_by(Asset.asset_model_id)
    )
    asset_counts = dict(counts_r.all())

    rows = []
    for m in models:
        rows.append([
            m.name, m.manufacturer or "", m.model_number or "",
            categories.get(m.category_id, "") if m.category_id else "",
            m.eol_years or "", m.notes or "",
            asset_counts.get(m.id, 0),
        ])
    return _csv_response(
        "simplegear-models.csv",
        ["Name", "Manufacturer", "Model Number", "Category", "EOL Years", "Notes", "Assets"],
        rows,
    )


@router.post("/models/import", response_model=ImportResult)
async def import_models_csv(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a CSV")

    reader = _read_csv(await file.read())
    get_field = _row_getter(reader.fieldnames, MODELS_HEADER_MAP)

    category_cache: dict[str, int] = {}

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

    total = imported = skipped = errors = 0
    rows = []

    for row in reader:
        total += 1
        name = get_field(row, "name")
        manufacturer = get_field(row, "manufacturer") or None

        if not name:
            errors += 1
            rows.append({"row": total, "status": "error", "reason": "Missing name"})
            continue

        dup_q = select(AssetModel).where(AssetModel.name.ilike(name))
        if manufacturer:
            dup_q = dup_q.where(AssetModel.manufacturer.ilike(manufacturer))
        dup_r = await session.execute(dup_q)
        if dup_r.scalars().first():
            skipped += 1
            rows.append({"row": total, "name": name, "status": "skipped", "reason": "Duplicate model"})
            continue

        try:
            category_id = None
            cat_name = get_field(row, "category")
            if cat_name:
                category_id = await get_or_create_category(cat_name)

            session.add(AssetModel(
                name=name,
                manufacturer=manufacturer,
                model_number=get_field(row, "model_number") or None,
                category_id=category_id,
                eol_years=_parse_int(get_field(row, "eol_years")),
                notes=get_field(row, "notes") or None,
            ))
            imported += 1
            rows.append({"row": total, "name": name, "status": "imported"})
        except Exception as e:
            errors += 1
            rows.append({"row": total, "name": name, "status": "error", "reason": str(e)})

    await write_audit(
        session, actor=current_user, action="import.completed",
        entity_type="system", entity_label=file.filename,
        payload={"kind": "models", "total": total, "imported": imported, "skipped": skipped, "errors": errors},
    )
    await session.commit()
    return ImportResult(total=total, imported=imported, skipped=skipped, errors=errors, rows=rows)
