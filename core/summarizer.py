"""Structured summary extraction for BriefMe."""
import json
import re

from .llm import chat
from .prompts import SUMMARIZE_PROMPT


def _strip_code_fence(raw):
    return re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()


def summarize_transcript(transcript):
    raw = chat(SUMMARIZE_PROMPT.format(transcript=transcript))
    raw = _strip_code_fence(raw)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"tldr": raw}
    data.setdefault("tldr", "")
    data.setdefault("key_points", [])
    data.setdefault("action_items", [])
    data.setdefault("decisions", [])
    return data
