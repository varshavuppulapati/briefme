"""Audio transcription via OpenAI's Whisper API."""
from .llm import get_client


def transcribe_audio(file_path):
    client = get_client()
    with open(file_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
        )
    return transcript.text
