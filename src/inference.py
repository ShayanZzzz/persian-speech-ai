
import whisper


def load_model(model_name: str = "base"):
    """Load a Whisper model."""
    return whisper.load_model(model_name)


def transcribe_audio(model, audio_path: str, language: str | None = None):
    """Transcribe an audio file with Whisper."""
    options = {"fp16": False}

    if language:
        options["language"] = language

    result = model.transcribe(audio_path, **options)

    return {
        "text": result["text"].strip(),
        "language": result["language"],
        "segments": result.get("segments", []),
    }
