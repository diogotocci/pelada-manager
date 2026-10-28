"""Panelinha: players an admin wants on the same team. Covers the group-aware
balancer and the routes; storage is mocked, so this runs without a database."""

import random
from datetime import date, timedelta

import pytest

import app
from models import Player
from services.positions import day_position_until, today_local
from services.team_balancer import (
    balance_teams,
    balance_teams_with_group,
)


@pytest.fixture(autouse=True)
def _seed():
    random.seed(2468)


def mk(i, rating, gk=False, position=None):
    return Player(id=i, name="P" + str(i), rating=rating, is_goalkeeper=gk, position=position)


def roster():
    ratings = [5.0, 4.5, 4.0, 4.0, 3.5, 3.5, 3.0, 3.0, 3.0, 2.5, 2.5, 2.0, 2.0, 1.5]
    return [mk(i, r) for i, r in enumerate(ratings)]


def team_of(teams, player_id):
    for index, team in enumerate(teams):
        if any(p.id == player_id for p in team["players"]):
            return index
    return None


# ---- balancer ----------------------------------------------------------------

def test_no_group_returns_plain_draw_without_info():
    teams, info = balance_teams_with_group(roster(), 7, [])
    assert info is None
    assert sorted(p.id for t in teams for p in t["players"]) == list(range(14))


def test_single_member_is_not_a_group():
    _teams, info = balance_teams_with_group(roster(), 7, [3])
    assert info is None


def test_mixed_group_stays_together():
    group = [0, 6, 9, 13]  # 5.0 + 3.0 + 2.5 + 1.5: easy to balance around
    for _ in range(10):
        teams, info = balance_teams_with_group(roster(), 7, group)
        assert info["total"] == 4 and info["together"] == 4
        assert {team_of(teams, i) for i in group} == {info["team_index"]}


def test_stacked_group_is_split_to_keep_balance():
    # The five best together would need the other two to add up to 1 star.
    group = [0, 1, 2, 3, 4]
    teams, info = balance_teams_with_group(roster(), 7, group)
    assert info["total"] == 5
    assert 2 <= info["together"] < 5
    totals = [t["total_rating"] for t in teams]
    assert max(totals) - min(totals) <= 1.0


def test_group_bigger_than_team_keeps_at_most_team_size():
    group = list(range(0, 14, 2)) + [1]  # 8 players, 7 per team
    teams, info = balance_teams_with_group(roster(), 7, group)
    assert info["total"] == 8
    assert info["together"] <= 7
    assert all(len(t["players"]) == 7 for t in teams)


def test_group_with_keeper_goes_to_that_keepers_team():
    players = [mk(100, 3.0, gk=True), mk(101, 3.0, gk=True)] + [mk(i, r) for i, r in enumerate([4, 4, 3.5, 3, 3, 2.5, 2.5, 2])]
    for _ in range(10):
        teams, info = balance_teams_with_group(players, 5, [101, 0, 7])
        keeper_team = team_of(teams, 101)
        assert info["team_index"] == keeper_team
        assert info["together"] == 3
        assert team_of(teams, 0) == keeper_team and team_of(teams, 7) == keeper_team


def test_group_can_land_on_bench_team():
    # 3 teams of 4; any team may hold the group.
    players = [mk(i, 3.0) for i in range(12)]
    seen = set()
    for _ in range(30):
        _teams, info = balance_teams_with_group(players, 4, [0, 1, 2])
        assert info["together"] == 3
        seen.add(info["team_index"])
    assert 2 in seen


def test_together_beats_position_spread():
    players = [mk(i, 3.0, position="forward") for i in range(3)] + [
        mk(10 + i, 3.0, position="defender") for i in range(7)
    ]
    teams, info = balance_teams_with_group(players, 5, [0, 1, 2], spread_positions=True)
    assert info["together"] == 3


def test_locked_players_are_never_swapped():
    players = roster()
    for _ in range(10):
        teams = balance_teams(players, 7, locked=(1, [0, 1]))
        assert team_of(teams, 0) == 1 and team_of(teams, 1) == 1


# ---- app helpers -------------------------------------------------------------

def test_in_panelinha_lapses_after_game_day():
    today = date(2026, 10, 28)
    assert app._in_panelinha(Player(1, "A", 3.0, panelinha_until=today), today)
    assert not app._in_panelinha(Player(1, "A", 3.0, panelinha_until=today - timedelta(days=1)), today)
    assert not app._in_panelinha(Player(1, "A", 3.0), today)


def test_panelinha_flag_only_for_admins():
    player = Player(1, "A", 3.0, panelinha_until=date(2999, 1, 1))
    assert app._player_json(player, True)["panelinha"] is True
    assert "panelinha" not in app._player_json(player, False)


# ---- routes ------------------------------------------------------------------

class FakeUsers:
    def __init__(self, role="admin"):
        self.role = role

    def get_user(self, user_id):
        return {"id": user_id, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        return self.role


class FakePeladas:
    def __init__(self):
        self.pelada = {"id": 1, "name": "P", "sport_type": "futsal", "game_weekday": 3}

    def get_pelada(self, pelada_id):
        return self.pelada


class FakePlayers:
    def __init__(self):
        self.players = [mk(i, r) for i, r in enumerate([4, 4, 3.5, 3, 3, 2.5, 2.5, 2])]
        self.saved = None

    def get_all_players(self, pelada_id):
        return list(self.players)

    def set_panelinha(self, pelada_id, player_ids, until):
        self.saved = (player_ids, until)
        for p in self.players:
            p.panelinha_until = until if p.id in player_ids else None
        return list(self.players)


@pytest.fixture
def env(monkeypatch):
    users, peladas, players = FakeUsers(), FakePeladas(), FakePlayers()
    monkeypatch.setattr(app, "user_storage", users)
    monkeypatch.setattr(app, "pelada_storage", peladas)
    monkeypatch.setattr(app, "player_storage", players)
    client = app.app.test_client()
    client.users, client.players = users, players
    return client


def _auth():
    return {"Authorization": "Bearer " + app._issue_session_token(1), "X-Pelada-Id": "1"}


def test_admin_sets_panelinha_until_next_game_day(env):
    res = env.put("/api/panelinha", json={"player_ids": [0, 5, 99]}, headers=_auth())
    assert res.status_code == 200
    ids, until = env.players.saved
    assert ids == [0, 5]  # 99 is not in this pelada
    assert until == day_position_until(today_local(), 3)
    flagged = [p["id"] for p in res.get_json() if p["panelinha"]]
    assert flagged == [0, 5]


def test_member_cannot_set_panelinha(env):
    env.users.role = "member"
    res = env.put("/api/panelinha", json={"player_ids": [0, 1]}, headers=_auth())
    assert res.status_code == 403
    assert env.players.saved is None


def test_panelinha_rejects_bad_payload(env):
    assert env.put("/api/panelinha", json={"player_ids": "0,1"}, headers=_auth()).status_code == 400
    assert env.put("/api/panelinha", json={"player_ids": ["x"]}, headers=_auth()).status_code == 400


def test_admin_draw_keeps_panelinha_and_reports_it(env):
    for p in env.players.players:
        if p.id in (0, 7):
            p.panelinha_until = date(2999, 1, 1)
    res = env.post("/api/draw-teams", json={"team_size": 4}, headers=_auth())
    data = res.get_json()
    assert data["panelinha"]["total"] == 2
    assert data["panelinha"]["together"] == 2
    team = data["teams"][data["panelinha"]["team_index"]]
    assert {0, 7} <= {p["id"] for p in team["players"]}


def test_member_draw_ignores_panelinha(env, monkeypatch):
    env.users.role = "member"
    for p in env.players.players:
        p.panelinha_until = date(2999, 1, 1)
    seen = {}

    def fake_balance(players, team_size, group_ids, spread_positions=False):
        seen["group"] = list(group_ids)
        return balance_teams(players, team_size), None

    monkeypatch.setattr(app, "balance_teams_with_group", fake_balance)
    data = env.post("/api/draw-teams", json={"team_size": 4}, headers=_auth()).get_json()
    assert seen["group"] == []
    assert "panelinha" not in data
