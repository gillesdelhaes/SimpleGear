from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class LocationRead(BaseModel):
    id: int
    name: str
    address: Optional[str]
    parent_id: Optional[int]


class LocationTree(BaseModel):
    id: int
    name: str
    address: Optional[str]
    parent_id: Optional[int]
    children: list[LocationTree] = []

    model_config = {"from_attributes": True}


class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    parent_id: Optional[int] = None


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    parent_id: Optional[int] = None
