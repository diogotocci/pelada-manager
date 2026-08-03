import os
from flask import Flask, render_template, jsonify, request, abort, Response, make_response
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from storage.postgres_storage import (
    PlayerStorage,
    PeladaStorage,
    FeedbackStorage,
    ensure_schema,
    count_recent_failures,
    record_failed_attempt,
)
from services.team_balancer import balance_teams

app = Flask(__name__)

APP_VERSION = os.getenv("APP_VERSION", "3.3.15")

VALID_BIB_COLORS = {"blue", "yellow", "green", "red", "orange", "black", "white", "pink"}

VALID_FEEDBACK_CATEGORIES = {"bug", "suggestion", "other"}
FEEDBACK_SUBJECT_MAX = 120
FEEDBACK_MESSAGE_MAX = 2000
FEEDBACK_CONTACT_MAX = 200

# General admin (the /admin feedback inbox) — a single password, separate from
# each pelada's own admin password. Set SUPERADMIN_PASSWORD on Vercel; when it
# is empty the /admin login rejects everything.
SUPERADMIN_PASSWORD = os.getenv("SUPERADMIN_PASSWORD", "")

# Android TWA (app gerado no PWABuilder). Defina os fingerprints SHA-256 na env
# var ANDROID_CERT_FINGERPRINT no Vercel para o app verificar o domínio e
# esconder a barra de URL. Aceita vários separados por vírgula — normalmente a
# chave de upload (PWABuilder) E a chave do Play App Signing (Play Console).
ANDROID_PACKAGE_NAME = os.getenv("ANDROID_PACKAGE_NAME", "xyz.timejusto.twa")
ANDROID_CERT_FINGERPRINT = os.getenv("ANDROID_CERT_FINGERPRINT", "")

# Token signing. SECRET_KEY must be set on Vercel; the fallback only exists so
# local/CI runs work without it (tokens signed with the fallback are not secure).
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-key-change-me")
_serializer = URLSafeTimedSerializer(SECRET_KEY, salt="pelada-token")
TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 days
THROTTLE_LIMIT = 10
THROTTLE_WINDOW = 300  # 5 minutes

player_storage = PlayerStorage()
pelada_storage = PeladaStorage()
feedback_storage = FeedbackStorage()

# Only touch the database when a connection is configured (always on Vercel).
# Keeps `import app` side-effect-free for tests/CI that run without a DB.
if os.getenv("DATABASE_URL"):
    ensure_schema()


def _issue_token(pelada_id: int, is_admin: bool) -> str:
    return _serializer.dumps({"pid": int(pelada_id), "adm": bool(is_admin)})


def _require_pelada():
    """
    Return (pelada_id, is_admin) from the signed Bearer token. The pelada scope
    comes from the token, never from a client-controlled header — a caller can
    only touch the pelada they authenticated into. Aborts 401 otherwise.
    """
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip() if auth.startswith("Bearer ") else ""
    if not token:
        abort(401, description="Missing token")
    try:
        data = _serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except SignatureExpired:
        abort(401, description="Token expired")
    except BadSignature:
        abort(401, description="Invalid token")
    return int(data["pid"]), bool(data.get("adm", False))


def _issue_admin_token() -> str:
    return _serializer.dumps({"sa": True})


def _require_superadmin():
    """Validate the general-admin (superadmin) Bearer token. Aborts 401/403."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip() if auth.startswith("Bearer ") else ""
    if not token:
        abort(401, description="Missing token")
    try:
        data = _serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except SignatureExpired:
        abort(401, description="Token expired")
    except BadSignature:
        abort(401, description="Invalid token")
    if data.get("sa") is not True:
        abort(403, description="Superadmin token required")
    return True


def _optional_pelada_id():
    """Return the pelada id from a valid Bearer token, or None. Never aborts —
    used to tag feedback with its pelada when the caller happens to be logged in."""
    auth = request.headers.get("Authorization", "")
    token = auth[7:].strip() if auth.startswith("Bearer ") else ""
    if not token:
        return None
    try:
        data = _serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except (SignatureExpired, BadSignature):
        return None
    return int(data["pid"])


def _player_json(player, is_admin):
    """Members never receive ratings/attributes — only public fields."""
    if is_admin:
        return player.to_dict()
    return {
        "id": player.id,
        "name": player.name,
        "active": player.active,
        "is_goalkeeper": player.is_goalkeeper,
    }


def _client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _throttle(ip: str, limit: int = THROTTLE_LIMIT, window: int = THROTTLE_WINDOW) -> None:
    # Blocks only when there have been too many recent FAILED attempts. A
    # correct password/key is never counted, so real users are never locked out.
    try:
        failures = count_recent_failures(ip, window)
    except Exception:
        return  # never hard-block auth because the throttle store is down
    if failures >= limit:
        response = make_response(
            jsonify({"error": "Muitas tentativas. Tente novamente mais tarde."}), 429
        )
        response.headers["Retry-After"] = str(window)
        abort(response)


def _record_failure(ip: str) -> None:
    try:
        record_failed_attempt(ip)
    except Exception:
        pass


def _is_valid_attribute(value: int) -> bool:
    return 1 <= value <= 3


def _parse_weekday(value):
    """
    Validate an optional game_weekday value. Returns the int (0-6, Sunday-based
    to match JS Date.getDay()) or None. Aborts with 400 when invalid.
    """
    if value is None:
        return None
    try:
        weekday = int(value)
    except (ValueError, TypeError):
        abort(400, description="Invalid weekday")
    if not 0 <= weekday <= 6:
        abort(400, description="Weekday must be between 0 and 6")
    return weekday


# ============================================================
# Page
# ============================================================

@app.route("/")
def index():
    return render_template(
        "index.html",
        app_version=APP_VERSION,
    )


@app.route("/admin")
def admin_page():
    # General-admin feedback inbox. A standalone page gated by SUPERADMIN_PASSWORD;
    # not linked from the app.
    return render_template("admin.html", app_version=APP_VERSION)


@app.route("/sw.js")
def service_worker():
    # Served from the root so its scope covers the whole site. Rendered from
    # templates/ (bundled on Vercel) so the cache name carries APP_VERSION.
    # no-cache so a new worker is picked up promptly on deploy.
    body = render_template("sw.js", app_version=APP_VERSION)
    response = Response(body, mimetype="application/javascript")
    response.headers["Service-Worker-Allowed"] = "/"
    response.headers["Cache-Control"] = "no-cache, max-age=0"
    return response


@app.route("/.well-known/assetlinks.json")
def assetlinks():
    # Digital Asset Links for the Android TWA. Empty fingerprints until
    # ANDROID_CERT_FINGERPRINT is set. Supports a comma-separated list so both
    # the upload key and the Play App Signing key can be verified.
    fingerprints = [f.strip() for f in ANDROID_CERT_FINGERPRINT.split(",") if f.strip()]
    return jsonify([{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": ANDROID_PACKAGE_NAME,
            "sha256_cert_fingerprints": fingerprints,
        },
    }])


# ============================================================
# Peladas
# ============================================================

@app.route("/api/peladas", methods=["GET"])
def list_peladas():
    peladas = pelada_storage.list_peladas()
    return jsonify(peladas)


@app.route("/api/peladas", methods=["POST"])
def create_pelada():
    data = request.get_json()

    if not data or "name" not in data or "password" not in data or "admin_password" not in data:
        abort(400, description="Missing 'name', 'password' or 'admin_password' field")

    name = data["name"].strip()
    password = data["password"].strip()
    admin_password = data["admin_password"].strip()

    if not name:
        abort(400, description="Name cannot be empty")

    if not password:
        abort(400, description="Password cannot be empty")

    if not admin_password:
        abort(400, description="Admin password cannot be empty")

    team1_color = data.get("team1_color", "blue")
    team2_color = data.get("team2_color", "yellow")

    if team1_color not in VALID_BIB_COLORS or team2_color not in VALID_BIB_COLORS:
        abort(400, description="Invalid bib color")

    game_weekday = _parse_weekday(data.get("game_weekday"))

    pelada = pelada_storage.create_pelada(
        name=name,
        password=password,
        admin_password=admin_password,
        team1_color=team1_color,
        team2_color=team2_color,
        game_weekday=game_weekday,
    )
    pelada["token"] = _issue_token(pelada["id"], True)
    return jsonify(pelada), 201


@app.route("/api/peladas/<int:pelada_id>/auth", methods=["POST"])
def auth_pelada(pelada_id):
    ip = _client_ip()
    _throttle(ip)
    data = request.get_json()

    if not data or "password" not in data:
        abort(400, description="Missing 'password' field")

    password = data["password"]

    # The pelada's own admin password grants an admin token; the access password
    # grants a member token. Admin is checked first so a pelada that reuses the
    # same string for both still gets admin.
    if pelada_storage.verify_admin_password(pelada_id, password):
        return jsonify({"ok": True, "is_admin": True, "token": _issue_token(pelada_id, True)})

    if pelada_storage.verify_password(pelada_id, password):
        return jsonify({"ok": True, "is_admin": False, "token": _issue_token(pelada_id, False)})

    _record_failure(ip)
    return jsonify({"ok": False, "is_admin": False}), 401


@app.route("/api/peladas/<int:pelada_id>/admin", methods=["POST"])
def activate_admin(pelada_id):
    # Upgrade the caller to an admin token for this pelada (used by "ativar modo
    # admin" and by deleting a pelada from the lobby). The admin key is this
    # pelada's own admin password; it stays server-side and is never sent to the
    # client.
    ip = _client_ip()
    _throttle(ip)
    data = request.get_json(silent=True) or {}
    key = data.get("key", "")

    if not pelada_storage.verify_admin_password(pelada_id, key):
        _record_failure(ip)
        abort(403, description="Invalid admin key")

    return jsonify({"ok": True, "token": _issue_token(pelada_id, True)})


@app.route("/api/feedback", methods=["POST"])
def submit_feedback():
    data = request.get_json(silent=True) or {}

    subject = (data.get("subject") or "").strip()
    category = (data.get("category") or "").strip()
    message = (data.get("message") or "").strip()
    contact = (data.get("contact") or "").strip()

    if not subject:
        abort(400, description="Subject cannot be empty")
    if len(subject) > FEEDBACK_SUBJECT_MAX:
        abort(400, description="Subject too long")
    if category not in VALID_FEEDBACK_CATEGORIES:
        abort(400, description="Invalid feedback category")
    if not message:
        abort(400, description="Message cannot be empty")
    if len(message) > FEEDBACK_MESSAGE_MAX:
        abort(400, description="Message too long")
    if len(contact) > FEEDBACK_CONTACT_MAX:
        abort(400, description="Contact too long")

    # The app version is recorded server-side (the deployed version), and the
    # pelada is tagged only when the caller has a valid token.
    feedback_id = feedback_storage.add_feedback(
        subject=subject,
        category=category,
        message=message,
        contact=contact or None,
        app_version=APP_VERSION,
        pelada_id=_optional_pelada_id(),
    )
    return jsonify({"ok": True, "id": feedback_id}), 201


# ============================================================
# General admin (feedback inbox at /admin)
# ============================================================

@app.route("/api/admin/auth", methods=["POST"])
def admin_auth():
    ip = _client_ip()
    _throttle(ip)
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")
    if not SUPERADMIN_PASSWORD or password != SUPERADMIN_PASSWORD:
        _record_failure(ip)
        return jsonify({"ok": False}), 401
    return jsonify({"ok": True, "token": _issue_admin_token()})


@app.route("/api/admin/feedback", methods=["GET"])
def admin_list_feedback():
    _require_superadmin()
    items = feedback_storage.list_feedback()
    unread = sum(1 for f in items if not f["is_read"])
    return jsonify({"feedback": items, "unread": unread})


@app.route("/api/admin/feedback/<int:feedback_id>/read", methods=["POST"])
def admin_mark_read(feedback_id):
    _require_superadmin()
    if not feedback_storage.mark_read(feedback_id):
        abort(404, description="Feedback not found")
    return jsonify({"ok": True})


@app.route("/api/admin/feedback/<int:feedback_id>", methods=["DELETE"])
def admin_delete_feedback(feedback_id):
    _require_superadmin()
    if not feedback_storage.delete_feedback(feedback_id):
        abort(404, description="Feedback not found")
    return jsonify({"ok": True})


@app.route("/api/admin/feedback/<int:feedback_id>/useful", methods=["POST"])
def admin_mark_useful(feedback_id):
    _require_superadmin()
    fb = feedback_storage.get_feedback(feedback_id)
    if not fb:
        abort(404, description="Feedback not found")
    item = feedback_storage.add_useful(
        feedback_id=feedback_id,
        subject=fb["subject"] or fb["message"][:80],
        message=fb["message"],
        category=fb["category"],
    )
    return jsonify(item), 201


@app.route("/api/admin/useful", methods=["GET"])
def admin_list_useful():
    _require_superadmin()
    return jsonify({"useful": feedback_storage.list_useful()})


@app.route("/api/admin/useful/<int:useful_id>", methods=["PATCH"])
def admin_update_useful(useful_id):
    _require_superadmin()
    data = request.get_json(silent=True) or {}
    item = feedback_storage.set_useful_done(useful_id, bool(data.get("done", False)))
    if not item:
        abort(404, description="Useful item not found")
    return jsonify(item)


@app.route("/api/admin/useful/<int:useful_id>", methods=["DELETE"])
def admin_delete_useful(useful_id):
    _require_superadmin()
    if not feedback_storage.delete_useful(useful_id):
        abort(404, description="Useful item not found")
    return jsonify({"ok": True})


@app.route("/api/peladas/<int:pelada_id>/colors", methods=["PATCH"])
def update_pelada_colors(pelada_id):
    pid, adm = _require_pelada()
    if not adm or pid != pelada_id:
        abort(403, description="Admin token required for this pelada")

    data = request.get_json(silent=True) or {}
    team1_color = data.get("team1_color")
    team2_color = data.get("team2_color")

    if team1_color not in VALID_BIB_COLORS or team2_color not in VALID_BIB_COLORS:
        abort(400, description="Invalid bib color")

    pelada = pelada_storage.update_pelada_colors(pelada_id, team1_color, team2_color)

    if not pelada:
        abort(404, description="Pelada not found")

    return jsonify(pelada)


@app.route("/api/peladas/<int:pelada_id>/weekday", methods=["PATCH"])
def update_pelada_weekday(pelada_id):
    pid, adm = _require_pelada()
    if not adm or pid != pelada_id:
        abort(403, description="Admin token required for this pelada")

    data = request.get_json(silent=True) or {}
    game_weekday = _parse_weekday(data.get("game_weekday"))

    pelada = pelada_storage.set_weekday(pelada_id, game_weekday)

    if not pelada:
        abort(404, description="Pelada not found")

    return jsonify(pelada)


@app.route("/api/peladas/<int:pelada_id>", methods=["DELETE"])
def delete_pelada(pelada_id):
    pid, adm = _require_pelada()
    if not adm or pid != pelada_id:
        abort(403, description="Admin token required for this pelada")

    success = pelada_storage.delete_pelada(pelada_id)

    if not success:
        abort(404, description="Pelada not found")

    return jsonify({"status": "ok"})


# ============================================================
# Players
# ============================================================

@app.route("/api/players", methods=["GET"])
def list_players():
    pelada_id, adm = _require_pelada()
    players = player_storage.get_all_players(pelada_id)
    return jsonify([_player_json(p, adm) for p in players])


@app.route("/api/players", methods=["POST"])
def create_player():
    pelada_id, adm = _require_pelada()
    data = request.get_json()

    if not data or "name" not in data or "rating" not in data:
        abort(400, description="Missing 'name' or 'rating' field")

    name = data["name"].strip()
    rating = float(data["rating"])
    marking = int(data.get("marking", 2))
    stamina = int(data.get("stamina", 2))
    scoring = int(data.get("scoring", 2))
    is_goalkeeper = bool(data.get("is_goalkeeper", False))
    gk_footwork = int(data.get("gk_footwork", 1))

    if not name:
        abort(400, description="Name cannot be empty")

    if rating < 0 or rating > 5:
        abort(400, description="Rating must be between 0 and 5")

    if not _is_valid_attribute(marking):
        abort(400, description="Marking must be between 1 and 3")

    if not _is_valid_attribute(stamina):
        abort(400, description="Stamina must be between 1 and 3")

    if not _is_valid_attribute(scoring):
        abort(400, description="Scoring must be between 1 and 3")

    if not _is_valid_attribute(gk_footwork):
        abort(400, description="Footwork must be between 1 and 3")

    player = player_storage.add_player(
        pelada_id=pelada_id,
        name=name,
        rating=rating,
        marking=marking,
        stamina=stamina,
        scoring=scoring,
        is_goalkeeper=is_goalkeeper,
        gk_footwork=gk_footwork,
    )

    return jsonify(_player_json(player, adm)), 201


@app.route("/api/players/<int:player_id>", methods=["PUT"])
def update_player(player_id):
    pelada_id, adm = _require_pelada()
    if not adm:
        abort(403, description="Admin token required")
    data = request.get_json()

    if not data:
        abort(400, description="Missing body")

    name = (data.get("name") or "").strip()
    rating = data.get("rating")

    if not name:
        abort(400, description="Name cannot be empty")

    if rating is None:
        abort(400, description="Rating is required")

    rating = float(rating)

    if rating < 0 or rating > 5:
        abort(400, description="Rating must be between 0 and 5")

    marking = data.get("marking")
    stamina = data.get("stamina")
    scoring = data.get("scoring")
    gk_footwork = data.get("gk_footwork")

    is_goalkeeper = data.get("is_goalkeeper")
    if is_goalkeeper is not None:
        is_goalkeeper = bool(is_goalkeeper)

    if marking is not None:
        marking = int(marking)
        if not _is_valid_attribute(marking):
            abort(400, description="Marking must be between 1 and 3")

    if stamina is not None:
        stamina = int(stamina)
        if not _is_valid_attribute(stamina):
            abort(400, description="Stamina must be between 1 and 3")

    if scoring is not None:
        scoring = int(scoring)
        if not _is_valid_attribute(scoring):
            abort(400, description="Scoring must be between 1 and 3")

    if gk_footwork is not None:
        gk_footwork = int(gk_footwork)
        if not _is_valid_attribute(gk_footwork):
            abort(400, description="Footwork must be between 1 and 3")

    updated_player = player_storage.update_player(
        pelada_id=pelada_id,
        player_id=player_id,
        name=name,
        rating=rating,
        marking=marking,
        stamina=stamina,
        scoring=scoring,
        is_goalkeeper=is_goalkeeper,
        gk_footwork=gk_footwork,
    )

    if not updated_player:
        abort(404, description="Player not found")

    return jsonify(_player_json(updated_player, adm))


@app.route("/api/players/<int:player_id>", methods=["DELETE"])
def delete_player(player_id):
    pelada_id, adm = _require_pelada()
    if not adm:
        abort(403, description="Admin token required")
    success = player_storage.delete_player(pelada_id, player_id)

    if not success:
        abort(404, description="Player not found")

    return jsonify({"status": "ok"})


@app.route("/api/players/<int:player_id>/toggle-active", methods=["PATCH"])
def toggle_player_active(player_id):
    pelada_id, adm = _require_pelada()
    updated_player = player_storage.toggle_active(pelada_id, player_id)

    if not updated_player:
        abort(404, description="Player not found")

    return jsonify(_player_json(updated_player, adm))


@app.route("/api/players/deactivate-all", methods=["PATCH"])
def deactivate_all_players():
    pelada_id, _adm = _require_pelada()
    player_storage.deactivate_all_players(pelada_id)
    return jsonify({"status": "ok"})


@app.route("/api/players/set-active-batch", methods=["PATCH"])
def set_active_batch():
    pelada_id, adm = _require_pelada()
    data = request.get_json()

    if not data or "active_ids" not in data:
        abort(400, description="Missing 'active_ids' field")

    active_ids = data["active_ids"]

    if not isinstance(active_ids, list):
        abort(400, description="'active_ids' must be a list")

    try:
        active_ids = [int(i) for i in active_ids]
    except (ValueError, TypeError):
        abort(400, description="'active_ids' must contain integers")

    updated_players = player_storage.set_active_batch(pelada_id, active_ids)
    return jsonify([_player_json(p, adm) for p in updated_players])


@app.route("/api/draw-teams", methods=["POST"])
def draw_teams():
    pelada_id, adm = _require_pelada()
    data = request.get_json()

    if not data or "team_size" not in data:
        abort(400, description="Missing 'team_size' field")

    try:
        team_size = int(data["team_size"])
    except ValueError:
        abort(400, description="'team_size' must be an integer")

    if team_size <= 0:
        abort(400, description="'team_size' must be greater than 0")

    players = [p for p in player_storage.get_all_players(pelada_id) if p.active]

    if len(players) == 0:
        abort(400, description="No active players to draw teams")

    teams = balance_teams(players, team_size)

    result = []
    for idx, team in enumerate(teams, start=1):
        entry = {
            "name": f"Time {idx}",
            "players": [_player_json(p, adm) for p in team["players"]],
        }
        if adm:
            entry["total_rating"] = team["total_rating"]
        result.append(entry)

    return jsonify({"teams": result})


if __name__ == "__main__":
    app.run(debug=True)