from fastapi import FastAPI, UploadFile, File, HTTPException
import whisper
import tempfile
import os

app = FastAPI(title="Farsi Speech AI")

model = whisper.load_model("base")


@app.get("/")
def home():
    return {"message": "Farsi Speech AI is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[1] or ".audio"
    path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            path = tmp.name
            while chunk := await file.read(1024 * 1024):
                tmp.write(chunk)

        result = model.transcribe(path, fp16=False)

        return {
            "filename": file.filename,
            "text": result["text"].strip(),
            "language": result["language"]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if path and os.path.exists(path):
            os.remove(path)
