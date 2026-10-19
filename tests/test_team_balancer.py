import random

import pytest

from models import Player
from services.team_balancer import _gk_advantage, balance_teams, pick_kickoff_team


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


# ---- remainder (smaller) bench team ---------------------------------------

def _remainder_line():
    return [mk(i, r) for i, r in enumerate([5, 5, 4.5, 4, 4, 3.5, 3, 3, 2.5, 2, 2, 1.5], start=1)]


def test_remainder_team_does_not_get_the_top_players():
    # 12 players, size 5 -> teams of 5, 5 and 2. The 2-player team used to be
    # filled with the strongest players because its raw total was compared
    # against full teams.
    for _ in range(30):
        teams = balance_teams(_remainder_line(), 5)
        small = next(t for t in teams if t["capacity"] == 2)
        assert sum(1 for p in small["players"] if p.rating >= 4.5) <= 1


def test_remainder_team_average_matches_full_teams():
    averages = {"full": [], "small": []}
    for _ in range(60):
        teams = balance_teams(_remainder_line(), 5)
        for team in teams:
            key = "small" if team["capacity"] == 2 else "full"
            averages[key].append(team["total_rating"] / len(team["players"]))
    full_avg = sum(averages["full"]) / len(averages["full"])
    small_avg = sum(averages["small"]) / len(averages["small"])
    assert abs(full_avg - small_avg) <= 0.5


def test_remainder_team_with_keepers_stays_near_average():
    # 10 line + 2 keepers, size 5 -> playing teams of 4 + keeper, bench of 2.
    line = _remainder_line()[:10]
    gks = [mk(100, 3.0, gk=True, foot=2), mk(101, 3.0, gk=True, foot=2)]
    small_avgs = []
    for _ in range(60):
        teams = balance_teams(list(line) + gks, 5)
        small = next(t for t in teams if t["capacity"] == 2)
        small_avgs.append(small["total_rating"] / len(small["players"]))
    roster_avg = sum(p.rating for p in line) / len(line)
    assert abs(sum(small_avgs) / len(small_avgs) - roster_avg) <= 0.5


# ---- bench teams with two fixed keepers ------------------------------------

def test_two_keepers_bench_teams_bring_only_outfielders():
    # Fixed keepers stay in goal when a bench team comes on, so 13 outfielders
    # at size 5 become 4 + 4 on court, a bench of 4 and a remainder of 1.
    line = [mk(i, 3.0) for i in range(1, 14)]
    gks = [mk(100, 3.0, gk=True), mk(101, 3.0, gk=True)]
    teams = balance_teams(line + gks, 5)
    assert [len(outfielders(t)) for t in teams] == [4, 4, 4, 1]
    assert all(not keepers(t) for t in teams[2:])


def test_two_keepers_bench_total_matches_playing_teams():
    line = [mk(i, r) for i, r in enumerate([5, 5, 4.5, 4, 4, 3.5, 3.5, 3, 3, 2.5, 2, 2], start=1)]
    gks = [mk(100, 3.0, gk=True, foot=2), mk(101, 3.0, gk=True, foot=2)]
    bench_totals, playing_totals = [], []
    for _ in range(60):
        teams = balance_teams(list(line) + gks, 5)
        playing_totals.extend(t["total_rating"] for t in teams[:2])
        bench_totals.append(teams[2]["total_rating"])
    playing_avg = sum(playing_totals) / len(playing_totals)
    bench_avg = sum(bench_totals) / len(bench_totals)
    assert abs(playing_avg - bench_avg) <= 1.0


def test_one_keeper_keeps_full_size_bench():
    line = [mk(i, 3.0) for i in range(1, 15)]  # 14 outfield + 1 keeper
    teams = balance_teams(line + [mk(100, 3.0, gk=True)], 5)
    assert [len(outfielders(t)) for t in teams] == [4, 5, 5]


# ---- kickoff ----------------------------------------------------------------

def test_kickoff_needs_two_teams():
    assert pick_kickoff_team([]) is None
    assert pick_kickoff_team([{"players": []}]) is None


def test_kickoff_picks_one_of_the_two_playing_teams():
    teams = [{"players": []}, {"players": []}, {"players": []}]
    picks = {pick_kickoff_team(teams) for _ in range(200)}
    assert picks == {0, 1}
