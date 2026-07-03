"""
Audit log service — append-only writes.
Call write_audit() before committing so the audit entry and the
business change land in the same transaction.
"""
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog


def _jsonable(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def diff_fields(before: dict, after: dict) -> dict:
    """Return {field: {"from": old, "to": new}} for fields that changed."""
    changes = {}
    for key, new_value in after.items():
        old_value = before.get(key)
        if old_value != new_value:
            changes[key] = {"from": _jsonable(old_value), "to": _jsonable(new_value)}
    return changes


async def write_audit(
    session: AsyncSession,
    *,
    actor: Optional[dict],
    action: str,
    entity_type: str,
    entity_id: Optional[Any] = None,
    entity_label: Optional[str] = None,
    payload: Optional[dict] = None,
) -> None:
    """Queue an audit log entry in the current session. The caller commits."""
    entry = AuditLog(
        actor_id=actor["id"] if actor else None,
        actor_name=actor.get("name") or actor.get("email") if actor else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        entity_label=entity_label,
        payload=payload,
    )
    session.add(entry)
