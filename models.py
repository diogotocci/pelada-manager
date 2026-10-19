from dataclasses import dataclass
from datetime import date
from typing import Dict, Optional


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
    # Field peladas only: main position and a temporary position for the next
    # game day (see services/positions.py).
    position: Optional[str] = None
    day_position: Optional[str] = None
    day_position_until: Optional[date] = None

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
            "position": self.position,
            "day_position": self.day_position,
        }