import base64
import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import AuthSession, User

_bearer = HTTPBearer(auto_error=False)
_audience = "atlas-api"
_password_hash = PasswordHash.recommended()
_dummy_password_hash = _password_hash.hash("atlas-login-timing-placeholder")


@dataclass(frozen=True, slots=True)
class Principal:
    user_id: uuid.UUID
    session_id: uuid.UUID | None = None


def create_access_token(
    user_id: uuid.UUID,
    ttl_seconds: int | None = None,
    session_id: uuid.UUID | None = None,
) -> str:
    """Create a short-lived signed token, optionally bound to a revocable session."""

    now = int(time.time())
    ttl = ttl_seconds if ttl_seconds is not None else settings.access_token_ttl_seconds
    if ttl < 1 or ttl > settings.access_token_ttl_seconds:
        raise ValueError("Token lifetime is outside the configured limit.")
    payload = {
        "aud": _audience,
        "exp": now + ttl,
        "iat": now,
        "sub": str(user_id),
    }
    if session_id is not None:
        payload["sid"] = str(session_id)
    encoded = _encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = _sign(encoded.encode())
    return f"{encoded}.{signature}"


def decode_access_token(token: str) -> Principal:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected_signature = _sign(encoded.encode())
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError
        payload = json.loads(_decode(encoded))
        now = int(time.time())
        issued_at = int(payload.get("iat", 0))
        expires_at = int(payload.get("exp", 0))
        if (
            payload.get("aud") != _audience
            or expires_at <= now
            or issued_at > now + 60
            or expires_at - issued_at > settings.access_token_ttl_seconds
        ):
            raise ValueError
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"]) if payload.get("sid") else None
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise InvalidAccessTokenError from exc
    return Principal(user_id=user_id, session_id=session_id)


async def require_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> Principal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _authentication_error()
    try:
        principal = decode_access_token(credentials.credentials)
    except InvalidAccessTokenError as exc:
        raise _authentication_error() from exc
    user = await db.get(User, principal.user_id)
    if user is None or not user.is_active:
        raise _authentication_error()
    if principal.session_id is not None:
        session = await db.get(AuthSession, principal.session_id)
        now = datetime.now(UTC)
        if (
            session is None
            or session.user_id != principal.user_id
            or session.revoked_at is not None
            or _as_utc(session.expires_at) <= now
        ):
            raise _authentication_error()
        session.last_used_at = now
        await db.commit()
    return principal


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    valid = _password_hash.verify(password, password_hash or _dummy_password_hash)
    return bool(password_hash) and valid


class InvalidAccessTokenError(ValueError):
    pass


def _sign(payload: bytes) -> str:
    digest = hmac.new(settings.secret_key.encode(), payload, hashlib.sha256).digest()
    return _encode(digest)


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _authentication_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
