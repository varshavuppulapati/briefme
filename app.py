from core.setup import ensure_api_key, ensure_dependencies

ensure_dependencies()
ensure_api_key()

import os  # noqa: E402
import tempfile  # noqa: E402

from flask import Flask, jsonify, render_template, request  # noqa: E402

from core.summarizer import summarize_transcript  # noqa: E402
from core.transcription import transcribe_audio  # noqa: E402

app = Flask(__name__)

# Exactly what Groq's Whisper endpoint accepts - anything else is rejected
# with a 400 before transcription even starts, so this list must stay in
# sync with https://console.groq.com/docs/speech-to-text.
ALLOWED_MEDIA_EXT = {
    ".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".opus", ".wav", ".webm",
}


@app.errorhandler(Exception)
def handle_uncaught_error(e):
    """Guarantees /api/* always returns JSON, even on a bug we didn't anticipate -
    otherwise Flask's default HTML error page breaks the frontend's res.json()."""
    if request.path.startswith("/api/"):
        return jsonify(error=f"Unexpected server error: {e}"), 500
    raise e


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/api/summarize", methods=["POST"])
def api_summarize():
    transcript_text = request.form.get("transcript", "").strip()
    media_file = request.files.get("media")

    used_transcript = transcript_text
    segments = []

    try:
        if media_file and media_file.filename:
            ext = os.path.splitext(media_file.filename)[1].lower()
            if ext not in ALLOWED_MEDIA_EXT:
                return jsonify(error=f"Unsupported file type: {ext}"), 400
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                media_file.save(tmp.name)
                tmp_path = tmp.name
            try:
                used_transcript, segments = transcribe_audio(tmp_path)
            finally:
                os.unlink(tmp_path)

        if not used_transcript:
            return jsonify(error="Paste a transcript or upload an audio/video file."), 400

        summary = summarize_transcript(used_transcript)
    except RuntimeError as e:
        return jsonify(error=str(e)), 500
    except Exception as e:
        return jsonify(error=f"Something went wrong: {e}"), 500

    return jsonify(summary=summary, transcript=used_transcript, segments=segments)


if __name__ == "__main__":
    app.run(debug=True, port=5002)
