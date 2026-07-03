from typing import Optional
from pydantic import BaseModel


class AssetModelRead(BaseModel):
    id: int
    name: str
    manufacturer: Optional[str]
    model_number: Optional[str]
    category_id: Optional[int]
    eol_years: Optional[int]
    notes: Optional[str]
    asset_count: int = 0
    assigned_count: int = 0


class AssetModelCreate(BaseModel):
    name: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    category_id: Optional[int] = None
    eol_years: Optional[int] = None
    notes: Optional[str] = None


class AssetModelUpdate(BaseModel):
    name: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    category_id: Optional[int] = None
    eol_years: Optional[int] = None
    notes: Optional[str] = None
