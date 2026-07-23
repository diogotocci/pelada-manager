import os
from flask import Flask, render_template, jsonify, request, abort

from storage.postgres_storage import PlayerStorage, PeladaStorage, ensure_schema
from services.team_balancer import balance_teams

app = Flask(__name__)

APP_VERSION = os.getenv("APP_VERSION", "2.6.2")
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")

VALID_BIB_COLORS = {"blue", "yellow", "green", "red", "orange", "black", "white", "pink"}

player_storage = PlayerStorage()
pelada_storage = PeladaStorage()

ensure_schema()


def _get_pelada_id() -> int:
    """
    Extract and validate pelada_id from the X-Pelada-Id request header.
    Aborts with 400 if missing or invalid.
    """
    raw = request.headers.get("X-Pelada-Id", "")
    try:
        pelada_id = int(raw)
        if pelada_id <= 0:
            raise ValueError
        return pelada_id
    except (ValueError, TypeError):
        abort(400, description="Missing or invalid X-Pelada-Id header")


def _is_valid_attribute(value: int) -> bool:
    return 1 <= value <= 3


# ============================================================
# Page
# ============================================================

@app.route("/")
def index():
    return render_template(
        "index.html",
        app_version=APP_VERSION,
        admin_secret=ADMIN_SECRET,
    )


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

    if not data or "name" not in data or "password" not in data:
        abort(400, description="Missing 'name' or 'password' field")

    name = data["name"].strip()
    password = data["password"].strip()

    if not name:
        abort(400, description="Name cannot be empty")

    if not password:
        abort(400, description="Password cannot be empty")

    team1_color = data.get("team1_color", "blue")
    team2_color = data.get("team2_color", "yellow")

    if team1_color not in VALID_BIB_COLORS or team2_color not in VALID_BIB_COLORS:
        abort(400, description="Invalid bib color")

    pelada = pelada_storage.create_pelada(
        name=name,
        password=password,
        team1_color=team1_color,
        team2_color=team2_color,
    )
    return jsonify(pelada), 201


@app.route("/api/peladas/<int:pelada_id>/auth", methods=["POST"])
def auth_pelada(pelada_id):
    data = request.get_json()

    if not data or "password" not in data:
        abort(400, description="Missing 'password' field")

    password = data["password"]

    if password == ADMIN_SECRET:
        pelada = pelada_storage.get_pelada(pelada_id)
        if not pelada:
            abort(404, description="Pelada not found")
        return jsonify({"ok": True, "is_admin": True})

    ok = pelada_storage.verify_password(pelada_id, password)
    if not ok:
        return jsonify({"ok": False, "is_admin": False}), 401

    return jsonify({"ok": True, "is_admin": False})


@app.route("/api/peladas/<int:pelada_id>/colors", methods=["PATCH"])
def update_pelada_colors(pelada_id):
    data = request.get_json(silent=True) or {}
    admin_secret = data.get("admin_secret", "")

    if not ADMIN_SECRET or admin_secret != ADMIN_SECRET:
        abort(403, description="Invalid admin secret")

    team1_color = data.get("team1_color")
    team2_color = data.get("team2_color")

    if team1_color not in VALID_BIB_COLORS or team2_color not in VALID_BIB_COLORS:
        abort(400, description="Invalid bib color")

    pelada = pelada_storage.update_pelada_colors(pelada_id, team1_color, team2_color)

    if not pelada:
        abort(404, description="Pelada not found")

    return jsonify(pelada)


@app.route("/api/peladas/<int:pelada_id>", methods=["DELETE"])
def delete_pelada(pelada_id):
    data = request.get_json(silent=True) or {}
    admin_secret = data.get("admin_secret", "")

    if not ADMIN_SECRET or admin_secret != ADMIN_SECRET:
        abort(403, description="Invalid admin secret")

    success = pelada_storage.delete_pelada(pelada_id)

    if not success:
        abort(404, description="Pelada not found")

    return jsonify({"status": "ok"})


# ============================================================
# Players
# ============================================================

@app.route("/api/players", methods=["GET"])
def list_players():
    pelada_id = _get_pelada_id()
    players = player_storage.get_all_players(pelada_id)
    return jsonify([p.to_dict() for p in players])


@app.route("/api/players", methods=["POST"])
def create_player():
    pelada_id = _get_pelada_id()
    data = request.get_json()

    if not data or "name" not in data or "rating" not in data:
        abort(400, description="Missing 'name' or 'rating' field")

    name = data["name"].strip()
    rating = float(data["rating"])
    marking = int(data.get("marking", 2))
    stamina = int(data.get("stamina", 2))
    scoring = int(data.get("scoring", 2))

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

    player = player_storage.add_player(
        pelada_id=pelada_id,
        name=name,
        rating=rating,
        marking=marking,
        stamina=stamina,
        scoring=scoring,
    )

    return jsonify(player.to_dict()), 201


@app.route("/api/players/<int:player_id>", methods=["PUT"])
def update_player(player_id):
    pelada_id = _get_pelada_id()
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

    updated_player = player_storage.update_player(
        pelada_id=pelada_id,
        player_id=player_id,
        name=name,
        rating=rating,
        marking=marking,
        stamina=stamina,
        scoring=scoring,
    )

    if not updated_player:
        abort(404, description="Player not found")

    return jsonify(updated_player.to_dict())


@app.route("/api/players/<int:player_id>", methods=["DELETE"])
def delete_player(player_id):
    pelada_id = _get_pelada_id()
    success = player_storage.delete_player(pelada_id, player_id)

    if not success:
        abort(404, description="Player not found")

    return jsonify({"status": "ok"})


@app.route("/api/players/<int:player_id>/toggle-active", methods=["PATCH"])
def toggle_player_active(player_id):
    pelada_id = _get_pelada_id()
    updated_player = player_storage.toggle_active(pelada_id, player_id)

    if not updated_player:
        abort(404, description="Player not found")

    return jsonify(updated_player.to_dict())


@app.route("/api/players/deactivate-all", methods=["PATCH"])
def deactivate_all_players():
    pelada_id = _get_pelada_id()
    player_storage.deactivate_all_players(pelada_id)
    return jsonify({"status": "ok"})


@app.route("/api/players/set-active-batch", methods=["PATCH"])
def set_active_batch():
    pelada_id = _get_pelada_id()
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
    return jsonify([p.to_dict() for p in updated_players])


@app.route("/api/draw-teams", methods=["POST"])
def draw_teams():
    pelada_id = _get_pelada_id()
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
        result.append(
            {
                "name": f"Time {idx}",
                "total_rating": team["total_rating"],
                "players": [p.to_dict() for p in team["players"]],
            }
        )

    return jsonify({"teams": result})


if __name__ == "__main__":
    app.run(debug=True)