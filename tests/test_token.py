import pytest
from werkzeug.exceptions import Unauthorized

import app


def _ctx(token=None):
    headers = {}
    if token is not None:
        headers["Authorization"] = "Bearer " + token
    return app.app.test_request_context(headers=headers)


def test_issue_and_require_roundtrip_admin():
    token = app._issue_token(7, True)
    with _ctx(token):
        pid, adm = app._require_pelada()
    assert pid == 7
    assert adm is True


def test_member_token_not_admin():
    token = app._issue_token(3, False)
    with _ctx(token):
        pid, adm = app._require_pelada()
    assert pid == 3
    assert adm is False


def test_missing_token_401():
    with _ctx(None):
        with pytest.raises(Unauthorized):
            app._require_pelada()


def test_tampered_token_401():
    token = app._issue_token(5, True) + "x"
    with _ctx(token):
        with pytest.raises(Unauthorized):
            app._require_pelada()


def test_expired_token_401(monkeypatch):
    token = app._issue_token(9, False)
    monkeypatch.setattr(app, "TOKEN_MAX_AGE", -1)
    with _ctx(token):
        with pytest.raises(Unauthorized):
            app._require_pelada()
