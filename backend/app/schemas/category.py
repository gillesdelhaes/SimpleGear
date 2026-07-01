from typing import Optional
from pydantic import BaseModel


class CategoryRead(BaseModel):
    id: int
    name: str
    type: str
    eol_years: Optional[int]
    color: Optional[str]


class CategoryCreate(BaseModel):
    name: str
    type: str = "Hardware"
    eol_years: Optional[int] = None
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    eol_years: Optional[int] = None
    color: Optional[str] = None
