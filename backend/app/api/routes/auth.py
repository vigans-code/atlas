import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    Principal,
    create_access_token,
    hash_password,
    require_principal,
    verify_password,
)
from app.core.config import settings
from app.db.session import get_db
from app.models.user import AuthSession, User
from app.schemas.auth import (
    AuthSessionRead,
    LoginRequest,
    RegisterRequest,
    SessionResponse,
    UserRead,
)

router = APIRouter()


@router.post("/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    user = User(
        email=payload.email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "account_exists", "message": "An account already exists"},
        ) from exc
    return await _issue_session(user, request, db)


@router.post("/login", response_model=SessionResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    await _enforce_login_rate_limit(request, payload.email)
    user = await db.scalar(select(User).where(User.email == payload.email))
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "Email or password is incorrect"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _issue_session(user, request, db)


@router.get("/me", response_model=UserRead)
async def me(
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await db.get_one(User, principal.user_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> Response:
    if principal.session_id is not None:
        session = await db.get(AuthSession, principal.session_id)
        if session is not None:
            session.revoked_at = datetime.now(UTC)
            await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/sessions", response_model=list[AuthSessionRead])
async def list_sessions(
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> list[AuthSessionRead]:
    sessions = (
        await db.scalars(
            select(AuthSession)
            .where(AuthSession.user_id == principal.user_id, AuthSession.revoked_at.is_(None))
            .order_by(AuthSession.created_at.desc())
        )
    ).all()
    return [
        AuthSessionRead.model_validate(session).model_copy(
            update={"current": session.id == principal.session_id}
        )
        for session in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: uuid.UUID,
    principal: Principal = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
) -> Response:
    session = await db.get(AuthSession, session_id)
    if session is None or session.user_id != principal.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session.revoked_at = datetime.now(UTC)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _issue_session(user: User, request: Request, db: AsyncSession) -> SessionResponse:
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=settings.access_token_ttl_seconds)
    session = AuthSession(
        user_id=user.id,
        expires_at=expires_at,
        user_agent=request.headers.get("user-agent", "")[:512] or None,
    )
    db.add(session)
    await db.flush()
    token = create_access_token(user.id, session_id=session.id)
    await db.commit()
    await db.refresh(user)
    return SessionResponse(
        access_token=token,
        expires_at=expires_at,
        user=UserRead.model_validate(user),
    )


async def _enforce_login_rate_limit(request: Request, email: str) -> None:
    if settings.environment != "production":
        return
    address = request.client.host if request.client else "unknown"
    identity = hashlib.sha256(f"{address}:{email}".encode()).hexdigest()
    key = f"atlas:auth:login:{identity}"
    cache = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        attempts = await cache.incr(key)
        if attempts == 1:
            await cache.expire(key, 300)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "auth_unavailable",
                "message": "Authentication is temporarily unavailable",
            },
        ) from exc
    finally:
        await cache.aclose()
    if attempts > 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"code": "rate_limited", "message": "Try again later"},
            headers={"Retry-After": "300"},
        )
