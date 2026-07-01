from typing import Optional
from sqlmodel import Field, SQLModel


class AssetModel(SQLModel, table=True):
    __tablename__ = "asset_models"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    category_id: Optional[int] = Field(default=None, foreign_key="asset_categories.id")
    eol_years: Optional[int] = None
    notes: Optional[str] = None
