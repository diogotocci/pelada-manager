"""Client error logging: the public /api/clientlog endpoint and the superadmin
errors viewer. Storage is mocked, so this runs without a database."""

import pytest

import app


class FakeUsers:
    def get_user(self, uid):
        return {"id": uid, "email": "boss@x.com", "name": "U", "picture": None}


class FakeClientLog:
    def __init__(self):
        self.errors = []
        self.cleared = False

    def add_error(self, message, stack, url, user_agent, app_version, who):
        self.errors.append({"message": message, "who": who, "app_version": app_version})

    def list_errors(self, limit=100):
        return [{"id": 1, "message": "boom", "stack": "at x", "url": "/",
                 "user_agent": "UA", "app_version": "1", "who": "a@b.com", "created_at": None}]

    def clear(self):
        self.cleared = True


@pytest.fixture
def client(monkeypatch):
    store = FakeClientLog()
    monkeypatch.setattr(app, "clientlog_storage", store)
    monkeypatch.setattr(app, "user_storage", FakeUsers())
    monkeypatch.setattr(app, "SUPERADMIN_EMAIL", "boss@x.com")
    c = app.app.test_client()
    c.store = store
    return c


def _auth(uid=1):
    return {"Authorization": "Bearer " + app._issue_session_token(uid)}


def test_clientlog_is_public_and_stored(client):
    res = client.post("/api/clientlog", json={"message": "boom", "stack": "at x", "url": "/", "who": "a@b.com"})
    assert res.status_code == 204
    assert client.store.errors[0]["message"] == "boom"


def test_clientlog_never_errors_on_bad_body(client):
    res = client.post("/api/clientlog", data="not json", content_type="text/plain")
    assert res.status_code == 204


def test_clientlog_caps_message_length(client):
    client.post("/api/clientlog", json={"message": "x" * 5000})
    assert len(client.store.errors[0]["message"]) <= app.CLIENTLOG_MSG_MAX


def test_admin_errors_requires_superadmin(client):
    assert client.get("/api/admin/errors").status_code == 401


def test_admin_lists_errors(client):
    res = client.get("/api/admin/errors", headers=_auth())
    assert res.status_code == 200
    assert res.get_json()["errors"][0]["message"] == "boom"


def test_admin_clears_errors(client):
    res = client.delete("/api/admin/errors", headers=_auth())
    assert res.status_code == 200
    assert client.store.cleared is True
