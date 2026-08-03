"""General-admin (/admin) feedback inbox: auth, authorization and actions.

Storage and the rate-limit store are mocked, so this runs without a database."""

import pytest

import app


class FakeStore:
    def __init__(self):
        self.feedback = [
            {"id": 1, "subject": "Bug X", "category": "bug", "message": "trava",
             "contact": None, "app_version": "3.3.8", "pelada_id": 4,
             "is_read": False, "created_at": None},
            {"id": 2, "subject": "Ideia", "category": "suggestion", "message": "modo escuro",
             "contact": "a@b.com", "app_version": "3.3.8", "pelada_id": None,
             "is_read": True, "created_at": None},
        ]
        self.useful = []

    def list_feedback(self):
        return list(self.feedback)

    def get_feedback(self, fid):
        return next((f for f in self.feedback if f["id"] == fid), None)

    def mark_read(self, fid):
        f = self.get_feedback(fid)
        if not f:
            return False
        f["is_read"] = True
        return True

    def delete_feedback(self, fid):
        if not self.get_feedback(fid):
            return False
        self.feedback = [x for x in self.feedback if x["id"] != fid]
        return True

    def add_useful(self, feedback_id, subject, message, category):
        item = {"id": 99, "feedback_id": feedback_id, "subject": subject,
                "message": message, "category": category, "done": False, "created_at": None}
        self.useful.append(item)
        return item

    def list_useful(self):
        return list(self.useful)

    def set_useful_done(self, uid, done):
        it = next((u for u in self.useful if u["id"] == uid), None)
        if not it:
            return None
        it["done"] = done
        return it

    def delete_useful(self, uid):
        before = len(self.useful)
        self.useful = [u for u in self.useful if u["id"] != uid]
        return len(self.useful) < before


@pytest.fixture
def client(monkeypatch):
    store = FakeStore()
    monkeypatch.setattr(app, "feedback_storage", store)
    monkeypatch.setattr(app, "SUPERADMIN_PASSWORD", "secret-pass")
    monkeypatch.setattr(app, "count_recent_failures", lambda ip, w: 0)
    monkeypatch.setattr(app, "record_failed_attempt", lambda ip: None)
    c = app.app.test_client()
    c.store = store
    return c


def _auth():
    return {"Authorization": "Bearer " + app._issue_admin_token()}


# --- auth -------------------------------------------------------------

def test_admin_auth_success_returns_superadmin_token(client):
    res = client.post("/api/admin/auth", json={"password": "secret-pass"})
    data = res.get_json()
    assert res.status_code == 200
    assert data["ok"] is True
    assert app._serializer.loads(data["token"])["sa"] is True


def test_admin_auth_wrong_password_rejected(client):
    res = client.post("/api/admin/auth", json={"password": "nope"})
    assert res.status_code == 401


def test_admin_auth_disabled_when_no_password_set(client, monkeypatch):
    monkeypatch.setattr(app, "SUPERADMIN_PASSWORD", "")
    res = client.post("/api/admin/auth", json={"password": ""})
    assert res.status_code == 401


# --- authorization ----------------------------------------------------

def test_admin_routes_require_a_token(client):
    assert client.get("/api/admin/feedback").status_code == 401


def test_pelada_token_is_not_accepted_as_superadmin(client):
    pelada_token = app._issue_token(1, True)  # admin of a pelada, but not superadmin
    res = client.get("/api/admin/feedback", headers={"Authorization": "Bearer " + pelada_token})
    assert res.status_code == 403


# --- feedback actions -------------------------------------------------

def test_list_feedback_reports_unread_count(client):
    res = client.get("/api/admin/feedback", headers=_auth())
    data = res.get_json()
    assert res.status_code == 200
    assert len(data["feedback"]) == 2
    assert data["unread"] == 1  # only id=1 is unread


def test_mark_read(client):
    res = client.post("/api/admin/feedback/1/read", headers=_auth())
    assert res.status_code == 200
    assert client.store.get_feedback(1)["is_read"] is True


def test_mark_read_missing_is_404(client):
    assert client.post("/api/admin/feedback/999/read", headers=_auth()).status_code == 404


def test_delete_feedback(client):
    res = client.delete("/api/admin/feedback/1", headers=_auth())
    assert res.status_code == 200
    assert client.store.get_feedback(1) is None


def test_mark_useful_copies_feedback_fields(client):
    res = client.post("/api/admin/feedback/1/useful", headers=_auth())
    data = res.get_json()
    assert res.status_code == 201
    assert data["subject"] == "Bug X"
    assert data["message"] == "trava"
    assert data["category"] == "bug"
    assert len(client.store.useful) == 1


def test_mark_useful_missing_feedback_is_404(client):
    assert client.post("/api/admin/feedback/999/useful", headers=_auth()).status_code == 404


# --- useful (to-do) list ---------------------------------------------

def test_useful_lifecycle(client):
    client.post("/api/admin/feedback/2/useful", headers=_auth())

    listed = client.get("/api/admin/useful", headers=_auth()).get_json()
    assert len(listed["useful"]) == 1

    done = client.patch("/api/admin/useful/99", json={"done": True}, headers=_auth()).get_json()
    assert done["done"] is True

    assert client.delete("/api/admin/useful/99", headers=_auth()).status_code == 200
    assert client.get("/api/admin/useful", headers=_auth()).get_json()["useful"] == []
