# BriefMe

Paste a transcript or upload an audio file, and BriefMe turns it into structured notes: a TL;DR, key points, action items (with owner, if one was mentioned), and decisions made. No more re-reading forty minutes of rambling to find the three things that actually mattered.

## How it works

1. **Transcribe** (optional) — if you upload audio instead of pasting text, OpenAI's Whisper API transcribes it first.
2. **Summarize** — a single structured-output LLM call extracts a TL;DR, key points, action items, and decisions as JSON, with an explicit instruction not to invent action items or decisions that weren't actually mentioned.

## Setup

```bash
git clone https://github.com/varshavuppulapati/briefme.git
cd briefme
python -m venv .venv
source .venv/bin/activate  # .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # then add your OPENAI_API_KEY
python app.py
```

Open http://localhost:5002, paste a transcript or upload an audio file, and hit **Summarize**.

## Project structure

```
briefme/
├── app.py                    # Flask routes
├── core/
│   ├── llm.py                 # OpenAI client wrapper
│   ├── prompts.py             # Prompt templates
│   ├── transcription.py       # Whisper audio transcription
│   └── summarizer.py          # Structured summary extraction
├── templates/index.html
├── static/style.css
├── tests/test_summarizer.py
├── requirements.txt
└── .env.example
```

## Supported audio formats

mp3, mp4, m4a, wav, webm, mpeg, mpga — anything Whisper accepts.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Tests mock the OpenAI call, so they run without an API key.

## License

MIT — see [LICENSE](LICENSE).
