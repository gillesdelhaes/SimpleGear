from typing import Optional
from sqlmodel import Field, SQLModel


class AssetStatus(SQLModel, table=True):
    __tablename__ = "asset_statuses"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    color: str = Field(default="#6B7280")
    is_deployable: bool = Field(default=True)
    sort_order: int = Field(default=0)
