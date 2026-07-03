from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class StatusCount(BaseModel):
    status_id: int
    name: str
    color: str
    count: int


class CategoryCount(BaseModel):
    category_id: int
    name: str
    count: int


class DashboardStats(BaseModel):
    total: int
    assigned_count: int
    unassigned_count: int
    total_value: Optional[float]
    audits_overdue: int
    audits_never: int
    by_status: list[StatusCount]
    by_category: list[CategoryCount]


class Alert(BaseModel):
    type: Literal["eol", "warranty", "audit"]
    asset_id: int
    asset_name: str
    asset_tag: str
    date: str
    days_remaining: int


class ActivityItem(BaseModel):
    type: Literal["assigned", "released"]
    assignment_id: int
    asset_id: int
    asset_name: str
    person_id: int
    person_name: str
    note: Optional[str]
    occurred_at: Optional[datetime]
