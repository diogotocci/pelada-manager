from datetime import date, datetime, timedelta, timezone
from typing import Optional

# Pelada sport types. Futsal ("salao") keeps the original behaviour; field
# ("campo"/society) peladas add player positions to the draw.
SPORT_FUTSAL = "futsal"
SPORT_FIELD = "field"
SPORT_TYPES = (SPORT_FUTSAL, SPORT_FIELD)

# Field positions. "goalkeeper" maps to the fixed keeper flag (is_goalkeeper).
POSITION_GOALKEEPER = "goalkeeper"
POSITIONS = (POSITION_GOALKEEPER, "defender", "fullback", "midfielder", "forward")

# Field peladas only: optional dominant foot shown on the player. Informative,
# it does not enter the draw.
DOMINANT_FEET = ("right", "left")

# Brazil has no daylight saving time since 2019, so a fixed offset is enough
# and avoids depending on tzdata being available on the deployment runtime.
GAME_TIMEZONE = timezone(timedelta(hours=-3))


def today_local(now: Optional[datetime] = None) -> date:
    now = now or datetime.now(timezone.utc)
    return now.astimezone(GAME_TIMEZONE).date()


def day_position_until(today: date, game_weekday: Optional[int]) -> date:
    """
    Last date a day position applies: the next game day (today included), so it
    reverts to the main position once that game day has passed. game_weekday
    follows JS Date.getDay() (0=Sunday ... 6=Saturday). Without a configured
    weekday the day position lasts until the end of today.
    """
    if game_weekday is None:
        return today
    js_today = (today.weekday() + 1) % 7
    return today + timedelta(days=(game_weekday - js_today) % 7)


def effective_position(
    main: Optional[str],
    day: Optional[str],
    until: Optional[date],
    today: date,
) -> Optional[str]:
    if day and until is not None and today <= until:
        return day
    return main
