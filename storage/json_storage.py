import json
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional

from models import Player


class PlayerStorage:
    """
    JSON-based storage for players.
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
                    "players": [],
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
        data.setdefault("players", [])

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

    def update_player(self, player_id: int, name: str, rating: float) -> Optional[Player]:
        data = self._load()
        updated_player = None

        for p in data.get("players", []):
            if int(p["id"]) == player_id:
                p["name"] = name
                p["rating"] = rating
                updated_player = Player.from_dict(p)
                break

        if updated_player is None:
            return None

        self._save(data)
        return updated_player

    def delete_player(self, player_id: int) -> bool:
        data = self._load()
        players = data.get("players", [])

        new_players = [p for p in players if int(p["id"]) != player_id]

        if len(new_players) == len(players):
            return False

        data["players"] = new_players
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