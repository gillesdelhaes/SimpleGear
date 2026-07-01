from typing import Optional
from pydantic import BaseModel


class StatusRead(BaseModel):
    id: int
    name: str
    color: str
    is_deployable: bool
    sort_order: int


class StatusCreate(BaseModel):
    name: str
    color: str = "#6B7280"
    is_deployable: bool = True
    sort_order: int = 0


class StatusUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_deployable: Optional[bool] = None
    sort_order: Optional[int] = None
