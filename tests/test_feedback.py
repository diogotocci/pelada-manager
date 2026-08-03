"""Feedback endpoint: validation and storage forwarding.

Runs without a database by mocking the storage layer (see feedback-always-test)."""

import pytest

import app


class FakeFeedbackStorage:
    def __init__(self):
        self.saved = None

    def add_feedback(self, category, message, contact=None, app_version=None, pelada_id=None):
        self.saved = {
            "category": category,
            "message": message,
            "contact": contact,
            "app_version": app_version,
            "pelada_id": pelada_id,
        }
        return 42


@pytest.fixture
def client(monkeypatch):
    fake = FakeFeedbackStorage()
    monkeypatch.setattr(app, "feedback_storage", fake)
    test_client = app.app.test_client()
    test_client.fake = fake
    return test_client


def test_valid_feedback_is_saved(client):
    res = client.post(
        "/api/feedback",
        json={"category": "bug", "message": "  Crashou ao sortear  ", "contact": "zap 999"},
    )
    data = res.get_json()
    assert res.status_code == 201
    assert data == {"ok": True, "id": 42}

    saved = client.fake.saved
    assert saved["category"] == "bug"
    assert saved["message"] == "Crashou ao sortear"  # trimmed
    assert saved["contact"] == "zap 999"
    assert saved["app_version"] == app.APP_VERSION  # recorded server-side
    assert saved["pelada_id"] is None  # no token -> not scoped


def test_contact_is_optional(client):
    res = client.post("/api/feedback", json={"category": "suggestion", "message": "Modo escuro"})
    assert res.status_code == 201
    assert client.fake.saved["contact"] is None


@pytest.mark.parametrize("category", ["", "spam", "BUG", None])
def test_invalid_category_is_rejected(client, category):
    res = client.post("/api/feedback", json={"category": category, "message": "oi"})
    assert res.status_code == 400
    assert client.fake.saved is None


def test_empty_message_is_rejected(client):
    res = client.post("/api/feedback", json={"category": "other", "message": "   "})
    assert res.status_code == 400
    assert client.fake.saved is None


def test_message_too_long_is_rejected(client):
    long_message = "x" * (app.FEEDBACK_MESSAGE_MAX + 1)
    res = client.post("/api/feedback", json={"category": "bug", "message": long_message})
    assert res.status_code == 400
    assert client.fake.saved is None


def test_valid_token_scopes_feedback_to_its_pelada(client):
    token = app._issue_token(7, False)
    res = client.post(
        "/api/feedback",
        json={"category": "bug", "message": "erro"},
        headers={"Authorization": "Bearer " + token},
    )
    assert res.status_code == 201
    assert client.fake.saved["pelada_id"] == 7


def test_invalid_token_does_not_block_feedback(client):
    res = client.post(
        "/api/feedback",
        json={"category": "bug", "message": "erro"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert res.status_code == 201
    assert client.fake.saved["pelada_id"] is None
