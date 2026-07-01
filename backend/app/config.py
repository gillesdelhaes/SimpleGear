from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/simplegear"
    app_secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
