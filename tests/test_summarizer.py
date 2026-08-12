from unittest.mock import patch

from core.summarizer import summarize_transcript


@patch("core.summarizer.chat")
def test_summarize_transcript_parses_json(mock_chat):
    mock_chat.return_value = (
        '{"tldr": "Team discussed the Q3 roadmap.", '
        '"key_points": ["Roadmap reviewed"], '
        '"action_items": [{"task": "Send doc", "owner": "Sam"}], '
        '"decisions": ["Ship feature X"]}'
    )
    result = summarize_transcript("some transcript")
    assert result["tldr"] == "Team discussed the Q3 roadmap."
    assert result["key_points"] == ["Roadmap reviewed"]
    assert result["action_items"][0]["owner"] == "Sam"
    assert result["decisions"] == ["Ship feature X"]


@patch("core.summarizer.chat")
def test_summarize_transcript_handles_bad_json(mock_chat):
    mock_chat.return_value = "not valid json"
    result = summarize_transcript("some transcript")
    assert result["tldr"] == "not valid json"
    assert result["key_points"] == []
    assert result["action_items"] == []
    assert result["decisions"] == []


@patch("core.summarizer.chat")
def test_summarize_transcript_strips_code_fence(mock_chat):
    mock_chat.return_value = '```json\n{"tldr": "Fenced summary."}\n```'
    result = summarize_transcript("some transcript")
    assert result["tldr"] == "Fenced summary."
