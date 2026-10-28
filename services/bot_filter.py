"""Detect requests from internet scanners probing for common vulnerabilities.

Bots crawl every domain looking for WordPress installs, PHP admin panels and
leaked config files. None of those exist in this Flask app, so such requests
are answered with a bare 404 before any route, template or database work.
"""

import re

# Path prefixes (lowercase) that only scanners ask for.
SCANNER_PREFIXES = (
    "/wp-",
    "/wordpress",
    "/xmlrpc",
    "/phpmyadmin",
    "/pma",
    "/cgi-bin",
    "/vendor/",
    "/.env",
    "/.git",
    "/.aws",
    "/.ssh",
    "/.svn",
    "/.ds_store",
)

# File extensions (lowercase) the app never serves.
SCANNER_EXTENSIONS = (".php", ".asp", ".aspx", ".jsp", ".cgi", ".bak", ".sql")

# WordPress folders also probed under a sub-path, e.g. "/blog/wp-admin/".
_WP_SEGMENT_RE = re.compile(r"/wp-(admin|content|includes|login|json)\b")


def is_scanner_probe(path):
    """Return True when the request path is a known scanner probe."""
    if not path:
        return False
    path = path.lower()
    if path.startswith(SCANNER_PREFIXES):
        return True
    if path.endswith(SCANNER_EXTENSIONS):
        return True
    return bool(_WP_SEGMENT_RE.search(path))
