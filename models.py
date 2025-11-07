from dataclasses import dataclass, asdict
from typing import Dict


@dataclass
class Player:
    """
    Domain model for a player.
    """
    id: int
    name: str
    rating: float  # 0.0 to 5.0 in 0.5 steps
    active: bool = True  # whether player participates in draw

    def to_dict(self) -> Dict:
        return asdict(self)

    @staticmethod
    def from_dict(data: Dict) -> "Player":
        return Player(
            id=int(data["id"]),
            name=data["name"],
            rating=float(data["rating"]),
            active=bool(data.get("active", True)),
        )
