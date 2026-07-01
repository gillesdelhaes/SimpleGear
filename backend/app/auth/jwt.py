from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from app.config import settings


def create_access_token(user_id: int, email: str, role: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "name": name,
        "exp": expire,
    }
    return jwt.encode(payload, settings.app_secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.app_secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return {}
