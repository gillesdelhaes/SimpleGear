from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class SystemUser(SQLModel, table=True):
    __tablename__ = "system_users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    password_hash: str
    role: str = Field(default="viewer")
    is_active: bool = Field(default=True)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None
