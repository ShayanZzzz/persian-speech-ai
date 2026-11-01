from functools import lru_cache

import whisper


@lru_cache(maxsize=4)
def load_model(model_name: str):
    """Load and cache a Whisper model."""
    if not isinstance(model_name, str) or not model_name.strip():
        raise ValueError("Invalid Whisper backend model configuration.")

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


def transcribe_with_model(model_config: dict, audio_path: str, language: str | None = None):
    """Dispatch transcription to the configured inference backend."""
    if not isinstance(model_config, dict):
        raise ValueError("Invalid model configuration.")

    backend = model_config.get("backend")

    if not isinstance(backend, dict):
        raise ValueError("Model backend configuration is missing.")

    backend_type = backend.get("type")

    if backend_type == "whisper":
        model_name = backend.get("model")
        model = load_model(model_name)
        return transcribe_audio(model, audio_path, language=language)

    raise ValueError(f"Unsupported inference backend: {backend_type}")
