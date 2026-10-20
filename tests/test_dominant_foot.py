"""Dominant foot (field peladas): optional player attribute validated by the
player routes. Storage is mocked, so this runs without a database."""

import pytest

import app
from models import Player


class FakeUsers:
    def __init__(self, role="admin"):
        self.role = role

    def get_user(self, user_id):
        return {"id": user_id, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        return self.role


class FakePeladas:
    def get_pelada(self, pelada_id):
        return {"id": 1, "name": "P", "sport_type": "field", "game_weekday": 6}


class FakePlayers:
    def __init__(self):
        self.added = None
        self.updated = None

    def add_player(self, **kwargs):
        self.added = kwargs
        return Player(7, kwargs["name"], kwargs["rating"], dominant_foot=kwargs.get("dominant_foot"))

    def update_player(self, **kwargs):
        self.updated = kwargs
        foot = kwargs["dominant_foot"] if kwargs.get("set_dominant_foot") else "right"
        return Player(kwargs["player_id"], kwargs["name"], kwargs["rating"], dominant_foot=foot)


@pytest.fixture
def env(monkeypatch):
    users, players = FakeUsers(), FakePlayers()
    monkeypatch.setattr(app, "user_storage", users)
    monkeypatch.setattr(app, "pelada_storage", FakePeladas())
    monkeypatch.setattr(app, "player_storage", players)
    client = app.app.test_client()
    client.users, client.players = users, players
    return client


def _auth():
    return {
        "Authorization": "Bearer " + app._issue_session_token(1),
        "X-Pelada-Id": "1",
    }


def test_create_player_with_dominant_foot(env):
    res = env.post("/api/players", json={"name": "Rafa", "rating": 3, "dominant_foot": "left"}, headers=_auth())
    assert res.status_code == 201
    assert env.players.added["dominant_foot"] == "left"
    assert res.get_json()["dominant_foot"] == "left"


def test_create_player_dominant_foot_is_optional(env):
    res = env.post("/api/players", json={"name": "Rafa", "rating": 3}, headers=_auth())
    assert res.status_code == 201
    assert env.players.added["dominant_foot"] is None


def test_create_player_rejects_invalid_dominant_foot(env):
    res = env.post("/api/players", json={"name": "Rafa", "rating": 3, "dominant_foot": "both"}, headers=_auth())
    assert res.status_code == 400


def test_update_player_sets_dominant_foot(env):
    res = env.put("/api/players/7", json={"name": "Rafa", "rating": 3, "dominant_foot": "right"}, headers=_auth())
    assert res.status_code == 200
    assert env.players.updated["set_dominant_foot"] is True
    assert env.players.updated["dominant_foot"] == "right"


def test_update_player_null_clears_dominant_foot(env):
    res = env.put("/api/players/7", json={"name": "Rafa", "rating": 3, "dominant_foot": None}, headers=_auth())
    assert res.status_code == 200
    assert env.players.updated["set_dominant_foot"] is True
    assert res.get_json()["dominant_foot"] is None


def test_update_player_without_key_keeps_dominant_foot(env):
    res = env.put("/api/players/7", json={"name": "Rafa", "rating": 3}, headers=_auth())
    assert res.status_code == 200
    assert env.players.updated["set_dominant_foot"] is False
    assert res.get_json()["dominant_foot"] == "right"


def test_update_player_rejects_invalid_dominant_foot(env):
    res = env.put("/api/players/7", json={"name": "Rafa", "rating": 3, "dominant_foot": "x"}, headers=_auth())
    assert res.status_code == 400


def test_member_json_includes_dominant_foot():
    player = Player(1, "A", 3.0, dominant_foot="left")
    assert app._player_json(player, False)["dominant_foot"] == "left"
    assert app._player_json(player, True)["dominant_foot"] == "left"
