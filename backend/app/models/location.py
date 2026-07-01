from typing import Optional
from sqlmodel import Field, SQLModel


class Location(SQLModel, table=True):
    __tablename__ = "locations"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    address: Optional[str] = None
    parent_id: Optional[int] = Field(default=None, foreign_key="locations.id")
