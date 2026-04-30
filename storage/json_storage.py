import json
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional

from models import Player


class PlayerStorage:
    """
    JSON-based storage for players and pending change requests.
    """

    def __init__(self, filepath: str):
        self.path = Path(filepath)
        self._lock = Lock()
        self._ensure_file_exists()

    def _ensure_file_exists(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)

        if not self.path.exists():
            self._write_empty()

    def _write_empty(self) -> None:
        self.path.write_text(
            json.dumps(
                {
                    "last_id": 0,
                    "last_request_id": 0,
                    "players": [],
                    "change_requests": [],
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    def _load(self) -> Dict:
        with self._lock:
            try:
                raw = self.path.read_text(encoding="utf-8")

                if not raw.strip():
                    self._write_empty()
                    raw = self.path.read_text(encoding="utf-8")

                data = json.loads(raw)
            except (json.JSONDecodeError, FileNotFoundError):
                self._write_empty()
                data = json.loads(self.path.read_text(encoding="utf-8"))

        data.setdefault("last_id", 0)
        data.setdefault("last_request_id", 0)
        data.setdefault("players", [])
        data.setdefault("change_requests", [])

        return data

    def _save(self, data: Dict) -> None:
        with self._lock:
            self.path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    def get_all_players(self) -> List[Player]:
        data = self._load()
        return [Player.from_dict(p) for p in data.get("players", [])]

    def add_player(self, name: str, rating: float) -> Player:
        data = self._load()

        new_id = int(data.get("last_id", 0)) + 1
        data["last_id"] = new_id

        player = Player(
            id=new_id,
            name=name,
            rating=rating,
            active=True,
        )

        data["players"].append(player.to_dict())
        self._save(data)

        return player

    def delete_player(self, player_id: int) -> bool:
        data = self._load()
        players = data.get("players", [])

        new_players = [p for p in players if int(p["id"]) != player_id]

        if len(new_players) == len(players):
            return False

        data["players"] = new_players

        # Remove pending requests for deleted player
        data["change_requests"] = [
            r for r in data.get("change_requests", [])
            if int(r["player_id"]) != player_id
        ]

        self._save(data)
        return True

    def toggle_active(self, player_id: int) -> Optional[Player]:
        data = self._load()
        updated_player = None

        for p in data.get("players", []):
            if int(p["id"]) == player_id:
                p["active"] = not bool(p.get("active", True))
                updated_player = Player.from_dict(p)
                break

        if updated_player is None:
            return None

        self._save(data)
        return updated_player

    def deactivate_all_players(self) -> None:
        data = self._load()

        for p in data.get("players", []):
            p["active"] = False

        self._save(data)

    def create_change_request(
        self,
        player_id: int,
        requested_name: str,
        requested_rating: float,
    ) -> Optional[Dict]:
        data = self._load()

        player = self._find_player_dict(data, player_id)
        if player is None:
            return None

        new_request_id = int(data.get("last_request_id", 0)) + 1
        data["last_request_id"] = new_request_id

        request_item = {
            "id": new_request_id,
            "player_id": player_id,
            "player_name": player["name"],
            "current_name": player["name"],
            "current_rating": float(player["rating"]),
            "requested_name": requested_name,
            "requested_rating": requested_rating,
            "status": "pending",
        }

        data["change_requests"].append(request_item)
        self._save(data)

        return request_item

    def get_pending_change_requests(self) -> List[Dict]:
        data = self._load()
        players_by_id = {
            int(p["id"]): p
            for p in data.get("players", [])
        }

        pending = []

        for request_item in data.get("change_requests", []):
            if request_item.get("status") != "pending":
                continue

            player_id = int(request_item["player_id"])
            player = players_by_id.get(player_id)

            if not player:
                continue

            pending.append(
                {
                    **request_item,
                    "player_name": player["name"],
                    "current_name": player["name"],
                    "current_rating": float(player["rating"]),
                }
            )

        return pending

    def approve_change_request(self, request_id: int) -> bool:
        data = self._load()
        request_item = self._find_request_dict(data, request_id)

        if request_item is None or request_item.get("status") != "pending":
            return False

        player = self._find_player_dict(data, int(request_item["player_id"]))
        if player is None:
            return False

        player["name"] = request_item["requested_name"]
        player["rating"] = float(request_item["requested_rating"])
        request_item["status"] = "approved"

        self._save(data)
        return True

    def reject_change_request(self, request_id: int) -> bool:
        data = self._load()
        request_item = self._find_request_dict(data, request_id)

        if request_item is None or request_item.get("status") != "pending":
            return False

        request_item["status"] = "rejected"

        self._save(data)
        return True

    def _find_player_dict(self, data: Dict, player_id: int) -> Optional[Dict]:
        for player in data.get("players", []):
            if int(player["id"]) == player_id:
                return player
        return None

    def _find_request_dict(self, data: Dict, request_id: int) -> Optional[Dict]:
        for request_item in data.get("change_requests", []):
            if int(request_item["id"]) == request_id:
                return request_item
        return None