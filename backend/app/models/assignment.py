from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Assignment(SQLModel, table=True):
    __tablename__ = "assignments"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    person_id: int = Field(foreign_key="people.id")
    assigned_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    released_at: Optional[datetime] = Field(default=None, index=True)
    note: Optional[str] = None
    assigned_by_id: Optional[int] = Field(default=None, foreign_key="system_users.id")
