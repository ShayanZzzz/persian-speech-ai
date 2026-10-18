from src.api_keys import create_api_key, revoke_api_key
from src.models import Organization, OrganizationAPIKey
from pydantic import BaseModel, Field
import os
import tempfile
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from src.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    register_user,
)
from src.database import Base, SessionLocal, engine
from src.schemas import UserLogin, UserRegister
from src.models import (
    Organization,
    OrganizationAPIKey,
    TranscriptionHistory,
)
from src.inference import load_model, transcribe_audio
from src.media import convert_to_wav


# Create missing database tables.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Persian Speech AI")

STATIC_DIR = Path(__file__).parent / "static"

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)

bearer_scheme = HTTPBearer()

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".flac",
    ".ogg",
    ".webm",
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".mpeg",
    ".mpg",
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    try:
        return get_current_user(credentials.credentials, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


model = load_model("base")


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/register", status_code=201)
def register(
    payload: UserRegister,
    db: Session = Depends(get_db),
):
    try:
        user = register_user(
            db,
            email=payload.email.lower(),
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return {
        "id": user.id,
        "email": user.email,
        "created_at": user.created_at,
    }


@app.post("/login")
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    user = authenticate_user(
        db,
        email=payload.email.lower(),
        password=payload.password,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


@app.get("/me")
def get_me(current_user=Depends(require_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }


@app.get("/history")
def get_history(
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(TranscriptionHistory)
        .filter(TranscriptionHistory.user_id == current_user.id)
        .order_by(TranscriptionHistory.id.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": record.id,
            "filename": record.filename,
            "language": record.language,
            "text": record.text,
            "created_at": record.created_at,
        }
        for record in records
    ]


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    filename = file.filename or "upload"
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        await file.close()
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type.",
        )

    input_path = None
    wav_path = None
    total_size = 0

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as tmp:
            input_path = tmp.name

            while True:
                data = await file.read(1024 * 1024)

                if not data:
                    break

                total_size += len(data)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File is too large. Maximum size is 25 MB.",
                    )

                tmp.write(data)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        wav_path = input_path + ".wav"
        convert_to_wav(input_path, wav_path)

        result = transcribe_audio(model, wav_path)

        history = TranscriptionHistory(
            user_id=current_user.id,
            filename=filename,
            language=result["language"],
            text=result["text"],
        )

        db.add(history)
        db.commit()
        db.refresh(history)

        return {
            "filename": filename,
            "text": result["text"],
            "language": result["language"],
            "segments": result["segments"],
        }

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail="Audio processing service is not configured correctly.",
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed.",
        ) from exc

    finally:
        for path in (input_path, wav_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

        await file.close()

from pydantic import BaseModel, Field
from src.api_keys import create_api_key, revoke_api_key


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)


class APIKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@app.post("/organizations", status_code=201)
def create_organization(
    payload: OrganizationCreate,
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    organization = Organization(
        name=payload.name.strip(),
        owner_user_id=current_user.id,
    )
    db.add(organization)
    db.commit()
    db.refresh(organization)

    return {
        "id": organization.id,
        "name": organization.name,
        "is_active": organization.is_active,
        "created_at": organization.created_at,
    }


@app.get("/organizations")
def list_organizations(
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    organizations = (
        db.query(Organization)
        .filter(Organization.owner_user_id == current_user.id)
        .order_by(Organization.id.desc())
        .all()
    )

    return [
        {
            "id": org.id,
            "name": org.name,
            "is_active": org.is_active,
            "created_at": org.created_at,
        }
        for org in organizations
    ]


@app.post("/organizations/{organization_id}/api-keys", status_code=201)
def create_organization_api_key(
    organization_id: int,
    payload: APIKeyCreate,
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id == organization_id,
            Organization.owner_user_id == current_user.id,
        )
        .first()
    )

    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found.")

    try:
        api_key, full_key = create_api_key(
            db,
            organization,
            payload.name.strip(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "id": api_key.id,
        "organization_id": api_key.organization_id,
        "name": api_key.name,
        "key": full_key,
        "key_prefix": api_key.key_prefix,
        "created_at": api_key.created_at,
        "warning": "Copy this key now. It will not be shown again.",
    }


@app.get("/organizations/{organization_id}/api-keys")
def list_organization_api_keys(
    organization_id: int,
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id == organization_id,
            Organization.owner_user_id == current_user.id,
        )
        .first()
    )

    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found.")

    keys = (
        db.query(OrganizationAPIKey)
        .filter(OrganizationAPIKey.organization_id == organization_id)
        .order_by(OrganizationAPIKey.id.desc())
        .all()
    )

    return [
        {
            "id": key.id,
            "name": key.name,
            "key_prefix": key.key_prefix,
            "is_active": key.is_active,
            "created_at": key.created_at,
            "last_used_at": key.last_used_at,
        }
        for key in keys
    ]


@app.delete("/organizations/{organization_id}/api-keys/{key_id}")
def revoke_organization_api_key(
    organization_id: int,
    key_id: int,
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id == organization_id,
            Organization.owner_user_id == current_user.id,
        )
        .first()
    )

    if organization is None:
        raise HTTPException(status_code=404, detail="Organization not found.")

    api_key = (
        db.query(OrganizationAPIKey)
        .filter(
            OrganizationAPIKey.id == key_id,
            OrganizationAPIKey.organization_id == organization_id,
        )
        .first()
    )

    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found.")

    revoke_api_key(db, api_key)
    return {"status": "revoked", "key_id": key_id}


from pydantic import BaseModel, Field
from src.api_keys import create_api_key, revoke_api_key


# Organization API: authenticate with an organization API key.
from src.api_auth import require_api_key


@app.post("/api/v1/transcribe")
async def api_transcribe(
    file: UploadFile = File(...),
    api_key=Depends(require_api_key),
    db: Session = Depends(get_db),
):
    organization = (
        db.query(Organization)
        .filter(
            Organization.id == api_key.organization_id,
            Organization.is_active.is_(True),
        )
        .first()
    )

    if organization is None:
        raise HTTPException(
            status_code=401,
            detail="Organization is inactive or unavailable.",
        )

    filename = file.filename or "upload"
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        await file.close()
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type.",
        )

    input_path = None
    wav_path = None
    total_size = 0

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension,
        ) as tmp:
            input_path = tmp.name

            while True:
                data = await file.read(1024 * 1024)
                if not data:
                    break

                total_size += len(data)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File is too large. Maximum size is 25 MB.",
                    )

                tmp.write(data)

        if total_size == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty.",
            )

        wav_path = input_path + ".wav"
        convert_to_wav(input_path, wav_path)
        result = transcribe_audio(model, wav_path)

        history = TranscriptionHistory(
            user_id=organization.owner_user_id,
            organization_id=organization.id,
            filename=filename,
            language=result["language"],
            text=result["text"],
        )

        db.add(history)
        db.commit()

        return {
            "organization_id": organization.id,
            "filename": filename,
            "text": result["text"],
            "language": result["language"],
            "segments": result["segments"],
        }

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail="Audio processing service is not configured correctly.",
        ) from exc

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Audio processing failed.",
        ) from exc

    finally:
        for path in (input_path, wav_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

        await file.close()
