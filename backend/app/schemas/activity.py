from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    actor_id: Optional[int]
    actor_name: Optional[str]
    action: str
    entity_type: str
    entity_id: Optional[str]
    entity_label: Optional[str]
    payload: Optional[Any]
    created_at: datetime


class AuditLogPage(BaseModel):
    items: list[AuditLogRead]
    total: int
    pages: int
