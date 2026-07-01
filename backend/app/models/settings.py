from typing import Optional
from sqlmodel import Field, SQLModel


class AppSetting(SQLModel, table=True):
    __tablename__ = "app_settings"

    key: str = Field(primary_key=True)
    value: Optional[str] = None
