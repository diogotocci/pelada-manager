import os
from flask import Flask, render_template, jsonify, request, abort, send_file

from storage.json_storage import PlayerStorage
from services.team_balancer import balance_teams

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PASSWORD_FILE = os.path.join(BASE_DIR, "password.txt")
APP_VERSION = os.getenv("APP_VERSION", "0.4.0")

player_storage = PlayerStorage("data/players.json")


@app.route("/")
def index():
    return render_template("index.html", app_version=APP_VERSION)


@app.route("/api/check-password", methods=["POST"])
def check_password():
    data = request.get_json() or {}
    supplied = (data.get("password") or "").strip()

    if not supplied:
        abort(400, description="Password is required")

    try:
        with open(PASSWORD_FILE, "r", encoding="utf-8") as f:
            real = f.read().strip()
    except FileNotFoundError:
        abort(500, description="Password file not found on server")

    if supplied == real:
        return jsonify({"valid": True})

    return jsonify({"valid": False}), 401


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

    if not name:
        abort(400, description="Name cannot be empty")

    if rating < 0 or rating > 5:
        abort(400, description="Rating must be between 0 and 5")

    player = player_storage.add_player(name=name, rating=rating)
    return jsonify(player.to_dict()), 201


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


@app.route("/api/players/<int:player_id>/change-request", methods=["POST"])
def create_change_request(player_id):
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

    request_item = player_storage.create_change_request(
        player_id=player_id,
        requested_name=name,
        requested_rating=rating,
    )

    if not request_item:
        abort(404, description="Player not found")

    return jsonify(request_item), 201


@app.route("/api/pending-requests", methods=["GET"])
def list_pending_requests():
    return jsonify(player_storage.get_pending_change_requests())


@app.route("/api/change-requests/<int:request_id>/approve", methods=["POST"])
def approve_change_request(request_id):
    success = player_storage.approve_change_request(request_id)

    if not success:
        abort(404, description="Change request not found")

    return jsonify({"status": "approved"})


@app.route("/api/change-requests/<int:request_id>/reject", methods=["POST"])
def reject_change_request(request_id):
    success = player_storage.reject_change_request(request_id)

    if not success:
        abort(404, description="Change request not found")

    return jsonify({"status": "rejected"})


@app.route("/api/draw-teams", methods=["POST"])
def draw_teams():
    data = request.get_json()

    if not data or "team_size" not in data:
        abort(400, description="Missing 'team_size' field")

    team_size = int(data["team_size"])

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


if __name__ == "__main__":
    app.run(debug=True)