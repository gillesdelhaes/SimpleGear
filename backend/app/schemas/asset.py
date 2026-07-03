from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.status import StatusRead
from app.schemas.category import CategoryRead
from app.schemas.location import LocationRead
from app.schemas.asset_model import AssetModelRead


class PersonBrief(BaseModel):
    id: int
    name: str
    department: Optional[str]
    email: Optional[str]


class AssetRead(BaseModel):
    id: int
    name: str
    asset_tag: str
    serial: Optional[str]
    asset_model_id: Optional[int]
    asset_model: Optional[AssetModelRead]
    make: Optional[str]
    model: Optional[str]
    model_number: Optional[str]
    category_id: Optional[int]
    location_id: Optional[int]
    status_id: int
    assigned_to_id: Optional[int]
    purchase_date: Optional[date]
    purchase_price: Optional[float]
    warranty_months: Optional[int]
    warranty_expiry: Optional[date]
    eol_date: Optional[date]
    supplier: Optional[str]
    notes: Optional[str]
    last_audit_at: Optional[datetime]
    last_audit_by_name: Optional[str]
    next_audit_date: Optional[date]
    days_to_next_audit: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    status: StatusRead
    category: Optional[CategoryRead]
    location: Optional[LocationRead]
    assigned_to: Optional[PersonBrief]
    days_to_eol: Optional[int]
    days_to_warranty_expiry: Optional[int]


class AssetCreate(BaseModel):
    name: str
    asset_tag: Optional[str] = None  # blank = auto-generated from the configured prefix
    serial: Optional[str] = None
    asset_model_id: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    model_number: Optional[str] = None
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    status_id: int
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_months: Optional[int] = None
    warranty_expiry: Optional[date] = None
    eol_date: Optional[date] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_tag: Optional[str] = None
    serial: Optional[str] = None
    asset_model_id: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    model_number: Optional[str] = None
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    status_id: Optional[int] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_months: Optional[int] = None
    warranty_expiry: Optional[date] = None
    eol_date: Optional[date] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


class AssignRequest(BaseModel):
    person_id: int
    note: Optional[str] = None


class ReleaseRequest(BaseModel):
    note: Optional[str] = None
    new_status_id: Optional[int] = None


class AuditRequest(BaseModel):
    note: Optional[str] = None
    location_id: Optional[int] = None  # confirm/correct the asset's location during audit
    next_audit_date: Optional[date] = None  # override the default interval


class BulkRequest(BaseModel):
    ids: list[int]
    action: str  # assign | release | status | location | delete | audit
    person_id: Optional[int] = None
    status_id: Optional[int] = None
    location_id: Optional[int] = None
    note: Optional[str] = None


class AssignmentRead(BaseModel):
    id: int
    asset_id: int
    asset_name: str
    person_id: int
    person_name: str
    assigned_at: Optional[datetime]
    released_at: Optional[datetime]
    note: Optional[str]
    assigned_by_name: Optional[str]


class ImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: int
    rows: list[dict]
