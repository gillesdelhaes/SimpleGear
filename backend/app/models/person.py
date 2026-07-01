from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Person(SQLModel, table=True):
    __tablename__ = "people"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    location_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    notes: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
