import shutil
import subprocess


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
