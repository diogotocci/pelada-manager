import json
import os
from pathlib import Path
from typing import List, Optional
from threading import Lock

from models import Player


class PlayerStorage:
    """
    JSON-based storage for players.
    Simple and safe enough for a small project.
    """

    def __init__(self, filepath: str):
        # Use pathlib to handle paths robustly
        self.path = Path(filepath)
        self._lock = Lock()
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        # Create directory if needed (ignore if it's ".")
        if self.path.parent and str(self.path.parent) not in ("", "."):
            self.path.parent.mkdir(parents=True, exist_ok=True)

        if not self.path.exists():
            self._write_empty()

    def _write_empty(self):
        empty_data = {"last_id": 0, "players": []}
        self.path.write_text(
            json.dumps(empty_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _load(self) -> dict:
        with self._lock:
            try:
                raw = self.path.read_text(encoding="utf-8")
                if not raw.strip():
                    # Arquivo vazio? recria.
                    self._write_empty()
                    raw = self.path.read_text(encoding="utf-8")
                data = json.loads(raw)
            except json.JSONDecodeError:
                # JSON zoado? zera o arquivo pra não quebrar o app.
                self._write_empty()
                data = {"last_id": 0, "players": []}

        # Garantir chaves básicas
        data.setdefault("last_id", 0)
        data.setdefault("players", [])
        return data

    def _save(self, data: dict):
        with self._lock:
            self.path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    def get_all_players(self) -> List[Player]:
        data = self._load()
        return [Player.from_dict(p) for p in data.get("players", [])]

    def _get_next_id(self, data: dict) -> int:
        last_id = int(data.get("last_id", 0)) + 1
        data["last_id"] = last_id
        return last_id

    def add_player(self, name: str, rating: float) -> Player:
        data = self._load()
        new_id = self._get_next_id(data)

        player = Player(id=new_id, name=name, rating=rating, active=True)
        players = data.get("players", [])
        players.append(player.to_dict())
        data["players"] = players
        self._save(data)
        return player

    def update_player(self, player_id: int, name: str, rating: float) -> Optional[Player]:
        data = self._load()
        players = data.get("players", [])
        updated_player = None

        for p in players:
            if int(p["id"]) == player_id:
                p["name"] = name
                p["rating"] = rating
                updated_player = Player.from_dict(p)
                break

        if updated_player is None:
            return None

        data["players"] = players
        self._save(data)
        return updated_player

    def delete_player(self, player_id: int) -> bool:
        data = self._load()
        players = data.get("players", [])
        new_players = [p for p in players if int(p["id"]) != player_id]

        if len(new_players) == len(players):
            # nenhum removido
            return False

        data["players"] = new_players
        self._save(data)
        return True

    def toggle_active(self, player_id: int) -> Optional[Player]:
        data = self._load()
        players = data.get("players", [])
        updated_player = None

        for p in players:
            if int(p["id"]) == player_id:
                p["active"] = not bool(p.get("active", True))
                updated_player = Player.from_dict(p)
                break

        if updated_player is None:
            return None

        data["players"] = players
        self._save(data)
        return updated_player
