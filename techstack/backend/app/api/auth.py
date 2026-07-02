"""
MemWault Authentication Utilities
JWT token creation and verification, password hashing.
"""

import uuid
import bcrypt
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: uuid.UUID, username: str) -> str:
    """
    Create a JWT access token with user_id and username claims.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )

    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """
    Decode and verify a JWT access token.
    Returns the payload dict or None if invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        return None
