# BriefMe

**[Try it live →](https://briefme-pp0o.onrender.com)**

Paste a transcript, upload a recording, or record right in the browser. Get back a TL;DR, key points, action items, and decisions — no more re-watching an hour to find the three things that actually mattered.



## Features

- **Record in-browser** — capture straight from your mic, no upload step needed
- **Upload audio or video** — mp3, wav, m4a, mp4, webm, flac, ogg, opus
- **Draggable corkboard** — decisions, action items, and key points as pinned cards you can rearrange freely
- **Mind-map view** — the same results as a draggable node graph radiating from a central "Meeting" node
- **Clickable timeline scrubber** — a draggable playhead over the actual transcript segments, synced to an in-browser player
- **Due-date parsing** — action items pick up dates or phrases like "by Friday" automatically, with checkboxes
- **Meeting health score** — a signal-density gauge ("Highly decisive meeting" vs. "Could've been an email")
- **Multi-language input** — Whisper auto-detects the spoken language; the summary always comes back in English
- **Markdown export** — one click, copies formatted notes ready to paste into Notion/Slack
- Mouse-reactive glow, drifting background, a draggable floating score badge, a reactive mood orb, and confetti on results — because meeting notes don't have to look like a form

## How it works

1. **Transcribe** (optional) — if you upload or record audio/video instead of pasting text, Groq's hosted Whisper API transcribes it first, with segment-level timestamps for the scrubber and transcript view.
2. **Summarize** — a single structured-output LLM call extracts a TL;DR, key points, action items (with owner and due date if mentioned), and decisions as JSON, with an explicit instruction not to invent anything that wasn't actually said.
3. **Score** — a deterministic heuristic turns decisions + action items, relative to transcript length, into a "meeting health" signal-density score.

## Run it yourself

```bash
git clone https://github.com/varshavuppulapati/briefme.git
cd briefme
python app.py
```

That's it — no venv, no `pip install`, no `.env` to hand-edit first. The first run installs any missing dependencies automatically and asks for a Groq API key once ([get a free one here](https://console.groq.com/keys), no card required), then saves it to a local `.env` so you're never asked again. Open http://localhost:5002.

## Why Groq instead of OpenAI

Groq's API is OpenAI-SDK-compatible (same `openai` Python package, just a different `base_url`) and hosts Whisper too, so both the transcription and summarization calls run on it. Its free tier is generous enough to run a public, anyone-can-try-it deployment without turning into a personal expense or an abuse target the way a real OpenAI key would.

## Deploy your own

This repo includes a `render.yaml`, so it deploys to [Render](https://render.com)'s free web service tier in a few clicks: New → Blueprint → point it at this repo → add your `GROQ_API_KEY` in the dashboard → deploy.

## Project structure

```
briefme/
├── app.py                    # Flask routes (JSON API) + startup bootstrap
├── core/
│   ├── setup.py                # Auto-installs deps, prompts + saves API key on first run
│   ├── llm.py                  # Groq (OpenAI-compatible) client wrapper
│   ├── prompts.py              # Prompt templates
│   ├── transcription.py        # Whisper audio/video transcription with timestamps
│   └── summarizer.py           # Structured summary extraction + health score
├── templates/index.html
├── static/{style.css, app.js}  # Corkboard, mind map, scrubber, mic recording, animations
├── tests/
├── requirements.txt
├── render.yaml
└── .env.example
```

## Supported files

flac, mp3, mp4, mpeg, mpga, m4a, ogg, opus, wav, webm — the exact set Groq's Whisper endpoint accepts. `.mp4` and `.webm` cover most screen/video recordings; other video containers (`.mov`, `.avi`, `.mkv`) aren't supported and are rejected before upload.

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Tests mock the model call, so they run without an API key.

## License

MIT — see [LICENSE](LICENSE).
