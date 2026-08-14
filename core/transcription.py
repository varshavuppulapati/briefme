"""Audio/video transcription via Groq's hosted Whisper API (OpenAI-compatible)."""
from .llm import get_client

TRANSCRIBE_MODEL = "whisper-large-v3"


def _get(obj, key, default=None):
    """Works whether the SDK hands back a pydantic model or a plain dict."""
    if hasattr(obj, key):
        return getattr(obj, key)
    if isinstance(obj, dict):
        return obj.get(key, default)
    return default


def transcribe_audio(file_path):
    """Returns (full_text, segments) where segments is a list of
    {start, end, text} dicts - empty if the API didn't return any."""
    client = get_client()
    with open(file_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model=TRANSCRIBE_MODEL,
            file=f,
            response_format="verbose_json",
        )

    text = _get(transcript, "text", "") or ""
    raw_segments = _get(transcript, "segments", []) or []
    segments = [
        {
            "start": _get(s, "start", 0),
            "end": _get(s, "end", 0),
            "text": (_get(s, "text", "") or "").strip(),
        }
        for s in raw_segments
    ]
    return text, segments
