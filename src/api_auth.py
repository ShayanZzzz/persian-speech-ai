from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.api_keys import verify_api_key
from src.database import SessionLocal
from src.models import OrganizationAPIKey

api_key_bearer = HTTPBearer(
    scheme_name="Organization API Key",
    description="Enter your organization API key as the Bearer token.",
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(api_key_bearer),
    db: Session = Depends(get_db),
) -> OrganizationAPIKey:
    api_key = verify_api_key(db, credentials.credentials)

    if api_key is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid, revoked, or inactive API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return api_key
