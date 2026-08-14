from core.summarizer import compute_health_score


def test_high_signal_density_scores_high():
    summary = {"decisions": ["Ship feature X", "Cut scope on Y"], "action_items": [{"task": "a"}, {"task": "b"}]}
    transcript = " ".join(["word"] * 50)  # short transcript, lots of decisions/actions
    result = compute_health_score(summary, transcript)
    assert result["score"] > 50
    assert result["label"] in ("Highly decisive meeting", "Productive meeting")


def test_no_signal_scores_zero():
    summary = {"decisions": [], "action_items": []}
    transcript = " ".join(["word"] * 500)
    result = compute_health_score(summary, transcript)
    assert result["score"] == 0
    assert result["label"] == "Could've been an email"


def test_empty_transcript_does_not_crash():
    summary = {"decisions": ["one"], "action_items": []}
    result = compute_health_score(summary, "")
    assert isinstance(result["score"], int)
