from sqlalchemy import select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from src.models import User

password_hash = PasswordHash.recommended()


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
