"""Per-pelada admin password: auth, admin activation and creation validation.

These exercise the Flask routes with the storage layer and the rate-limit store
mocked out, so they run without a database (see feedback-always-test)."""

import pytest

import app


class FakePeladaStorage:
    """In-memory stand-in with one pelada: access password vs admin password."""

    def __init__(self, pelada_id=1, password="grupo123", admin_password="secret123"):
        self.pelada_id = pelada_id
        self.password = password
        self.admin_password = admin_password
        self.created = None

    def verify_password(self, pelada_id, password):
        return pelada_id == self.pelada_id and password == self.password

    def verify_admin_password(self, pelada_id, password):
        return (
            pelada_id == self.pelada_id
            and bool(self.admin_password)
            and password == self.admin_password
        )

    def create_pelada(self, **kwargs):
        self.created = kwargs
        return {
            "id": 7,
            "name": kwargs["name"],
            "player_count": 0,
            "team1_color": kwargs["team1_color"],
            "team2_color": kwargs["team2_color"],
            "game_weekday": kwargs["game_weekday"],
        }


@pytest.fixture
def client(monkeypatch):
    fake = FakePeladaStorage()
    monkeypatch.setattr(app, "pelada_storage", fake)
    # Never touch the rate-limit database in tests.
    monkeypatch.setattr(app, "count_recent_failures", lambda ip, window: 0)
    monkeypatch.setattr(app, "record_failed_attempt", lambda ip: None)
    test_client = app.app.test_client()
    test_client.fake = fake
    return test_client


def _adm_flag(token):
    """Decode the signed token and return its admin flag."""
    return bool(app._serializer.loads(token)["adm"])


def test_auth_admin_password_grants_admin_token(client):
    res = client.post("/api/peladas/1/auth", json={"password": "secret123"})
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert data["is_admin"] is True
    assert _adm_flag(data["token"]) is True


def test_auth_access_password_grants_member_token(client):
    res = client.post("/api/peladas/1/auth", json={"password": "grupo123"})
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert data["is_admin"] is False
    assert _adm_flag(data["token"]) is False


def test_auth_wrong_password_is_rejected(client):
    res = client.post("/api/peladas/1/auth", json={"password": "nope"})
    assert res.status_code == 401
    assert res.get_json()["ok"] is False


def test_admin_password_is_scoped_to_its_pelada(client):
    # The right admin password against a different pelada id must not work.
    assert client.fake.verify_admin_password(2, "secret123") is False
    res = client.post("/api/peladas/2/auth", json={"password": "secret123"})
    assert res.status_code == 401


def test_activate_admin_accepts_pelada_admin_password(client):
    res = client.post("/api/peladas/1/admin", json={"key": "secret123"})
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert _adm_flag(data["token"]) is True


def test_activate_admin_rejects_wrong_key(client):
    res = client.post("/api/peladas/1/admin", json={"key": "wrong"})
    assert res.status_code == 403


def test_create_requires_admin_password(client):
    res = client.post(
        "/api/peladas",
        json={"name": "Nova", "password": "grupo123"},
    )
    assert res.status_code == 400


def test_create_forwards_admin_password_and_returns_admin_token(client):
    res = client.post(
        "/api/peladas",
        json={
            "name": "Nova",
            "password": "grupo123",
            "admin_password": "chave-nova",
        },
    )
    data = res.get_json()
    assert res.status_code == 201
    assert client.fake.created["admin_password"] == "chave-nova"
    assert _adm_flag(data["token"]) is True
