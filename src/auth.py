import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import User

load_dotenv()

password_hash = PasswordHash.recommended()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def register_user(db: Session, email: str, password: str) -> User:
    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise ValueError("Email is already registered")

    user = User(
        email=email,
        hashed_password=password_hash.hash(password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def authenticate_user(db: Session, email: str, password: str):
    user = db.scalar(select(User).where(User.email == email))

    if user is None:
        return None

    if not password_hash.verify(password, user.hashed_password):
        return None

    return user


def create_access_token(user_id: int) -> str:
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not set in .env")

    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str, db: Session) -> User:
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY is not set in .env")

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid or expired token") from exc

    user = db.get(User, user_id)

    if user is None:
        raise ValueError("User not found")

    return user
