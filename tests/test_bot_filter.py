"""Scanner probes (WordPress, PHP, leaked config files) get a bare 404 before
any route runs, while the app's real paths keep working."""

import pytest

import app
from services.bot_filter import is_scanner_probe


@pytest.mark.parametrize("path", [
    "/wp-admin/install.php",
    "/wp-login.php",
    "/WP-ADMIN/",
    "/wp-content/plugins/x/readme.txt",
    "/blog/wp-admin/setup-config.php",
    "/wordpress/",
    "/xmlrpc.php",
    "/index.php",
    "/admin.aspx",
    "/.env",
    "/.env.production",
    "/.git/config",
    "/phpmyadmin/",
    "/cgi-bin/luci",
    "/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php",
    "/backup.sql",
])
def test_scanner_paths_are_detected(path):
    assert is_scanner_probe(path)


@pytest.mark.parametrize("path", [
    "",
    "/",
    "/admin",
    "/sw.js",
    "/.well-known/assetlinks.json",
    "/entrar/abc123",
    "/api/players",
    "/api/admin/feedback/3",
    "/static/js/ui.js",
    "/static/manifest.json",
])
def test_app_paths_are_not_detected(path):
    assert not is_scanner_probe(path)


def test_probe_gets_plain_404_without_reaching_routes(monkeypatch):
    def boom(*args, **kwargs):
        raise AssertionError("route should not run")

    monkeypatch.setattr(app, "render_template", boom)
    resp = app.app.test_client().get("/wp-admin/install.php?step=1")
    assert resp.status_code == 404
    assert resp.mimetype == "text/plain"
    assert resp.get_data(as_text=True) == "Not Found"


def test_real_route_still_served():
    resp = app.app.test_client().get("/.well-known/assetlinks.json")
    assert resp.status_code == 200
