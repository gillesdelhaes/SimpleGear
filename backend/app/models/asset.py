from datetime import date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Asset(SQLModel, table=True):
    __tablename__ = "assets"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    asset_tag: str = Field(unique=True, index=True)
    serial: Optional[str] = Field(default=None, index=True)
    asset_model_id: Optional[int] = Field(default=None, foreign_key="asset_models.id")
    make: Optional[str] = None
    model: Optional[str] = None
    model_number: Optional[str] = None
    category_id: Optional[int] = Field(default=None, foreign_key="asset_categories.id")
    location_id: Optional[int] = Field(default=None, foreign_key="locations.id")
    status_id: int = Field(foreign_key="asset_statuses.id")
    assigned_to_id: Optional[int] = Field(default=None, foreign_key="people.id", index=True)
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_months: Optional[int] = None
    warranty_expiry: Optional[date] = None
    eol_date: Optional[date] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None
    last_audit_at: Optional[datetime] = None
    last_audit_by_id: Optional[int] = Field(default=None, foreign_key="system_users.id")
    next_audit_date: Optional[date] = Field(default=None, index=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
