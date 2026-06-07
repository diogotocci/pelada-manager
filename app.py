import os
from flask import Flask, render_template, jsonify, request, abort, send_file

from storage.json_storage import PlayerStorage
from services.team_balancer import balance_teams

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_VERSION = os.getenv("APP_VERSION", "2.0.3")

player_storage = PlayerStorage("data/players.json")


@app.route("/")
def index():
    return render_template("index.html", app_version=APP_VERSION)


@app.route("/api/export-players", methods=["GET"])
def export_players():
    players_file = os.path.join(BASE_DIR, "data", "players.json")

    if not os.path.exists(players_file):
        abort(404, description="Players file not found")

    return send_file(
        players_file,
        as_attachment=True,
        download_name="players.json",
        mimetype="application/json",
    )


@app.route("/api/players", methods=["GET"])
def list_players():
    players = player_storage.get_all_players()
    return jsonify([p.to_dict() for p in players])


@app.route("/api/players", methods=["POST"])
def create_player():
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
        name=name,
        rating=rating,
        marking=marking,
        stamina=stamina,
        scoring=scoring,
    )

    return jsonify(player.to_dict()), 201


@app.route("/api/players/<int:player_id>", methods=["PUT"])
def update_player(player_id):
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
    success = player_storage.delete_player(player_id)

    if not success:
        abort(404, description="Player not found")

    return jsonify({"status": "ok"})


@app.route("/api/players/<int:player_id>/toggle-active", methods=["PATCH"])
def toggle_player_active(player_id):
    updated_player = player_storage.toggle_active(player_id)

    if not updated_player:
        abort(404, description="Player not found")

    return jsonify(updated_player.to_dict())


@app.route("/api/players/deactivate-all", methods=["PATCH"])
def deactivate_all_players():
    player_storage.deactivate_all_players()
    return jsonify({"status": "ok"})


@app.route("/api/players/set-active-batch", methods=["PATCH"])
def set_active_batch():
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

    updated_players = player_storage.set_active_batch(active_ids)
    return jsonify([p.to_dict() for p in updated_players])


@app.route("/api/draw-teams", methods=["POST"])
def draw_teams():
    data = request.get_json()

    if not data or "team_size" not in data:
        abort(400, description="Missing 'team_size' field")

    try:
        team_size = int(data["team_size"])
    except ValueError:
        abort(400, description="'team_size' must be an integer")

    if team_size <= 0:
        abort(400, description="'team_size' must be greater than 0")

    players = [p for p in player_storage.get_all_players() if p.active]

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


def _is_valid_attribute(value: int) -> bool:
    return 1 <= value <= 3


if __name__ == "__main__":
    app.run(debug=True)