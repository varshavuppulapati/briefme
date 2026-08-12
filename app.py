import os
import tempfile

from dotenv import load_dotenv
from flask import Flask, render_template, request

from core.summarizer import summarize_transcript
from core.transcription import transcribe_audio

load_dotenv()

app = Flask(__name__)

ALLOWED_AUDIO_EXT = {".mp3", ".mp4", ".m4a", ".wav", ".webm", ".mpeg", ".mpga"}


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/summarize", methods=["POST"])
def summarize():
    transcript_text = request.form.get("transcript", "").strip()
    audio_file = request.files.get("audio")

    error = None
    summary = None
    used_transcript = transcript_text

    try:
        if audio_file and audio_file.filename:
            ext = os.path.splitext(audio_file.filename)[1].lower()
            if ext not in ALLOWED_AUDIO_EXT:
                raise ValueError(f"Unsupported audio type: {ext}")
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                audio_file.save(tmp.name)
                tmp_path = tmp.name
            try:
                used_transcript = transcribe_audio(tmp_path)
            finally:
                os.unlink(tmp_path)

        if not used_transcript:
            error = "Paste a transcript or upload an audio file."
        else:
            summary = summarize_transcript(used_transcript)
    except RuntimeError as e:
        error = str(e)
    except Exception as e:
        error = f"Something went wrong: {e}"

    return render_template(
        "index.html",
        transcript=used_transcript,
        summary=summary,
        error=error,
    )


if __name__ == "__main__":
    app.run(debug=True, port=5002)
