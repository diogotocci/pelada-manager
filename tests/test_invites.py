"""Phase 3 invites: create/list/revoke, the public preview, and accepting an
invite (multi-use, time-bound). Storage is mocked, so this runs without a DB."""

from datetime import datetime, timedelta, timezone

import pytest

import app


def _iso(hours):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


class FakeUserStorage:
    def __init__(self, role="owner"):
        self.role = role
        self.memberships = []

    def get_user(self, user_id):
        return {"id": user_id, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        # After accepting, the caller becomes a member unless already set.
        for m in self.memberships:
            if m == (pelada_id, user_id):
                return "member"
        return self.role

    def add_membership(self, pelada_id, user_id, role):
        self.memberships.append((pelada_id, user_id))


class FakeInviteStorage:
    def __init__(self):
        self.invites = {}
        self.acceptances = []
        self.revoked = []
        self._next_id = 1

    def add_invite(self, pelada_id, role, created_by, expires_at):
        invite_id = self._next_id
        self._next_id += 1
        token = "tok" + str(invite_id)
        inv = {"id": invite_id, "pelada_id": pelada_id, "token": token, "role": role,
               "created_by": created_by,
               "expires_at": expires_at.isoformat(), "revoked_at": None,
               "accepted_count": 0, "pelada_name": "Fumageiro"}
        self.invites[token] = inv
        return inv

    def get_invite(self, token):
        return self.invites.get(token)

    def list_active_invites(self, pelada_id):
        return [i for i in self.invites.values() if i["pelada_id"] == pelada_id]

    def revoke_invite(self, token):
        self.revoked.append(token)
        if token in self.invites:
            self.invites[token]["revoked_at"] = _iso(0)
        return True

    def record_acceptance(self, invite_id):
        self.acceptances.append(invite_id)


@pytest.fixture
def env(monkeypatch):
    users = FakeUserStorage()
    invites = FakeInviteStorage()
    monkeypatch.setattr(app, "user_storage", users)
    monkeypatch.setattr(app, "invite_storage", invites)
    client = app.app.test_client()
    client.users = users
    client.invites = invites
    return client


def _auth(user_id=1, pelada_id=None):
    headers = {"Authorization": "Bearer " + app._issue_session_token(user_id)}
    if pelada_id is not None:
        headers["X-Pelada-Id"] = str(pelada_id)
    return headers


def _seed_invite(env, role="member", hours=24, revoked=False, created_by=99):
    inv = {"id": 1, "pelada_id": 5, "token": "tok123", "role": role,
           "created_by": created_by,
           "expires_at": _iso(hours), "revoked_at": (_iso(0) if revoked else None),
           "accepted_count": 0, "pelada_name": "Fumageiro"}
    env.invites.invites["tok123"] = inv
    return inv


# --- create / list / revoke ------------------------------------------

def test_admin_creates_invite(env):
    env.users.role = "admin"
    res = env.post("/api/peladas/5/invites", json={"role": "member", "ttl_hours": 24},
                   headers=_auth(pelada_id=5))
    assert res.status_code == 201
    data = res.get_json()
    assert data["token"]
    assert data["role"] == "member"


def test_admin_creates_admin_invite(env):
    env.users.role = "admin"
    res = env.post("/api/peladas/5/invites", json={"role": "admin", "ttl_hours": 24},
                   headers=_auth(pelada_id=5))
    assert res.status_code == 201
    assert res.get_json()["role"] == "admin"


def test_member_creates_member_invite(env):
    env.users.role = "member"
    res = env.post("/api/peladas/5/invites", json={"role": "member", "ttl_hours": 24},
                   headers=_auth(pelada_id=5))
    assert res.status_code == 201
    assert res.get_json()["role"] == "member"


def test_member_cannot_create_admin_invite(env):
    env.users.role = "member"
    res = env.post("/api/peladas/5/invites", json={"role": "admin"}, headers=_auth(pelada_id=5))
    assert res.status_code == 403


def test_invalid_invite_role_rejected(env):
    res = env.post("/api/peladas/5/invites", json={"role": "owner"}, headers=_auth(pelada_id=5))
    assert res.status_code == 400


def test_member_lists_only_own_invites(env):
    """Members see only invites they created; admins/owners see all."""
    env.users.role = "member"
    # Seed two invites: one created by user 1 (the caller), one by user 99.
    env.invites.invites["tokA"] = {
        "id": 10, "pelada_id": 5, "token": "tokA", "role": "member",
        "created_by": 1, "expires_at": _iso(24), "revoked_at": None,
        "accepted_count": 0, "pelada_name": "Fumageiro",
    }
    env.invites.invites["tokB"] = {
        "id": 11, "pelada_id": 5, "token": "tokB", "role": "member",
        "created_by": 99, "expires_at": _iso(24), "revoked_at": None,
        "accepted_count": 0, "pelada_name": "Fumageiro",
    }
    res = env.get("/api/peladas/5/invites", headers=_auth(user_id=1, pelada_id=5))
    assert res.status_code == 200
    data = res.get_json()
    assert len(data) == 1
    assert data[0]["token"] == "tokA"


def test_admin_lists_all_invites(env):
    env.users.role = "admin"
    env.invites.invites["tokA"] = {
        "id": 10, "pelada_id": 5, "token": "tokA", "role": "member",
        "created_by": 1, "expires_at": _iso(24), "revoked_at": None,
        "accepted_count": 0, "pelada_name": "Fumageiro",
    }
    env.invites.invites["tokB"] = {
        "id": 11, "pelada_id": 5, "token": "tokB", "role": "member",
        "created_by": 99, "expires_at": _iso(24), "revoked_at": None,
        "accepted_count": 0, "pelada_name": "Fumageiro",
    }
    res = env.get("/api/peladas/5/invites", headers=_auth(user_id=1, pelada_id=5))
    assert res.status_code == 200
    assert len(res.get_json()) == 2


def test_member_revokes_own_invite(env):
    _seed_invite(env, created_by=1)
    env.users.role = "member"
    res = env.post("/api/invites/tok123/revoke", headers=_auth(user_id=1))
    assert res.status_code == 200
    assert "tok123" in env.invites.revoked


def test_member_cannot_revoke_others_invite(env):
    _seed_invite(env, created_by=99)
    env.users.role = "member"
    res = env.post("/api/invites/tok123/revoke", headers=_auth(user_id=1))
    assert res.status_code == 403
    assert env.invites.revoked == []


def test_admin_revokes_any_invite(env):
    _seed_invite(env, created_by=99)
    env.users.role = "admin"
    res = env.post("/api/invites/tok123/revoke", headers=_auth(user_id=1))
    assert res.status_code == 200
    assert "tok123" in env.invites.revoked


# --- preview ----------------------------------------------------------

def test_preview_valid_invite_is_public(env):
    _seed_invite(env, role="admin", hours=10)
    res = env.get("/api/invites/tok123")  # no auth
    data = res.get_json()
    assert res.status_code == 200
    assert data["valid"] is True
    assert data["pelada_name"] == "Fumageiro"
    assert data["role"] == "admin"


def test_preview_unknown_token_404(env):
    res = env.get("/api/invites/nope")
    assert res.status_code == 404
    assert res.get_json()["valid"] is False


# --- accept -----------------------------------------------------------

def test_accept_adds_membership(env):
    _seed_invite(env, role="member", hours=24)
    res = env.post("/api/invites/tok123/accept", headers=_auth(user_id=2))
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert data["pelada_id"] == 5
    assert (5, 2) in env.users.memberships
    assert env.invites.acceptances == [1]


def test_accept_is_multi_use(env):
    _seed_invite(env, role="member", hours=24)
    assert env.post("/api/invites/tok123/accept", headers=_auth(user_id=2)).status_code == 200
    assert env.post("/api/invites/tok123/accept", headers=_auth(user_id=3)).status_code == 200
    assert (5, 2) in env.users.memberships
    assert (5, 3) in env.users.memberships


def test_accept_expired_invite_is_410(env):
    _seed_invite(env, hours=-1)  # already expired
    res = env.post("/api/invites/tok123/accept", headers=_auth(user_id=2))
    assert res.status_code == 410
    assert res.get_json()["reason"] == "expired"


def test_accept_revoked_invite_is_410(env):
    _seed_invite(env, revoked=True)
    res = env.post("/api/invites/tok123/accept", headers=_auth(user_id=2))
    assert res.status_code == 410
    assert res.get_json()["reason"] == "revoked"


def test_accept_requires_login(env):
    _seed_invite(env)
    assert env.post("/api/invites/tok123/accept").status_code == 401
