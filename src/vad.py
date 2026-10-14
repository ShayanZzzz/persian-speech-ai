import torch
import librosa
from silero_vad import load_silero_vad, get_speech_timestamps


def load_vad_model():
    """Load the Silero VAD model."""
    return load_silero_vad()


def detect_speech(audio_path: str, model=None):
    """Detect speech segments in an audio file."""
    if model is None:
        model = load_vad_model()

    audio, sample_rate = librosa.load(
        audio_path,
        sr=16000,
        mono=True,
    )
    audio = torch.from_numpy(audio)

    timestamps = get_speech_timestamps(
        audio,
        model,
        sampling_rate=16000,
    )

    return [
        {
            "start": segment["start"] / 16000,
            "end": segment["end"] / 16000,
        }
        for segment in timestamps
    ]