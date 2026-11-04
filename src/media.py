import json
import shutil
import subprocess


def get_media_duration(input_path: str) -> float | None:
    """Return media duration in seconds, or None if unavailable."""
    ffprobe = shutil.which("ffprobe")
    if ffprobe is None:
        return None

    command = [
        ffprobe, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", input_path,
    ]
    try:
        result = subprocess.run(
            command, check=True, capture_output=True, text=True, timeout=15
        )
        duration = float(result.stdout.strip())
        return duration if duration >= 0 else None
    except (subprocess.SubprocessError, ValueError, OSError):
        return None


def convert_to_wav(input_path: str, output_path: str) -> None:
    """
    Extract audio from an audio/video file and normalize it
    to mono, 16 kHz, 16-bit PCM WAV for speech recognition.
    """
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "FFmpeg is not installed or is not available in PATH."
        )

    command = [
        "ffmpeg",
        "-nostdin",
        "-y",
        "-v", "error",
        "-i", input_path,
        "-map", "0:a:0",
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        output_path,
    ]

    try:
        subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        raise ValueError(
            "Could not extract audio. The file may be invalid "
            "or may not contain an audio track."
        ) from exc


def validate_audio_file(input_path: str) -> float:
    """Validate that a file contains a readable audio stream."""
    ffprobe = shutil.which("ffprobe")
    if ffprobe is None:
        raise RuntimeError("FFprobe is not installed or is not available in PATH.")

    command = [
        ffprobe,
        "-v", "error",
        "-select_streams", "a:0",
        "-show_entries", "stream=codec_type:format=duration",
        "-of", "json",
        input_path,
    ]

    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        data = json.loads(result.stdout)
        streams = data.get("streams", [])
        duration = float(data.get("format", {}).get("duration", 0))

        if not streams or duration <= 0:
            raise ValueError("The file does not contain a valid audio stream.")

        return duration

    except (subprocess.SubprocessError, ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid or unreadable audio file.") from exc
