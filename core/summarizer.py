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
    data["health"] = compute_health_score(data, transcript)
    return data


def compute_health_score(summary, transcript):
    """A deliberately simple, honest heuristic: more decisions and action
    items per 100 words of discussion suggests a more decisive meeting.
    Not a rigorous metric - just a fun, defensible signal-density gauge."""
    word_count = max(len(transcript.split()), 1)
    signal = len(summary.get("decisions", [])) * 2 + len(summary.get("action_items", []))
    density = signal / max(word_count / 100, 1)
    score = min(round(density * 20), 100)

    if score >= 70:
        label = "Highly decisive meeting"
    elif score >= 40:
        label = "Productive meeting"
    elif score >= 15:
        label = "Some signal in the noise"
    else:
        label = "Could've been an email"

    return {"score": score, "label": label}
