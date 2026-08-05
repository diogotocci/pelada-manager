"""Phase 4 features: delete account, transfer ownership, leave pelada.
Storage is mocked, so this runs without a database."""

import pytest

import app


class FakeUsers:
    def __init__(self):
        self.role = "owner"       # the caller's role in the pelada
        self.members = {1, 2}     # user ids that are members of the pelada
        self.deleted_user = None
        self.transferred = None
        self.removed = None

    def get_user(self, uid):
        return {"id": uid, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        # The caller resolves to self.role; any other member also counts as a
        # member (non-None) for the transfer target check; non-members are None.
        return self.role if user_id in self.members else None

    def delete_user(self, uid):
        self.deleted_user = uid

    def transfer_ownership(self, pelada_id, new_owner):
        self.transferred = (pelada_id, new_owner)

    def remove_member(self, pelada_id, user_id):
        self.removed = (pelada_id, user_id)
        return True


@pytest.fixture
def env(monkeypatch):
    users = FakeUsers()
    monkeypatch.setattr(app, "user_storage", users)
    c = app.app.test_client()
    c.users = users
    return c


def _auth(uid=1, pelada_id=None):
    h = {"Authorization": "Bearer " + app._issue_session_token(uid)}
    if pelada_id is not None:
        h["X-Pelada-Id"] = str(pelada_id)
    return h


# --- delete account ---------------------------------------------------

def test_delete_account_requires_login(env):
    assert env.delete("/api/me").status_code == 401


def test_delete_account(env):
    res = env.delete("/api/me", headers=_auth(1))
    assert res.status_code == 200
    assert env.users.deleted_user == 1


# --- transfer ownership ----------------------------------------------

def test_transfer_requires_owner(env):
    env.users.role = "admin"
    res = env.post("/api/peladas/5/transfer", json={"user_id": 2}, headers=_auth(pelada_id=5))
    assert res.status_code == 403
    assert env.users.transferred is None


def test_transfer_to_member(env):
    env.users.role = "owner"
    res = env.post("/api/peladas/5/transfer", json={"user_id": 2}, headers=_auth(pelada_id=5))
    assert res.status_code == 200
    assert env.users.transferred == (5, 2)


def test_transfer_to_non_member_is_404(env):
    env.users.role = "owner"
    res = env.post("/api/peladas/5/transfer", json={"user_id": 3}, headers=_auth(pelada_id=5))
    assert res.status_code == 404


def test_transfer_to_self_is_400(env):
    env.users.role = "owner"
    res = env.post("/api/peladas/5/transfer", json={"user_id": 1}, headers=_auth(pelada_id=5))
    assert res.status_code == 400


# --- leave pelada -----------------------------------------------------

def test_owner_cannot_leave(env):
    env.users.role = "owner"
    res = env.post("/api/peladas/5/leave", headers=_auth(pelada_id=5))
    assert res.status_code == 403
    assert env.users.removed is None


def test_member_leaves(env):
    env.users.role = "member"
    res = env.post("/api/peladas/5/leave", headers=_auth(uid=1, pelada_id=5))
    assert res.status_code == 200
    assert env.users.removed == (5, 1)
