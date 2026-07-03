from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AssetMaintenance(SQLModel, table=True):
    __tablename__ = "asset_maintenances"

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: int = Field(foreign_key="assets.id", index=True)
    maintenance_type: str = Field(default="repair")  # repair | upgrade | preventive | other
    title: str
    notes: Optional[str] = None
    start_date: Optional[date] = None
    completed_date: Optional[date] = None
    cost: Optional[float] = None
    provider: Optional[str] = None
    created_by_id: Optional[int] = Field(default=None, foreign_key="system_users.id")
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
