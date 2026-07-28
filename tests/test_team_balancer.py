import random

import pytest

from models import Player
from services.team_balancer import _gk_advantage, balance_teams


def mk(i, rating, gk=False, foot=1):
    return Player(
        id=i,
        name=("GK" if gk else "P") + str(i),
        rating=rating,
        is_goalkeeper=gk,
        gk_footwork=foot,
    )


def all_players(teams):
    out = []
    for team in teams:
        out.extend(team["players"])
    return out


def outfielders(team):
    return [p for p in team["players"] if not p.is_goalkeeper]


def keepers(team):
    return [p for p in team["players"] if p.is_goalkeeper]


@pytest.fixture(autouse=True)
def _seed():
    random.seed(1234)


# ---- structure / capacities (no keepers) --------------------------------

def test_no_keepers_team_count_and_capacity():
    players = [mk(i, 3.0) for i in range(1, 12)]  # 11 players, size 5
    teams = balance_teams(players, 5)
    assert len(teams) == 3  # ceil(11/5)
    assert sorted(t["capacity"] for t in teams) == [1, 5, 5]


def test_everyone_assigned_exactly_once():
    players = [mk(i, float(i % 5) + 1) for i in range(1, 14)]
    teams = balance_teams(players, 5)
    ids = [p.id for p in all_players(teams)]
    assert sorted(ids) == sorted(p.id for p in players)
    assert len(ids) == len(set(ids))


def test_empty_input_returns_no_teams():
    assert balance_teams([], 5) == []


# ---- goalkeeper placement ------------------------------------------------

def test_one_keeper_occupies_a_slot():
    line = [mk(i, 3.0) for i in range(1, 11)]  # 10 outfield
    gk = mk(100, 3.0, gk=True, foot=1)
    teams = balance_teams(line + [gk], 5)
    playing = teams[:2]
    keeper_team = next(t for t in playing if keepers(t))
    other_team = next(t for t in playing if not keepers(t))
    assert len(keepers(keeper_team)) == 1
    assert len(outfielders(keeper_team)) == 4  # size - 1
    assert len(outfielders(other_team)) == 5   # size


def test_two_keepers_one_each():
    line = [mk(i, 3.0) for i in range(1, 11)]
    gks = [mk(100, 3.0, gk=True), mk(101, 4.0, gk=True)]
    teams = balance_teams(line + gks, 5)
    playing = teams[:2]
    assert all(len(keepers(t)) == 1 for t in playing)
    assert all(len(outfielders(t)) == 4 for t in playing)


def test_extra_keepers_become_outfield():
    line = [mk(i, 3.0) for i in range(1, 9)]
    gks = [mk(100, 3.0, gk=True), mk(101, 3.0, gk=True), mk(102, 3.0, gk=True)]
    teams = balance_teams(line + gks, 5)
    assert sum(len(keepers(t)) for t in teams) == 2  # only two are assigned


def test_total_rating_excludes_keeper():
    line = [mk(i, 3.0) for i in range(1, 11)]
    gk = mk(100, 5.0, gk=True, foot=3)
    teams = balance_teams(line + [gk], 5)
    keeper_team = next(t for t in teams[:2] if keepers(t))
    assert keeper_team["total_rating"] == pytest.approx(
        sum(p.rating for p in outfielders(keeper_team))
    )


# ---- balance / compensation ---------------------------------------------

def test_effective_spread_small_without_keepers():
    line = [mk(i, r) for i, r in enumerate([5, 4.5, 4, 4, 3.5, 3, 3, 2.5, 2, 1.5], start=1)]
    for _ in range(30):
        teams = balance_teams(list(line), 5)
        s1 = sum(p.rating for p in teams[0]["players"]) + teams[0].get("seed", 0)
        s2 = sum(p.rating for p in teams[1]["players"]) + teams[1].get("seed", 0)
        assert abs(s1 - s2) <= 2.0


def test_stronger_keeper_compensates_the_other_team():
    line = [mk(i, r) for i, r in enumerate([5, 4.5, 4, 4, 3.5, 3, 3, 2.5, 2, 1.5], start=1)]

    def other_team_line_avg(gk):
        totals = []
        for _ in range(40):
            teams = balance_teams(list(line) + [gk], 5)
            other = next(t for t in teams[:2] if not keepers(t))
            totals.append(sum(p.rating for p in outfielders(other)))
        return sum(totals) / len(totals)

    weak = other_team_line_avg(mk(100, 2.0, gk=True, foot=1))    # advantage 0.0
    strong = other_team_line_avg(mk(101, 5.0, gk=True, foot=3))  # advantage 3.5
    assert strong > weak


# ---- _gk_advantage exact values -----------------------------------------

def test_gk_advantage_values():
    assert _gk_advantage(mk(1, 2.0, gk=True, foot=1)) == 0.0     # below baseline
    assert _gk_advantage(mk(1, 3.0, gk=True, foot=1)) == pytest.approx(0.5)
    assert _gk_advantage(mk(1, 3.0, gk=True, foot=3)) == pytest.approx(1.5)
    assert _gk_advantage(mk(1, 5.0, gk=True, foot=3)) == pytest.approx(3.5)
