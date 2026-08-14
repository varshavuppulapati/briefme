# BriefMe

Paste a transcript or upload an audio file, and BriefMe turns it into structured notes: a TL;DR, key points, action items (with owner, if one was mentioned), and decisions made. No more re-reading forty minutes of rambling to find the three things that actually mattered.

## How it works

1. **Transcribe** (optional) — if you upload audio instead of pasting text, OpenAI's Whisper API transcribes it first.
2. **Summarize** — a single structured-output LLM call extracts a TL;DR, key points, action items, and decisions as JSON, with an explicit instruction not to invent action items or decisions that weren't actually mentioned.

## Setup

```bash
git clone https://github.com/varshavuppulapati/briefme.git
cd briefme
python app.py
```

That's it — no venv, no `pip install`, no `.env` to hand-edit first. The first run installs any missing dependencies automatically and asks for a Groq API key once ([get a free one here](https://console.groq.com/keys), no card required), then saves it to a local `.env` so you're never asked again.

Open http://localhost:5002, paste a transcript or upload an audio file, and hit **Summarize**.

## Why Groq instead of OpenAI

Groq's API is OpenAI-SDK-compatible (same `openai` Python package, just a different `base_url`) and hosts Whisper too, so both the transcription and summarization calls run on it. Its free tier is generous enough to run a public, anyone-can-try-it deployment without turning into a personal expense or an abuse target the way a real OpenAI key would.

## Deploy your own

This repo includes a `render.yaml`, so it deploys to [Render](https://render.com)'s free web service tier in a few clicks: New → Blueprint → point it at this repo → add your `GROQ_API_KEY` in the dashboard → deploy.

## Project structure

```
briefme/
├── app.py                    # Flask routes + startup bootstrap
├── core/
│   ├── setup.py                # Auto-installs deps, prompts + saves API key on first run
│   ├── llm.py                  # Groq (OpenAI-compatible) client wrapper
│   ├── prompts.py              # Prompt templates
│   ├── transcription.py        # Whisper audio transcription (via Groq)
│   └── summarizer.py           # Structured summary extraction
├── templates/index.html
├── static/style.css
├── tests/test_summarizer.py
├── requirements.txt
├── render.yaml
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
