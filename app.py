from flask import Flask, render_template, jsonify, request, abort
from storage.json_storage import PlayerStorage
from services.team_balancer import balance_teams
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PASSWORD_FILE = os.path.join(BASE_DIR, "password.txt")
APP_VERSION = os.getenv("APP_VERSION", "0.0.2")


app = Flask(__name__)

# Initialize storage with JSON file
player_storage = PlayerStorage("data/players.json")


@app.route("/")
def index():
    return render_template("index.html", app_version=APP_VERSION)


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


@app.route("/api/players/<int:player_id>", methods=["PUT"])
def update_player(player_id):
    data = request.get_json()
    if not data:
        abort(400, description="Missing body")

    name = data.get("name")
    rating = data.get("rating")

    if name is None or rating is None:
        abort(400, description="Both 'name' and 'rating' are required")

    name = name.strip()
    rating = float(rating)

    if not name:
        abort(400, description="Name cannot be empty")

    if rating < 0 or rating > 5:
        abort(400, description="Rating must be between 0 and 5")

    updated_player = player_storage.update_player(player_id, name, rating)
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

    # Convert players to dict on each team
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
    else:
        # 401 = Unauthorized
        return jsonify({"valid": False}), 401


if __name__ == "__main__":
    # Simple dev server
    app.run(debug=True)
