from datetime import date, datetime, timedelta, timezone
from typing import Dict, Iterable, List, Optional

from services.positions import GAME_TIMEZONE

STAT_FIELDS = ("goals", "assists")

# Stats marked before this local hour still belong to the previous day, so a
# night game that runs past midnight keeps a single daily ranking.
GAME_DAY_ROLLOVER_HOUR = 5

# Without a configured weekday a daily ranking stays up for a week.
DEFAULT_DAY_RANKING_DAYS = 7

TIMER_MIN_MINUTES = 1
TIMER_MAX_MINUTES = 60
TIMER_DEFAULT_MINUTES = 8


def stats_date(now: Optional[datetime] = None) -> date:
    """Game day that a stat marked now belongs to (local time)."""
    now = now or datetime.now(timezone.utc)
    local = now.astimezone(GAME_TIMEZONE)
    return (local - timedelta(hours=GAME_DAY_ROLLOVER_HOUR)).date()


def day_ranking_until(game_date: date, game_weekday: Optional[int]) -> date:
    """
    Last date the daily ranking of game_date is shown: the day before the next
    game day after it. game_weekday follows JS Date.getDay() (0=Sunday).
    """
    if game_weekday is None:
        return game_date + timedelta(days=DEFAULT_DAY_RANKING_DAYS - 1)
    js_weekday = (game_date.weekday() + 1) % 7
    days_ahead = (game_weekday - js_weekday) % 7 or 7
    return game_date + timedelta(days=days_ahead - 1)


def is_day_visible(game_date: date, game_weekday: Optional[int], today: date) -> bool:
    return game_date <= today <= day_ranking_until(game_date, game_weekday)


def expired_dates(dates: Iterable[date], game_weekday: Optional[int], today: date) -> List[date]:
    """Dates whose daily ranking is over and can be deleted (the yearly totals stay)."""
    return sorted(d for d in set(dates) if day_ranking_until(d, game_weekday) < today)


def rank_rows(rows: Iterable[Dict]) -> List[Dict]:
    """
    Order a ranking: goals first, assists break ties, then name. Players with
    no goal and no assist are left out.
    """
    scored = [r for r in rows if int(r.get("goals") or 0) > 0 or int(r.get("assists") or 0) > 0]
    return sorted(
        scored,
        key=lambda r: (-int(r["goals"]), -int(r["assists"]), (r.get("name") or "").casefold()),
    )


def parse_delta(field, delta) -> Optional[tuple]:
    """Validate a stat change. Returns (field, delta) or None when invalid."""
    if field not in STAT_FIELDS:
        return None
    if isinstance(delta, bool) or delta not in (1, -1):
        return None
    return field, delta
