from models import Player

import app


def _player():
    return Player(
        id=1,
        name="Joao",
        rating=4.5,
        active=True,
        marking=3,
        stamina=2,
        scoring=1,
        is_goalkeeper=True,
        gk_footwork=2,
    )


def test_admin_receives_full_player():
    player = _player()
    data = app._player_json(player, True)
    assert data == player.to_dict()
    assert data["rating"] == 4.5


def test_member_receives_only_public_fields():
    player = _player()
    data = app._player_json(player, False)

    # Exactly the public fields — no more.
    assert set(data.keys()) == {"id", "name", "active", "is_goalkeeper"}

    # Ratings/attributes must never leak to a non-admin (this is the #33 fix).
    for sensitive in ("rating", "marking", "stamina", "scoring", "gk_footwork"):
        assert sensitive not in data

    assert data["id"] == 1
    assert data["name"] == "Joao"
    assert data["active"] is True
    assert data["is_goalkeeper"] is True
