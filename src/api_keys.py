import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from src.models import Organization, OrganizationAPIKey


API_KEY_PREFIX = "psai_live_"


def generate_api_key() -> tuple[str, str, str]:
    secret = secrets.token_urlsafe(32)
    full_key = f"{API_KEY_PREFIX}{secret}"
    key_prefix = full_key[:24]
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, key_prefix, key_hash


def create_api_key(
    db: Session,
    organization: Organization,
    name: str,
) -> tuple[OrganizationAPIKey, str]:
    if not organization.is_active:
        raise ValueError("Organization is inactive.")

    full_key, key_prefix, key_hash = generate_api_key()

    api_key = OrganizationAPIKey(
        organization_id=organization.id,
        name=name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        is_active=True,
    )

    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return api_key, full_key


def verify_api_key(
    db: Session,
    full_key: str,
) -> OrganizationAPIKey | None:
    if not full_key.startswith(API_KEY_PREFIX):
        return None

    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()

    api_key = (
        db.query(OrganizationAPIKey)
        .filter(
            OrganizationAPIKey.key_hash == key_hash,
            OrganizationAPIKey.is_active.is_(True),
        )
        .first()
    )

    if api_key is None:
        return None

    organization = (
        db.query(Organization)
        .filter(
            Organization.id == api_key.organization_id,
            Organization.is_active.is_(True),
        )
        .first()
    )

    if organization is None:
        return None

    api_key.last_used_at = datetime.now(timezone.utc)
    db.commit()

    return api_key


def revoke_api_key(
    db: Session,
    api_key: OrganizationAPIKey,
) -> None:
    api_key.is_active = False
    db.commit()
