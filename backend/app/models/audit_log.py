from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    """Append-only audit trail. No update or delete API exists for this table."""

    __tablename__ = "audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    # Null = system action
    actor_id: Optional[int] = Field(default=None, foreign_key="system_users.id", index=True)
    actor_name: Optional[str] = None
    action: str = Field(index=True)  # e.g. "asset.created", "asset.assigned"
    entity_type: str = Field(index=True)  # e.g. "asset", "person", "user"
    entity_id: Optional[str] = Field(default=None, index=True)
    entity_label: Optional[str] = None  # human-readable label at the time of the action
    # Arbitrary JSON payload (field changes, metadata)
    payload: Optional[Any] = Field(default=None, sa_column=Column(JSON, nullable=True))
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
