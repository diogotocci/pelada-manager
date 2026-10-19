"""Field positions: sport type, day positions and the position spread in the
draw. Storage is mocked, so this runs without a database."""

import random
from datetime import date, datetime, timezone

import pytest

import app
from models import Player
from services.positions import day_position_until, effective_position, today_local
from services.team_balancer import balance_teams


@pytest.fixture(autouse=True)
def _seed():
    random.seed(4321)


# ---- services/positions ----------------------------------------------------

def test_today_local_uses_brazil_time():
    # 01:00 UTC is still the previous day in Brazil (UTC-3).
    assert today_local(datetime(2026, 10, 20, 1, 0, tzinfo=timezone.utc)) == date(2026, 10, 19)


def test_day_position_until_next_game_day():
    monday = date(2026, 10, 19)
    assert day_position_until(monday, 1) == monday               # game today
    assert day_position_until(monday, 6) == date(2026, 10, 24)   # Saturday
    assert day_position_until(monday, 0) == date(2026, 10, 25)   # Sunday


def test_day_position_until_without_weekday_is_today():
    assert day_position_until(date(2026, 10, 19), None) == date(2026, 10, 19)


def test_effective_position_reverts_after_game_day():
    until = date(2026, 10, 24)
    assert effective_position("forward", "defender", until, date(2026, 10, 24)) == "defender"
    assert effective_position("forward", "defender", until, date(2026, 10, 25)) == "forward"
    assert effective_position("forward", None, None, date(2026, 10, 24)) == "forward"


# ---- app helpers -------------------------------------------------------------

def test_apply_day_positions_uses_day_position_and_keeper_flag():
    today = date(2026, 10, 24)
    players = [
        Player(1, "A", 3.0, position="forward", day_position="goalkeeper", day_position_until=today),
        Player(2, "B", 3.0, position="goalkeeper", is_goalkeeper=True,
               day_position="defender", day_position_until=date(2026, 10, 1)),
        Player(3, "C", 3.0),
    ]
    out = app._apply_day_positions(players, today)
    assert (out[0].position, out[0].is_goalkeeper) == ("goalkeeper", True)
    assert (out[1].position, out[1].is_goalkeeper) == ("goalkeeper", True)  # expired day position
    assert out[2].position is None and out[2].is_goalkeeper is False
    assert players[0].position == "forward"  # input not mutated


def test_player_json_hides_expired_day_position():
    expired = Player(1, "A", 3.0, position="forward", day_position="defender",
                     day_position_until=date(2000, 1, 1))
    assert app._player_json(expired, False)["day_position"] is None
    assert app._player_json(expired, True)["day_position"] is None


# ---- routes ----------------------------------------------------------------

class FakeUsers:
    def __init__(self, role="member"):
        self.role = role

    def get_user(self, user_id):
        return {"id": user_id, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        return self.role


class FakePeladas:
    def __init__(self, sport_type="field", weekday=6):
        self.pelada = {"id": 1, "name": "P", "sport_type": sport_type, "game_weekday": weekday}
        self.created = None

    def get_pelada(self, pelada_id):
        return self.pelada

    def create_pelada_owned(self, name, owner_user_id, team1_color, team2_color, game_weekday, sport_type="futsal"):
        self.created = {"sport_type": sport_type}
        return {"id": 9, "name": name, "role": "owner", "sport_type": sport_type}


class FakePlayers:
    def __init__(self):
        self.calls = []

    def set_day_position(self, pelada_id, player_id, position, until):
        self.calls.append((pelada_id, player_id, position, until))
        if player_id != 7:
            return None
        return Player(7, "Fulano", 3.0, position="forward", day_position=position, day_position_until=until)


@pytest.fixture
def env(monkeypatch):
    users, peladas, players = FakeUsers(), FakePeladas(), FakePlayers()
    monkeypatch.setattr(app, "user_storage", users)
    monkeypatch.setattr(app, "pelada_storage", peladas)
    monkeypatch.setattr(app, "player_storage", players)
    client = app.app.test_client()
    client.users, client.peladas, client.players = users, peladas, players
    return client


def _auth(pelada_id=1):
    return {
        "Authorization": "Bearer " + app._issue_session_token(1),
        "X-Pelada-Id": str(pelada_id),
    }


def test_member_sets_day_position_until_next_game_day(env):
    res = env.patch("/api/players/7/day-position", json={"position": "defender"}, headers=_auth())
    assert res.status_code == 200
    assert res.get_json()["day_position"] == "defender"
    _pid, _player, position, until = env.players.calls[0]
    assert position == "defender"
    assert until == day_position_until(today_local(), 6)


def test_day_position_null_clears_it(env):
    res = env.patch("/api/players/7/day-position", json={"position": None}, headers=_auth())
    assert res.status_code == 200
    assert env.players.calls[0][2] is None


def test_day_position_rejects_invalid_position(env):
    res = env.patch("/api/players/7/day-position", json={"position": "libero"}, headers=_auth())
    assert res.status_code == 400


def test_day_position_only_in_field_peladas(env):
    env.peladas.pelada["sport_type"] = "futsal"
    res = env.patch("/api/players/7/day-position", json={"position": "defender"}, headers=_auth())
    assert res.status_code == 400


def test_day_position_unknown_player(env):
    res = env.patch("/api/players/8/day-position", json={"position": "defender"}, headers=_auth())
    assert res.status_code == 404


def test_create_pelada_with_sport_type(env):
    headers = {"Authorization": "Bearer " + app._issue_session_token(1)}
    res = env.post("/api/peladas", json={"name": "Campo", "sport_type": "field"}, headers=headers)
    assert res.status_code == 201
    assert env.peladas.created["sport_type"] == "field"


def test_create_pelada_defaults_to_futsal(env):
    headers = {"Authorization": "Bearer " + app._issue_session_token(1)}
    env.post("/api/peladas", json={"name": "Salao"}, headers=headers)
    assert env.peladas.created["sport_type"] == "futsal"


def test_create_pelada_rejects_unknown_sport_type(env):
    headers = {"Authorization": "Bearer " + app._issue_session_token(1)}
    res = env.post("/api/peladas", json={"name": "X", "sport_type": "beach"}, headers=headers)
    assert res.status_code == 400


# ---- balancer --------------------------------------------------------------

def _field_roster():
    # 2 keepers + 12 outfield (3 per position), size 5 -> 4+GK, 4+GK, 4.
    players = [
        Player(100, "GK1", 3.0, is_goalkeeper=True, position="goalkeeper"),
        Player(101, "GK2", 3.0, is_goalkeeper=True, position="goalkeeper"),
    ]
    ratings = [5, 4.5, 4, 3.5, 3, 3, 2.5, 2, 4, 3.5, 3, 2]
    positions = ["defender", "fullback", "midfielder", "forward"] * 3
    for i, (r, pos) in enumerate(zip(ratings, positions), start=1):
        players.append(Player(i, "P" + str(i), float(r), position=pos))
    return players


def test_field_draw_spreads_each_position():
    for _ in range(30):
        teams = balance_teams(_field_roster(), 5, spread_positions=True)
        assert [len(t["players"]) for t in teams] == [5, 5, 4]
        for position in ("defender", "fullback", "midfielder", "forward"):
            counts = [sum(1 for p in t["players"] if p.position == position) for t in teams]
            assert counts == [1, 1, 1], (position, counts)


def test_field_draw_keeps_rating_balance():
    spreads = []
    for _ in range(30):
        teams = balance_teams(_field_roster(), 5, spread_positions=True)
        totals = [t["total_rating"] + t.get("seed", 0.0) for t in teams]
        spreads.append(max(totals) - min(totals))
    assert sum(spreads) / len(spreads) <= 2.0


def test_futsal_draw_ignores_positions():
    # Without spread_positions the positions have no effect (same seed, same teams).
    random.seed(1)
    plain = balance_teams([Player(p.id, p.name, p.rating, is_goalkeeper=p.is_goalkeeper) for p in _field_roster()], 5)
    random.seed(1)
    with_pos = balance_teams(_field_roster(), 5)
    assert [[p.id for p in t["players"]] for t in plain] == [[p.id for p in t["players"]] for t in with_pos]
