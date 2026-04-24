from dataclasses import dataclass


@dataclass
class Player:
    id: int
    name: str
    rating: float
    active: bool = True

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "rating": self.rating,
            "active": self.active,
        }

    @staticmethod
    def from_dict(data):
        return Player(
            id=int(data["id"]),
            name=data["name"],
            rating=float(data["rating"]),
            active=bool(data.get("active", True)),
        )