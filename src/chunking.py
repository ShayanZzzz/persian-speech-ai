import subprocess
import tempfile
from pathlib import Path


def get_duration(audio_path: str) -> float:
    """Return media duration in seconds using FFprobe."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path,
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    return float(result.stdout.strip())


def split_audio(
    audio_path: str,
    chunk_seconds: int = 300,
    overlap_seconds: int = 2,
) -> list[dict]:
    """
    Split normalized audio into overlapping WAV chunks.

    Returns a list containing each chunk's path and its
    start/end timestamps in the original audio.
    Temporary files remain available until the caller deletes them.
    """
    if chunk_seconds <= 0:
        raise ValueError("chunk_seconds must be positive.")

    if overlap_seconds < 0 or overlap_seconds >= chunk_seconds:
        raise ValueError(
            "overlap_seconds must be non-negative and smaller "
            "than chunk_seconds."
        )

    duration = get_duration(audio_path)
    temp_dir = tempfile.mkdtemp(prefix="persian_speech_chunks_")
    chunks = []

    step = chunk_seconds - overlap_seconds
    start = 0.0
    index = 0

    try:
        while start < duration:
            end = min(start + chunk_seconds, duration)
            output_path = str(
                Path(temp_dir) / f"chunk_{index:04d}.wav"
            )

            subprocess.run(
                [
                    "ffmpeg",
                    "-nostdin",
                    "-y",
                    "-v", "error",
                    "-i", audio_path,
                    "-ss", str(start),
                    "-t", str(end - start),
                    "-vn",
                    "-ac", "1",
                    "-ar", "16000",
                    "-c:a", "pcm_s16le",
                    output_path,
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            chunks.append(
                {
                    "path": output_path,
                    "start": start,
                    "end": end,
                }
            )

            index += 1

            if end >= duration:
                break

            start += step

        return chunks

    except Exception:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


def transcribe_chunks(
    model,
    audio_path: str,
    chunk_seconds: int = 300,
    overlap_seconds: int = 2,
    language: str | None = None,
) -> dict:
    """Transcribe audio chunks and merge their timestamped segments."""
    import shutil

    chunks = split_audio(
        audio_path,
        chunk_seconds=chunk_seconds,
        overlap_seconds=overlap_seconds,
    )

    if not chunks:
        return {"text": "", "language": language, "segments": []}

    try:
        results = []

        for chunk in chunks:
            options = {"fp16": False}
            if language:
                options["language"] = language

            result = model.transcribe(chunk["path"], **options)
            results.append(result)

        merged_segments = []

        for i, (chunk, result) in enumerate(zip(chunks, results)):
            left = (
                0.0
                if i == 0
                else (chunks[i - 1]["end"] + chunk["start"]) / 2
            )
            right = (
                chunk["end"]
                if i == len(chunks) - 1
                else (chunk["end"] + chunks[i + 1]["start"]) / 2
            )

            for segment in result.get("segments", []):
                midpoint = (
                    segment["start"] + segment["end"]
                ) / 2

                global_midpoint = chunk["start"] + midpoint

                if left <= global_midpoint < right or (
                    i == len(chunks) - 1
                    and global_midpoint == right
                ):
                    adjusted = dict(segment)
                    adjusted["start"] += chunk["start"]
                    adjusted["end"] += chunk["start"]
                    merged_segments.append(adjusted)

        merged_segments.sort(key=lambda segment: segment["start"])

        return {
            "text": "".join(
                segment["text"] for segment in merged_segments
            ).strip(),
            "language": results[0].get("language", language),
            "segments": merged_segments,
        }

    finally:
        shutil.rmtree(
            str(Path(chunks[0]["path"]).parent),
            ignore_errors=True,
        )
