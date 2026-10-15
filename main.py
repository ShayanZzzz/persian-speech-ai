import os
import tempfile

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from src.auth import register_user
from src.database import SessionLocal
from src.schemas import UserRegister

from src.inference import load_model, transcribe_audio
from src.media import convert_to_wav

app = FastAPI(title="Persian Speech AI")

model = load_model("base")

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm",
    ".mp4", ".mkv", ".mov", ".avi", ".mpeg", ".mpg",
}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/register", status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    try:
        user = register_user(
            db,
            email=payload.email.lower(),
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "id": user.id,
        "email": user.email,
        "created_at": user.created_at,
    }


@app.get("/")
def home():
    return {"message": "Persian Speech AI is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
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
