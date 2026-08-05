"""General-admin (/admin) feedback inbox: authorization (by Google email) and
actions. Storage is mocked, so this runs without a database."""

import pytest

import app


class FakeUsers:
    # uid 1 is the superadmin (matches SUPERADMIN_EMAIL below); uid 2 is not.
    EMAILS = {1: "boss@x.com", 2: "other@x.com"}

    def get_user(self, uid):
        if uid not in self.EMAILS:
            return None
        return {"id": uid, "email": self.EMAILS[uid], "name": "U", "picture": None}


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
    monkeypatch.setattr(app, "user_storage", FakeUsers())
    monkeypatch.setattr(app, "SUPERADMIN_EMAIL", "boss@x.com")
    c = app.app.test_client()
    c.store = store
    return c


def _auth(uid=1):
    return {"Authorization": "Bearer " + app._issue_session_token(uid)}


# --- authorization ----------------------------------------------------

def test_admin_requires_login(client):
    assert client.get("/api/admin/feedback").status_code == 401


def test_non_superadmin_is_forbidden(client):
    res = client.get("/api/admin/feedback", headers=_auth(2))  # other@x.com
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
