"""Audio transcription via Groq's hosted Whisper API (OpenAI-compatible)."""
from .llm import get_client

TRANSCRIBE_MODEL = "whisper-large-v3"


def transcribe_audio(file_path):
    client = get_client()
    with open(file_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model=TRANSCRIBE_MODEL,
            file=f,
        )
    return transcript.text
