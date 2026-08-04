"""Phase 2 authorization: access to a pelada comes from the caller's membership
role (owner/admin/member), resolved from the session token + X-Pelada-Id header.

Storage is mocked, so this runs without a database."""

import pytest
from werkzeug.exceptions import Unauthorized, BadRequest, Forbidden

import app


class FakeUserStorage:
    def __init__(self, role=None):
        self.role = role
        self.peladas = [{"id": 1, "name": "Pelada", "role": "owner", "player_count": 0}]

    def get_user(self, user_id):
        return {"id": user_id, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        return self.role

    def list_user_peladas(self, user_id):
        return self.peladas


class FakePeladaStorage:
    def __init__(self):
        self.created = None
        self.deleted = None

    def create_pelada_owned(self, name, owner_user_id, team1_color, team2_color, game_weekday):
        self.created = {"name": name, "owner": owner_user_id}
        return {"id": 9, "name": name, "role": "owner", "player_count": 0,
                "team1_color": team1_color, "team2_color": team2_color, "game_weekday": game_weekday}

    def delete_pelada(self, pelada_id):
        self.deleted = pelada_id
        return True


@pytest.fixture
def env(monkeypatch):
    users = FakeUserStorage()
    peladas = FakePeladaStorage()
    monkeypatch.setattr(app, "user_storage", users)
    monkeypatch.setattr(app, "pelada_storage", peladas)
    client = app.app.test_client()
    client.users = users
    client.peladas = peladas
    return client


def _auth(user_id=1, pelada_id=None):
    headers = {"Authorization": "Bearer " + app._issue_session_token(user_id)}
    if pelada_id is not None:
        headers["X-Pelada-Id"] = str(pelada_id)
    return headers


# --- _require_membership / _require_pelada ----------------------------

def test_membership_requires_login(env):
    with app.app.test_request_context():
        with pytest.raises(Unauthorized):
            app._require_membership()


def test_membership_requires_pelada_header(env):
    with app.app.test_request_context(headers=_auth()):
        with pytest.raises(BadRequest):
            app._require_membership()


def test_non_member_is_forbidden(env):
    env.users.role = None
    with app.app.test_request_context(headers=_auth(pelada_id=1)):
        with pytest.raises(Forbidden):
            app._require_membership()


@pytest.mark.parametrize("role,is_admin", [("owner", True), ("admin", True), ("member", False)])
def test_require_pelada_maps_role_to_admin(env, role, is_admin):
    env.users.role = role
    with app.app.test_request_context(headers=_auth(pelada_id=1)):
        pid, adm = app._require_pelada()
    assert pid == 1
    assert adm is is_admin


# --- routes -----------------------------------------------------------

def test_list_peladas_returns_only_the_users_peladas(env):
    res = env.get("/api/peladas", headers=_auth())
    assert res.status_code == 200
    assert res.get_json()[0]["role"] == "owner"


def test_list_peladas_requires_login(env):
    assert env.get("/api/peladas").status_code == 401


def test_create_pelada_makes_the_user_owner(env):
    res = env.post("/api/peladas", json={"name": "Nova"}, headers=_auth())
    data = res.get_json()
    assert res.status_code == 201
    assert data["role"] == "owner"
    assert env.peladas.created["owner"] == 1


def test_create_pelada_requires_login(env):
    assert env.post("/api/peladas", json={"name": "Nova"}).status_code == 401


def test_only_owner_deletes_pelada(env):
    env.users.role = "admin"
    res = env.delete("/api/peladas/1", headers=_auth(pelada_id=1))
    assert res.status_code == 403
    assert env.peladas.deleted is None


def test_owner_can_delete_pelada(env):
    env.users.role = "owner"
    res = env.delete("/api/peladas/1", headers=_auth(pelada_id=1))
    assert res.status_code == 200
    assert env.peladas.deleted == 1
