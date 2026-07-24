from dataclasses import dataclass
from typing import Dict


@dataclass
class Player:
    id: int
    name: str
    rating: float
    active: bool = True
    marking: int = 2
    stamina: int = 2
    scoring: int = 2
    is_goalkeeper: bool = False
    gk_footwork: int = 1

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "rating": self.rating,
            "active": self.active,
            "marking": self.marking,
            "stamina": self.stamina,
            "scoring": self.scoring,
            "is_goalkeeper": self.is_goalkeeper,
            "gk_footwork": self.gk_footwork,
        }

    @staticmethod
    def from_dict(data: Dict) -> "Player":
        return Player(
            id=int(data["id"]),
            name=data["name"],
            rating=float(data["rating"]),
            active=bool(data.get("active", True)),
            marking=int(data.get("marking", 2)),
            stamina=int(data.get("stamina", 2)),
            scoring=int(data.get("scoring", 2)),
            is_goalkeeper=bool(data.get("is_goalkeeper", False)),
            gk_footwork=int(data.get("gk_footwork", 1)),
        )