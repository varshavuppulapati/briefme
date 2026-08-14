from core.transcription import _get


class FakeSegment:
    def __init__(self, start, end, text):
        self.start = start
        self.end = end
        self.text = text


def test_get_reads_object_attribute():
    seg = FakeSegment(1.0, 2.5, "hello")
    assert _get(seg, "start") == 1.0
    assert _get(seg, "text") == "hello"


def test_get_reads_dict_key():
    seg = {"start": 1.0, "text": "hello"}
    assert _get(seg, "start") == 1.0
    assert _get(seg, "missing", "default") == "default"


def test_get_falls_back_to_default():
    assert _get(object(), "nope", "fallback") == "fallback"
