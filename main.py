import hashlib
import json
import secrets
from src.api_keys import create_api_key, revoke_api_key
from src.models import Organization, OrganizationAPIKey
from pydantic import BaseModel, Field
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
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
from src.schemas import UserLogin, UserRegister, OrganizationCreate, APIKeyCreate
from src.models import (
    Organization,
    OrganizationAPIKey,
    TranscriptionHistory,
    GuestUsage,
    MediaFile,
)
from src.inference import load_model, transcribe_audio
from src.media import convert_to_wav, get_media_duration


app = FastAPI(title="Persian Speech AI")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


STATIC_DIR = Path(__file__).parent / "static"
AUDIO_STORAGE_DIR = Path(__file__).parent / "media_uploads"

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static",
)

bearer_scheme = HTTPBearer()
optional_bearer_scheme = HTTPBearer(auto_error=False)

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


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None:
        return None
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
@limiter.limit("5/minute")
def register(
    request: Request,
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
@limiter.limit("5/minute")
def login(
    request: Request,
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
            "public_id": str(record.media_file.public_id) if record.media_file else None,
            "filename": record.filename,
            "language": record.language,
            "text": record.text,
            "duration_seconds": record.duration_seconds,
            "mode": record.mode,
            "segments": json.loads(record.segments) if record.segments else [],
            "created_at": record.created_at,
        }
        for record in records
    ]



@app.get("/transcript/{public_id}/{slug}")
def get_transcript(
    public_id: int,
    slug: str,
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    media_file = (
        db.query(MediaFile)
        .filter(
            MediaFile.public_id == public_id,
            MediaFile.user_id == current_user.id,
        )
        .first()
    )

    if media_file is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    record = (
        db.query(TranscriptionHistory)
        .filter(
            TranscriptionHistory.media_file_id == media_file.id,
            TranscriptionHistory.user_id == current_user.id,
        )
        .order_by(TranscriptionHistory.id.desc())
        .first()
    )

    if record is None:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return {
        "public_id": str(media_file.public_id),
        "filename": record.filename,
        "language": record.language,
        "text": record.text,
        "duration_seconds": record.duration_seconds,
        "mode": record.mode,
        "segments": json.loads(record.segments) if record.segments else [],
        "created_at": record.created_at,
    }



@app.post("/transcribe")
async def transcribe(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    current_user=Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    filename = file.filename or "upload"
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        await file.close()
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    guest_usage = None

    if current_user is None:
        raw_token = request.cookies.get("guest_token") if request else None
        new_cookie = not raw_token

        if not raw_token:
            raw_token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        guest_usage = db.query(GuestUsage).filter_by(
            token_hash=token_hash
        ).first()

        if guest_usage is None:
            guest_usage = GuestUsage(token_hash=token_hash, files_used=0)
            db.add(guest_usage)
            db.commit()
            db.refresh(guest_usage)

        if new_cookie and response is not None:
            response.set_cookie(
                key="guest_token",
                value=raw_token,
                httponly=True,
                samesite="lax",
                secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
                max_age=60 * 60 * 24 * 365,
            )

        if guest_usage.files_used >= 3:
            await file.close()
            raise HTTPException(
                status_code=429,
                detail="You've used all 3 free files. Register to continue.",
            )

    input_path = None
    wav_path = None
    stored_path = None
    transaction_committed = False
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

        duration_seconds = get_media_duration(input_path)
        wav_path = input_path + ".wav"
        convert_to_wav(input_path, wav_path)
        result = transcribe_audio(model, wav_path)

        if current_user is not None:
            AUDIO_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
            stored_path = AUDIO_STORAGE_DIR / f"{uuid.uuid4().hex}{extension}"
            shutil.copy2(input_path, stored_path)
            relative_storage_path = str(stored_path.relative_to(Path(__file__).parent))

            media_file = MediaFile(
                public_id=secrets.randbelow(9_000_000_000_000_000_000) + 1,
                user_id=current_user.id,
                filename=filename,
                media_type=file.content_type or extension.lstrip("."),
                file_size_bytes=total_size,
                storage_path=relative_storage_path,
                detected_language=result["language"],
            )
            db.add(media_file)
            db.flush()

            history = TranscriptionHistory(
                user_id=current_user.id,
                media_file_id=media_file.id,
                filename=filename,
                language=result["language"],
                text=result["text"],
                duration_seconds=duration_seconds,
                mode="whisper-base",
                segments=json.dumps(result["segments"], ensure_ascii=False),
            )
            db.add(history)
        else:
            guest_usage.files_used += 1

        db.commit()
        transaction_committed = True

        return {
            "filename": filename,
            **({"public_id": str(media_file.public_id)} if current_user is not None else {}),
            "text": result["text"],
            "language": result["language"],
            "segments": result["segments"],
            "duration_seconds": duration_seconds,
            "mode": "whisper-base",
            **(
                {"files_remaining": max(0, 3 - guest_usage.files_used)}
                if guest_usage is not None
                else {}
            ),
        }

    except HTTPException:
        db.rollback()
        raise
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        db.rollback()
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
        if stored_path is not None and not transaction_committed:
            try:
                stored_path.unlink(missing_ok=True)
            except OSError:
                pass

        for temp_path in (input_path, wav_path):
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
        await file.close()


@app.post("/export-video")
@limiter.limit("5/minute")
async def export_video(
    request: Request,
    file: UploadFile = File(...),
    subtitles_json: str = Form(...),
    style_json: str = Form(...),
):
    """Render subtitles permanently into an uploaded video and return an MP4."""
    video_extensions = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".mpeg", ".mpg"}
    extension = Path(file.filename or "video.mp4").suffix.lower()

    if extension not in video_extensions:
        await file.close()
        raise HTTPException(status_code=400, detail="Unsupported video format.")

    try:
        subtitles = json.loads(subtitles_json)
        style = json.loads(style_json)
    except (json.JSONDecodeError, TypeError):
        await file.close()
        raise HTTPException(status_code=400, detail="Invalid subtitle or style data.")

    if not isinstance(subtitles, list) or len(subtitles) > 500:
        await file.close()
        raise HTTPException(status_code=400, detail="Subtitle list is invalid.")

    if not isinstance(style, dict):
        await file.close()
        raise HTTPException(status_code=400, detail="Subtitle style is invalid.")

    try:
        font_size = int(style.get("fontSize", 28))
        if not 14 <= font_size <= 56:
            raise ValueError
    except (ValueError, TypeError):
        await file.close()
        raise HTTPException(status_code=400, detail="Invalid subtitle font size.")

    def ass_color(value, alpha="00"):
        import re
        if not isinstance(value, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("Invalid color")
        red, green, blue = value[1:3], value[3:5], value[5:7]
        return f"&H{alpha}{blue}{green}{red}".upper()

    def ass_time(value):
        centiseconds = round(float(value) * 100)
        hours, remainder = divmod(centiseconds, 360000)
        minutes, remainder = divmod(remainder, 6000)
        seconds, fraction = divmod(remainder, 100)
        return f"{hours}:{minutes:02}:{seconds:02}.{fraction:02}"

    def ass_text(value):
        return (
            str(value)
            .replace("\\", r"\\")
            .replace("{", r"\{")
            .replace("}", r"\}")
            .replace("\r\n", r"\N")
            .replace("\n", r"\N")
            .replace("\r", r"\N")
        )

    try:
        primary_color = ass_color(style.get("fontColor", "#ffffff"))
        background_color = ass_color(style.get("backgroundColor", "#000000"), alpha="44")
    except ValueError:
        await file.close()
        raise HTTPException(status_code=400, detail="Invalid subtitle color.")

    family = style.get("fontFamily", "Vazirmatn")
    font_names = {
        "Vazirmatn": "Vazirmatn UI",
        "Arial": "Arial",
        "Tahoma": "Tahoma",
        "sans-serif": "Arial",
    }
    font_name = font_names.get(family, "Vazirmatn UI")

    position = style.get("position", "bottom")
    alignment = {"bottom": 2, "middle": 5, "top": 8}.get(position)
    if alignment is None:
        await file.close()
        raise HTTPException(status_code=400, detail="Invalid subtitle position.")

    temp_dir = Path(tempfile.mkdtemp(prefix="persian-speech-export-"))
    input_path = temp_dir / f"input{extension}"
    subtitle_path = temp_dir / "subtitles.ass"
    output_path = temp_dir / "output.mp4"
    total_size = 0

    try:
        with input_path.open("wb") as output_file:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Video is too large. Maximum size is 25 MB.",
                    )
                output_file.write(chunk)

        if total_size == 0:
            raise HTTPException(status_code=400, detail="The uploaded video is empty.")

        events = []
        for item in subtitles:
            if not isinstance(item, dict):
                raise HTTPException(status_code=400, detail="Invalid subtitle entry.")
            try:
                start = float(item["start"])
                end = float(item["end"])
                text = str(item.get("text", ""))
            except (KeyError, TypeError, ValueError):
                raise HTTPException(status_code=400, detail="Invalid subtitle timing.")
            import math
            if (
                not math.isfinite(start)
                or not math.isfinite(end)
                or start < 0
                or end <= start
                or len(text) > 2000
            ):
                raise HTTPException(status_code=400, detail="Invalid subtitle timing or text.")
            if text.strip():
                events.append(
                    f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Default,,0,0,0,,{ass_text(text)}"
                )

        if not events:
            raise HTTPException(status_code=400, detail="Add at least one non-empty subtitle.")

        ass_content = (
            "[Script Info]\n"
            "ScriptType: v4.00+\n"
            "PlayResX: 1920\n"
            "PlayResY: 1080\n"
            "WrapStyle: 2\n"
            "ScaledBorderAndShadow: yes\n\n"
            "[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
            "OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, "
            "Alignment, MarginL, MarginR, MarginV, Encoding\n"
            f"Style: Default,{font_name},{font_size},{primary_color},&H000000FF,"
            f"&H00000000,{background_color},0,0,3,0,0,{alignment},40,40,30,1\n\n"
            "[Events]\n"
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
            + "\n".join(events)
            + "\n"
        )
        subtitle_path.write_text(ass_content, encoding="utf-8")

        bundled_ffmpeg = Path("/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg")
        ffmpeg_path = (
            os.getenv("FFMPEG_PATH")
            or (str(bundled_ffmpeg) if bundled_ffmpeg.is_file() else shutil.which("ffmpeg"))
        )
        if not ffmpeg_path:
            raise HTTPException(status_code=503, detail="FFmpeg is not installed.")

        font_dir = (
            Path(__file__).parent
            / "frontend/node_modules/vazirmatn/misc/UI/fonts/ttf"
        )

        def filter_escape(value):
            return (
                str(value)
                .replace("\\", r"\\")
                .replace(":", r"\:")
                .replace("'", r"\'")
                .replace(",", r"\,")
                .replace("[", r"\[")
                .replace("]", r"\]")
                .replace(" ", r"\ ")
            )

        video_filter = f"ass={filter_escape(subtitle_path)}"
        if font_dir.is_dir():
            video_filter += f":fontsdir={filter_escape(font_dir)}"

        try:
            result = subprocess.run(
                [
                    ffmpeg_path, "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(input_path),
                    "-vf", video_filter,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                    "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart",
                    str(output_path),
                ],
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=504, detail="Video export timed out.") from exc

        if result.returncode != 0 or not output_path.is_file() or output_path.stat().st_size == 0:
            raise HTTPException(
                status_code=500,
                detail="Video export failed. Check FFmpeg and subtitle font support.",
            )

        download_name = Path(file.filename or "video").stem
        import re
        download_name = re.sub(r"[^A-Za-z0-9._-]+", "_", download_name).strip("._") or "video"
        return FileResponse(
            path=str(output_path),
            media_type="video/mp4",
            filename=f"{download_name}-subtitled.mp4",
            background=BackgroundTask(shutil.rmtree, str(temp_dir), ignore_errors=True),
        )

    except HTTPException:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Video export failed.") from exc
    finally:
        await file.close()


@app.get("/media/{public_id}/audio")
def get_media_audio(
    public_id: int,
    current_user=Depends(require_current_user),
    db: Session = Depends(get_db),
):
    media_file = (
        db.query(MediaFile)
        .filter(
            MediaFile.public_id == public_id,
            MediaFile.user_id == current_user.id,
        )
        .first()
    )

    if media_file is None or not media_file.storage_path:
        raise HTTPException(status_code=404, detail="Audio file not found.")

    storage_root = AUDIO_STORAGE_DIR.resolve()
    audio_path = (Path(__file__).parent / media_file.storage_path).resolve()

    if not audio_path.is_relative_to(storage_root) or not audio_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found.")

    media_type = media_file.media_type
    if not media_type or "/" not in media_type:
        media_type = None

    return FileResponse(
        path=audio_path,
        media_type=media_type,
        filename=media_file.filename,
    )


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

        media_file = MediaFile(
            public_id=secrets.randbelow(9_000_000_000_000_000_000) + 1,
            user_id=organization.owner_user_id,
            filename=filename,
            media_type=file.content_type or extension.lstrip("."),
            file_size_bytes=total_size,
            detected_language=result["language"],
        )
        db.add(media_file)
        db.flush()

        history = TranscriptionHistory(
            user_id=organization.owner_user_id,
            organization_id=organization.id,
            media_file_id=media_file.id,
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
