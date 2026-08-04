"""Google login: token exchange and the current-user endpoint.

The Google token verification and the storage layer are mocked, so this runs
without network or a database (see feedback-always-test)."""

import pytest

import app


class FakeUserStorage:
    def __init__(self):
        self.users = {1: {"id": 1, "email": "diogotocci@gmail.com", "name": "Diogo", "picture": None}}
        self.upserts = []

    def upsert_google_user(self, google_sub, email, name, picture):
        self.upserts.append({"sub": google_sub, "email": email, "name": name, "picture": picture})
        user = {"id": 1, "email": email, "name": name, "picture": picture}
        self.users[1] = user
        return user

    def get_user(self, user_id):
        return self.users.get(user_id)


@pytest.fixture
def client(monkeypatch):
    store = FakeUserStorage()
    monkeypatch.setattr(app, "user_storage", store)
    monkeypatch.setattr(app, "GOOGLE_CLIENT_ID", "test-client-id")
    test_client = app.app.test_client()
    test_client.store = store
    return test_client


def test_google_login_issues_a_session_token(client, monkeypatch):
    monkeypatch.setattr(app, "_verify_google_token", lambda cred: {
        "sub": "google-sub-123", "email": "diogotocci@gmail.com", "name": "Diogo", "picture": None,
    })
    res = client.post("/api/auth/google", json={"credential": "any"})
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert data["user"]["email"] == "diogotocci@gmail.com"
    # the token decodes back to the user id
    assert app._session_serializer.loads(data["token"])["uid"] == 1
    # the Google profile was forwarded to storage
    assert client.store.upserts[0]["sub"] == "google-sub-123"


def test_missing_credential_is_rejected(client):
    assert client.post("/api/auth/google", json={}).status_code == 400


def test_invalid_google_token_is_rejected(client, monkeypatch):
    def boom(cred):
        raise ValueError("bad token")
    monkeypatch.setattr(app, "_verify_google_token", boom)
    res = client.post("/api/auth/google", json={"credential": "forged"})
    assert res.status_code == 401
    assert client.store.upserts == []  # nothing saved


def test_login_disabled_without_client_id(client, monkeypatch):
    monkeypatch.setattr(app, "GOOGLE_CLIENT_ID", "")
    res = client.post("/api/auth/google", json={"credential": "any"})
    assert res.status_code == 503


def test_me_returns_the_logged_in_user(client):
    token = app._issue_session_token(1)
    res = client.get("/api/me", headers={"Authorization": "Bearer " + token})
    assert res.status_code == 200
    assert res.get_json()["email"] == "diogotocci@gmail.com"


def test_me_without_token_is_401(client):
    assert client.get("/api/me").status_code == 401


def test_me_with_garbage_token_is_401(client):
    res = client.get("/api/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401
