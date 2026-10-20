"""Match stats: goals/assists per game day, the daily ranking window, the yearly
ranking and the match settings. Storage is mocked, so this runs without a
database."""

from datetime import date, datetime, timedelta, timezone

import pytest

import app
from services.match_stats import (
    day_ranking_until,
    expired_dates,
    is_day_visible,
    parse_delta,
    rank_rows,
    stats_date,
)


# ---- services/match_stats ----------------------------------------------------

def test_stats_date_keeps_a_night_game_on_the_same_day():
    # Monday 23:30 and Tuesday 01:30 in Brazil (UTC-3) are the same game day.
    assert stats_date(datetime(2026, 10, 20, 2, 30, tzinfo=timezone.utc)) == date(2026, 10, 19)
    assert stats_date(datetime(2026, 10, 20, 4, 30, tzinfo=timezone.utc)) == date(2026, 10, 19)
    # From 05:00 local on, it is the new day.
    assert stats_date(datetime(2026, 10, 20, 8, 0, tzinfo=timezone.utc)) == date(2026, 10, 20)


def test_day_ranking_lasts_until_the_day_before_the_next_game():
    saturday = date(2026, 10, 24)
    assert day_ranking_until(saturday, 6) == date(2026, 10, 30)          # next Saturday - 1
    # Played on a different day than the configured one: up to the next game day.
    assert day_ranking_until(date(2026, 10, 22), 6) == date(2026, 10, 23)
    monday = date(2026, 10, 19)
    assert day_ranking_until(monday, 1) == date(2026, 10, 25)


def test_day_ranking_without_weekday_lasts_a_week():
    assert day_ranking_until(date(2026, 10, 24), None) == date(2026, 10, 30)


def test_is_day_visible():
    saturday = date(2026, 10, 24)
    assert is_day_visible(saturday, 6, saturday)
    assert is_day_visible(saturday, 6, date(2026, 10, 30))
    assert not is_day_visible(saturday, 6, date(2026, 10, 31))
    assert not is_day_visible(saturday, 6, date(2026, 10, 23))


def test_expired_dates():
    days = [date(2026, 10, 17), date(2026, 10, 24), date(2026, 10, 17)]
    assert expired_dates(days, 6, date(2026, 10, 24)) == [date(2026, 10, 17)]
    assert expired_dates(days, 6, date(2026, 10, 30)) == [date(2026, 10, 17)]
    assert expired_dates(days, 6, date(2026, 10, 31)) == [date(2026, 10, 17), date(2026, 10, 24)]


def test_rank_rows_orders_by_goals_then_assists_and_drops_empty_rows():
    rows = [
        {"name": "Caio", "goals": 2, "assists": 4},
        {"name": "rafa", "goals": 5, "assists": 1},
        {"name": "Bruno", "goals": 2, "assists": 4},
        {"name": "Edu", "goals": 2, "assists": 0},
        {"name": "Zero", "goals": 0, "assists": 0},
        {"name": "Leo", "goals": 0, "assists": 2},
    ]
    assert [r["name"] for r in rank_rows(rows)] == ["rafa", "Bruno", "Caio", "Edu", "Leo"]


def test_parse_delta():
    assert parse_delta("goals", 1) == ("goals", 1)
    assert parse_delta("assists", -1) == ("assists", -1)
    assert parse_delta("goals", 2) is None
    assert parse_delta("goals", True) is None
    assert parse_delta("saves", 1) is None


# ---- routes ----------------------------------------------------------------

class FakeUsers:
    def __init__(self, role="member"):
        self.role = role

    def get_user(self, user_id):
        return {"id": user_id, "email": "u@x.com", "name": "U", "picture": None}

    def get_role(self, pelada_id, user_id):
        return self.role


class FakePeladas:
    def __init__(self):
        self.pelada = {
            "id": 1, "name": "P", "sport_type": "futsal", "game_weekday": 6,
            "stats_enabled": True, "timer_enabled": True, "timer_minutes": 8,
        }
        self.created = None
        self.settings = None

    def get_pelada(self, pelada_id):
        return self.pelada

    def create_pelada_owned(self, name, owner_user_id, team1_color, team2_color, game_weekday,
                            sport_type="futsal", stats_enabled=False, timer_enabled=True):
        self.created = {"stats_enabled": stats_enabled, "timer_enabled": timer_enabled}
        return {"id": 9, "name": name, "role": "owner"}

    def set_match_settings(self, pelada_id, stats_enabled, timer_enabled, timer_minutes):
        self.settings = (stats_enabled, timer_enabled, timer_minutes)
        return dict(self.pelada, stats_enabled=stats_enabled, timer_enabled=timer_enabled,
                    timer_minutes=timer_minutes)


class FakeStats:
    """In-memory version of MatchStatsStorage with the same decrement rules."""

    def __init__(self):
        self.names = {7: "Rafa", 8: "Bruno", 9: "Caio"}
        self.day = {}    # (game_date, player_id) -> {"goals", "assists"}
        self.year = {}   # (year, player_id) -> {"goals", "assists"}
        self.deleted = []

    def change_stat(self, pelada_id, player_id, game_date, field, delta):
        if player_id not in self.names:
            return None
        day = self.day.setdefault((game_date, player_id), {"goals": 0, "assists": 0})
        year = self.year.setdefault((game_date.year, player_id), {"goals": 0, "assists": 0})
        if delta > 0:
            day[field] += 1
            year[field] += 1
        elif day[field] > 0:
            day[field] -= 1
            year[field] = max(year[field] - 1, 0)
        return {"player_id": player_id, **day}

    def list_day_stats(self, pelada_id):
        return [
            {"game_date": d, "player_id": pid, "name": self.names[pid], **v}
            for (d, pid), v in sorted(self.day.items())
        ]

    def delete_days(self, pelada_id, dates):
        self.deleted.extend(dates)
        self.day = {k: v for k, v in self.day.items() if k[0] not in dates}

    def list_year_stats(self, pelada_id, year):
        return [
            {"player_id": pid, "name": self.names[pid], **v}
            for (y, pid), v in self.year.items() if y == year
        ]

    def list_years(self, pelada_id):
        return sorted({y for (y, _pid), v in self.year.items() if v["goals"] or v["assists"]})


GAME_DAY = date(2026, 10, 24)  # a Saturday; the fake pelada plays on Saturdays


@pytest.fixture
def env(monkeypatch):
    users, peladas, stats = FakeUsers(), FakePeladas(), FakeStats()
    monkeypatch.setattr(app, "user_storage", users)
    monkeypatch.setattr(app, "pelada_storage", peladas)
    monkeypatch.setattr(app, "match_stats_storage", stats)
    client = app.app.test_client()
    client.users, client.peladas, client.stats = users, peladas, stats
    client.today = GAME_DAY
    monkeypatch.setattr(app, "stats_date", lambda: client.today)
    return client


def _auth(pelada_id=1):
    return {
        "Authorization": "Bearer " + app._issue_session_token(1),
        "X-Pelada-Id": str(pelada_id),
    }


def _mark(env, player_id, field="goals", delta=1):
    return env.post("/api/stats/players/" + str(player_id), json={"field": field, "delta": delta}, headers=_auth())


def test_member_marks_goal_and_assist(env):
    assert _mark(env, 7).get_json() == {"player_id": 7, "goals": 1, "assists": 0}
    res = _mark(env, 7, "assists")
    assert res.status_code == 200
    assert res.get_json() == {"player_id": 7, "goals": 1, "assists": 1}


def test_any_elenco_player_can_be_marked_even_without_check_in(env):
    # Stats do not look at the check-in (active flag): only pelada membership.
    assert _mark(env, 9).status_code == 200


def test_mark_unknown_player_is_404(env):
    assert _mark(env, 99).status_code == 404


def test_mark_rejects_invalid_change(env):
    assert _mark(env, 7, "goals", 3).status_code == 400
    assert _mark(env, 7, "saves", 1).status_code == 400


def test_decrement_never_goes_below_zero_nor_touches_the_year(env):
    _mark(env, 7)
    env.stats.year[(2026, 7)]["goals"] = 10  # goals from earlier days of the year
    _mark(env, 7, delta=-1)
    res = _mark(env, 7, delta=-1)
    assert res.get_json()["goals"] == 0
    assert env.stats.year[(2026, 7)]["goals"] == 9


def test_stats_disabled_is_rejected(env):
    env.peladas.pelada["stats_enabled"] = False
    assert _mark(env, 7).status_code == 400
    assert env.get("/api/stats/day", headers=_auth()).status_code == 400
    assert env.get("/api/stats/year", headers=_auth()).status_code == 400


def test_not_a_member_is_rejected(env):
    env.users.role = None
    assert _mark(env, 7).status_code == 403


def test_today_counts(env):
    _mark(env, 7)
    _mark(env, 8, "assists")
    body = env.get("/api/stats/today", headers=_auth()).get_json()
    assert body["date"] == "2026-10-24"
    assert sorted(c["player_id"] for c in body["counts"]) == [7, 8]


def test_day_ranking_is_ordered_and_shows_until_the_day_before_the_next_game(env):
    _mark(env, 8, "assists")
    _mark(env, 7)
    _mark(env, 7)
    body = env.get("/api/stats/day", headers=_auth()).get_json()
    assert body["date"] == "2026-10-24"
    assert body["visible_until"] == "2026-10-30"
    assert [r["name"] for r in body["rows"]] == ["Rafa", "Bruno"]
    assert body["rows"][0] == {"player_id": 7, "name": "Rafa", "goals": 2, "assists": 0}

    env.today = date(2026, 10, 30)
    assert env.get("/api/stats/day", headers=_auth()).get_json()["date"] == "2026-10-24"


def test_day_ranking_disappears_on_the_next_game_day_and_old_days_are_deleted(env):
    _mark(env, 7)
    env.today = GAME_DAY + timedelta(days=7)
    body = env.get("/api/stats/day", headers=_auth()).get_json()
    assert body == {"date": None, "visible_until": None, "rows": []}
    assert env.stats.deleted == [GAME_DAY]
    # The yearly ranking keeps the goal.
    year = env.get("/api/stats/year", headers=_auth()).get_json()
    assert year["rows"][0]["goals"] == 1


def test_new_game_day_replaces_the_previous_ranking(env):
    _mark(env, 7)
    env.today = GAME_DAY + timedelta(days=7)
    _mark(env, 8)
    body = env.get("/api/stats/day", headers=_auth()).get_json()
    assert body["date"] == "2026-10-31"
    assert [r["name"] for r in body["rows"]] == ["Bruno"]


def test_year_ranking_sums_every_day(env):
    _mark(env, 7)
    env.today = GAME_DAY + timedelta(days=7)
    _mark(env, 7)
    _mark(env, 8, "assists")
    body = env.get("/api/stats/year", headers=_auth()).get_json()
    assert body["year"] == 2026
    assert body["years"] == [2026]
    assert body["rows"][0] == {"player_id": 7, "name": "Rafa", "goals": 2, "assists": 0}


def test_year_ranking_of_another_year(env):
    _mark(env, 7)
    body = env.get("/api/stats/year?year=2025", headers=_auth()).get_json()
    assert body["year"] == 2025
    assert body["rows"] == []
    assert body["years"] == [2026]
    assert env.get("/api/stats/year?year=abc", headers=_auth()).status_code == 400


# ---- settings ------------------------------------------------------------------

def test_admin_updates_match_settings(env):
    env.users.role = "admin"
    res = env.patch("/api/peladas/1/match-settings",
                    json={"stats_enabled": True, "timer_enabled": False, "timer_minutes": 10},
                    headers=_auth())
    assert res.status_code == 200
    assert env.peladas.settings == (True, False, 10)


def test_member_cannot_update_match_settings(env):
    res = env.patch("/api/peladas/1/match-settings", json={"stats_enabled": True}, headers=_auth())
    assert res.status_code == 403


def test_match_settings_validate_timer_minutes(env):
    env.users.role = "owner"
    for value in (0, 61, "x", True):
        res = env.patch("/api/peladas/1/match-settings", json={"timer_minutes": value}, headers=_auth())
        assert res.status_code == 400, value


def test_stats_need_a_game_weekday(env):
    env.users.role = "owner"
    env.peladas.pelada["game_weekday"] = None
    res = env.patch("/api/peladas/1/match-settings", json={"stats_enabled": True}, headers=_auth())
    assert res.status_code == 400
    res = env.patch("/api/peladas/1/match-settings", json={"stats_enabled": False}, headers=_auth())
    assert res.status_code == 200


def test_create_pelada_with_stats(env):
    headers = {"Authorization": "Bearer " + app._issue_session_token(1)}
    res = env.post("/api/peladas", json={"name": "X", "game_weekday": 6, "stats_enabled": True}, headers=headers)
    assert res.status_code == 201
    assert env.peladas.created == {"stats_enabled": True, "timer_enabled": True}


def test_create_pelada_with_stats_needs_weekday(env):
    headers = {"Authorization": "Bearer " + app._issue_session_token(1)}
    res = env.post("/api/peladas", json={"name": "X", "stats_enabled": True}, headers=headers)
    assert res.status_code == 400
