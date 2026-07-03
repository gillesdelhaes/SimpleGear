from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class MaintenanceCreate(BaseModel):
    maintenance_type: str = "repair"
    title: str
    notes: Optional[str] = None
    start_date: Optional[date] = None
    completed_date: Optional[date] = None
    cost: Optional[float] = None
    provider: Optional[str] = None


class MaintenanceUpdate(BaseModel):
    maintenance_type: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    start_date: Optional[date] = None
    completed_date: Optional[date] = None
    cost: Optional[float] = None
    provider: Optional[str] = None


class MaintenanceRead(BaseModel):
    id: int
    asset_id: int
    maintenance_type: str
    title: str
    notes: Optional[str]
    start_date: Optional[date]
    completed_date: Optional[date]
    cost: Optional[float]
    provider: Optional[str]
    created_by_id: Optional[int]
    created_by_name: Optional[str]
    created_at: Optional[datetime]
