import csv
import io
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import get_current_user
from app.database import get_session
from app.models import Asset, AssetMaintenance, AssetStatus, Location, Person, SystemUser

router = APIRouter(prefix="/reports", tags=["reports"])


class AuditCompliance(BaseModel):
    total: int
    audited_ok: int  # audited and not yet due again
    overdue: int
    never_audited: int
    compliance_pct: float  # audited_ok / total


class LocationValue(BaseModel):
    location_id: Optional[int]
    name: str
    count: int
    value: float


class ReportSummary(BaseModel):
    total_assets: int
    total_value: float
    audit: AuditCompliance
    warranty_expiring_90d: int
    eol_within_90d: int
    maintenance_open: int
    maintenance_cost_total: float
    by_location: list[LocationValue]


@router.get("/summary", response_model=ReportSummary)
async def report_summary(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    today = date.today()
    horizon = today + timedelta(days=90)

    total_r = await session.execute(select(func.count()).select_from(Asset))
    total = total_r.scalar_one()

    value_r = await session.execute(select(func.sum(Asset.purchase_price)))
    total_value = float(value_r.scalar_one() or 0)

    never_r = await session.execute(select(func.count()).where(Asset.last_audit_at.is_(None)))
    never_audited = never_r.scalar_one()

    overdue_r = await session.execute(
        select(func.count()).where(Asset.next_audit_date.isnot(None), Asset.next_audit_date < today)
    )
    overdue = overdue_r.scalar_one()

    audited_ok = total - never_audited - overdue

    warranty_r = await session.execute(
        select(func.count()).where(
            Asset.warranty_expiry.isnot(None),
            Asset.warranty_expiry >= today,
            Asset.warranty_expiry <= horizon,
        )
    )
    warranty_expiring = warranty_r.scalar_one()

    eol_r = await session.execute(
        select(func.count()).where(Asset.eol_date.isnot(None), Asset.eol_date <= horizon)
    )
    eol_soon = eol_r.scalar_one()

    open_maint_r = await session.execute(
        select(func.count()).where(AssetMaintenance.completed_date.is_(None))
    )
    maintenance_open = open_maint_r.scalar_one()

    maint_cost_r = await session.execute(select(func.sum(AssetMaintenance.cost)))
    maintenance_cost_total = float(maint_cost_r.scalar_one() or 0)

    locations_r = await session.execute(select(Location).order_by(Location.name))
    by_location = []
    for loc in locations_r.scalars().all():
        count_r = await session.execute(select(func.count()).where(Asset.location_id == loc.id))
        count = count_r.scalar_one()
        if count == 0:
            continue
        loc_value_r = await session.execute(
            select(func.sum(Asset.purchase_price)).where(Asset.location_id == loc.id)
        )
        by_location.append(LocationValue(
            location_id=loc.id, name=loc.name, count=count,
            value=float(loc_value_r.scalar_one() or 0),
        ))
    no_loc_count_r = await session.execute(select(func.count()).where(Asset.location_id.is_(None)))
    no_loc_count = no_loc_count_r.scalar_one()
    if no_loc_count > 0:
        no_loc_value_r = await session.execute(
            select(func.sum(Asset.purchase_price)).where(Asset.location_id.is_(None))
        )
        by_location.append(LocationValue(
            location_id=None, name="No location", count=no_loc_count,
            value=float(no_loc_value_r.scalar_one() or 0),
        ))

    return ReportSummary(
        total_assets=total,
        total_value=total_value,
        audit=AuditCompliance(
            total=total,
            audited_ok=max(0, audited_ok),
            overdue=overdue,
            never_audited=never_audited,
            compliance_pct=round(100 * max(0, audited_ok) / total, 1) if total else 100.0,
        ),
        warranty_expiring_90d=warranty_expiring,
        eol_within_90d=eol_soon,
        maintenance_open=maintenance_open,
        maintenance_cost_total=maintenance_cost_total,
        by_location=by_location,
    )


def _csv_response(rows: list[list], header: list[str], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(header)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/audit-compliance")
async def export_audit_compliance(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    """Per-asset audit status — evidence that physical inventory checks are being run."""
    today = date.today()
    result = await session.execute(select(Asset).order_by(Asset.asset_tag))
    assets = result.scalars().all()

    users_r = await session.execute(select(SystemUser))
    users = {u.id: u.name for u in users_r.scalars().all()}
    people_r = await session.execute(select(Person))
    people = {p.id: p.name for p in people_r.scalars().all()}
    locations_r = await session.execute(select(Location))
    locations = {l.id: l.name for l in locations_r.scalars().all()}
    statuses_r = await session.execute(select(AssetStatus))
    statuses = {s.id: s.name for s in statuses_r.scalars().all()}

    rows = []
    for a in assets:
        if a.last_audit_at is None:
            audit_status = "Never audited"
        elif a.next_audit_date and a.next_audit_date < today:
            audit_status = "Overdue"
        else:
            audit_status = "OK"
        rows.append([
            a.asset_tag, a.name, a.serial or "",
            statuses.get(a.status_id, ""),
            locations.get(a.location_id, "") if a.location_id else "",
            people.get(a.assigned_to_id, "") if a.assigned_to_id else "",
            audit_status,
            a.last_audit_at.date().isoformat() if a.last_audit_at else "",
            users.get(a.last_audit_by_id, "") if a.last_audit_by_id else "",
            a.next_audit_date.isoformat() if a.next_audit_date else "",
        ])

    return _csv_response(
        rows,
        ["Asset Tag", "Name", "Serial", "Status", "Location", "Assigned To",
         "Audit Status", "Last Audited", "Audited By", "Next Audit Due"],
        "simplegear-audit-compliance.csv",
    )


@router.get("/export/lifecycle")
async def export_lifecycle(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    """Warranty & EOL report for budgeting and replacement planning."""
    today = date.today()
    result = await session.execute(select(Asset).order_by(Asset.eol_date.nullslast(), Asset.asset_tag))
    rows = []
    for a in result.scalars().all():
        rows.append([
            a.asset_tag, a.name, a.serial or "",
            a.purchase_date.isoformat() if a.purchase_date else "",
            f"{a.purchase_price:.2f}" if a.purchase_price else "",
            a.warranty_expiry.isoformat() if a.warranty_expiry else "",
            (a.warranty_expiry - today).days if a.warranty_expiry else "",
            a.eol_date.isoformat() if a.eol_date else "",
            (a.eol_date - today).days if a.eol_date else "",
        ])
    return _csv_response(
        rows,
        ["Asset Tag", "Name", "Serial", "Purchase Date", "Purchase Cost",
         "Warranty Expiry", "Days To Warranty Expiry", "EOL Date", "Days To EOL"],
        "simplegear-lifecycle.csv",
    )


@router.get("/export/maintenance")
async def export_maintenance(session: AsyncSession = Depends(get_session), _=Depends(get_current_user)):
    result = await session.execute(
        select(AssetMaintenance).order_by(AssetMaintenance.created_at.desc())
    )
    records = result.scalars().all()
    assets_r = await session.execute(select(Asset))
    assets = {a.id: a for a in assets_r.scalars().all()}
    users_r = await session.execute(select(SystemUser))
    users = {u.id: u.name for u in users_r.scalars().all()}

    rows = []
    for m in records:
        asset = assets.get(m.asset_id)
        rows.append([
            asset.asset_tag if asset else "", asset.name if asset else "",
            m.maintenance_type, m.title,
            m.start_date.isoformat() if m.start_date else "",
            m.completed_date.isoformat() if m.completed_date else "Open",
            f"{m.cost:.2f}" if m.cost else "",
            m.provider or "",
            users.get(m.created_by_id, "") if m.created_by_id else "",
            m.notes or "",
        ])
    return _csv_response(
        rows,
        ["Asset Tag", "Asset", "Type", "Title", "Started", "Completed",
         "Cost", "Provider", "Logged By", "Notes"],
        "simplegear-maintenance.csv",
    )
