from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PersonRead(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    department: Optional[str]
    employee_id: Optional[str]
    location_id: Optional[int]
    location_name: Optional[str]
    notes: Optional[str]
    is_active: bool
    created_at: Optional[datetime]
    asset_count: int = 0


class PersonCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    location_id: Optional[int] = None
    notes: Optional[str] = None


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    location_id: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
