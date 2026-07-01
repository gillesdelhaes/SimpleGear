from typing import Optional
from sqlmodel import Field, SQLModel


class AssetCategory(SQLModel, table=True):
    __tablename__ = "asset_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str = Field(default="Hardware")
    eol_years: Optional[int] = None
    color: Optional[str] = None
