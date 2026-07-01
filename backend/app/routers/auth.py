from collections import defaultdict
from datetime import datetime, timezone
from time import monotonic

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.deps import get_current_user
from app.auth.jwt import create_access_token
from app.database import get_session
from app.models import SystemUser
from app.schemas.auth import LoginRequest, TokenResponse, UserRead
from app.services.passwords import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_attempts: dict[str, list[float]] = defaultdict(list)
_LIMIT = 10
_WINDOW = 60.0


def _client_ip(request: Request) -> str:
    return request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown")


def _check_rate_limit(ip: str) -> None:
    now = monotonic()
    _attempts[ip] = [t for t in _attempts[ip] if now - t < _WINDOW]
    if len(_attempts[ip]) >= _LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts — please wait a minute.",
        )
    _attempts[ip].append(now)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    _check_rate_limit(_client_ip(request))

    result = await session.execute(
        select(SystemUser).where(SystemUser.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    _invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None or not verify_password(body.password, user.password_hash):
        raise _invalid
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await session.commit()

    return TokenResponse(
        access_token=create_access_token(user.id, user.email, user.role, user.name)
    )


@router.get("/me", response_model=UserRead)
async def me(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserRead:
    result = await session.execute(
        select(SystemUser).where(SystemUser.id == current_user["id"])
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserRead(id=user.id, email=user.email, name=user.name, role=user.role, is_active=user.is_active)
