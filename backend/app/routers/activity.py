import csv
import io
import json
import math
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.auth.deps import require_admin
from app.database import get_session
from app.models import AuditLog
from app.schemas.activity import AuditLogPage, AuditLogRead

router = APIRouter(prefix="/activity", tags=["activity"])


def _to_read(entry: AuditLog) -> AuditLogRead:
    return AuditLogRead(
        id=entry.id,
        actor_id=entry.actor_id,
        actor_name=entry.actor_name,
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        entity_label=entry.entity_label,
        payload=entry.payload,
        created_at=entry.created_at,
    )


def _filtered_query(q: Optional[str], entity_type: Optional[str], action: Optional[str]):
    query = select(AuditLog)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if action:
        query = query.where(AuditLog.action.ilike(f"{action}%"))
    if q:
        term = f"%{q}%"
        query = query.where(
            AuditLog.entity_label.ilike(term)
            | AuditLog.actor_name.ilike(term)
            | AuditLog.action.ilike(term)
        )
    return query


@router.get("", response_model=AuditLogPage)
async def list_activity(
    q: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    page: int = 1,
    per_page: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    base_query = _filtered_query(q, entity_type, action)

    count_result = await session.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar_one()

    result = await session.execute(
        base_query.order_by(AuditLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )
    items = [_to_read(e) for e in result.scalars().all()]
    return AuditLogPage(items=items, total=total, pages=max(1, math.ceil(total / per_page)))


@router.get("/export")
async def export_activity(
    q: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    _=Depends(require_admin),
):
    result = await session.execute(
        _filtered_query(q, entity_type, action).order_by(AuditLog.created_at.desc())
    )
    entries = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp (UTC)", "Actor", "Action", "Entity Type", "Entity ID", "Entity", "Details"])
    for e in entries:
        writer.writerow([
            e.created_at.isoformat() if e.created_at else "",
            e.actor_name or "system",
            e.action,
            e.entity_type,
            e.entity_id or "",
            e.entity_label or "",
            json.dumps(e.payload) if e.payload else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=simplegear-audit-log.csv"},
    )
