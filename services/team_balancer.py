import random
from typing import Dict, List

from models import Player


def balance_teams(players: List[Player], team_size: int) -> List[Dict]:
    """
    Build balanced teams considering:
    - total rating balance;
    - team size capacity;
    - spreading top players across teams when possible;
    - spreading low-rated players across teams when possible;
    - controlled randomness for redraws.

    Example goal:
    Avoid teams like:
      Team A: 5, 5, 3, 1, 1 = 15
      Team B: 3, 3, 3, 3, 3 = 15

    Even if totals are equal, distribution quality matters.
    """
    if team_size <= 0:
        raise ValueError("team_size must be > 0")

    total_players = len(players)
    if total_players == 0:
        return []

    teams = _create_empty_teams(total_players, team_size)

    sorted_players = sorted(
        players,
        key=lambda p: (-p.rating, random.random()),
    )

    for player in sorted_players:
        candidates = [t for t in teams if len(t["players"]) < t["capacity"]]

        best_team = min(
            candidates,
            key=lambda team: _team_score_if_added(team, player, teams),
        )

        best_team["players"].append(player)
        best_team["total_rating"] += player.rating

    _apply_small_random_swaps(teams, max_swaps=8)
    _recalculate_totals(teams)

    return teams


def _create_empty_teams(total_players: int, team_size: int) -> List[Dict]:
    full_teams = total_players // team_size
    remainder = total_players % team_size
    team_count = full_teams + (1 if remainder > 0 else 0)

    teams = []

    for index in range(team_count):
        if index < full_teams:
            capacity = team_size
        else:
            capacity = remainder if remainder > 0 else team_size

        teams.append(
            {
                "players": [],
                "total_rating": 0.0,
                "capacity": capacity,
            }
        )

    return teams


def _team_score_if_added(team: Dict, player: Player, all_teams: List[Dict]) -> float:
    """
    Lower score means better team choice.

    This function tries to avoid:
    - making one team much stronger;
    - putting too many top players together;
    - putting too many weak players together;
    - creating a team with very high rating variance.
    """
    simulated_players = team["players"] + [player]
    simulated_total = team["total_rating"] + player.rating

    projected_totals = [
        simulated_total if t is team else t["total_rating"]
        for t in all_teams
    ]

    total_spread_penalty = max(projected_totals) - min(projected_totals)

    top_players_penalty = _count_players_at_or_above(simulated_players, 4.5)
    weak_players_penalty = _count_players_at_or_below(simulated_players, 2.5)

    very_top_players_penalty = _count_players_at_or_above(simulated_players, 5.0)
    very_weak_players_penalty = _count_players_at_or_below(simulated_players, 1.5)

    variance_penalty = _rating_variance(simulated_players)

    size_penalty = len(simulated_players) / max(team["capacity"], 1)

    return (
        total_spread_penalty * 10.0
        + max(0, top_players_penalty - 1) * 5.0
        + max(0, weak_players_penalty - 1) * 5.0
        + max(0, very_top_players_penalty - 1) * 8.0
        + max(0, very_weak_players_penalty - 1) * 8.0
        + variance_penalty * 2.0
        + size_penalty * 0.5
        + random.random() * 0.25
    )


def _count_players_at_or_above(players: List[Player], rating: float) -> int:
    return sum(1 for p in players if p.rating >= rating)


def _count_players_at_or_below(players: List[Player], rating: float) -> int:
    return sum(1 for p in players if p.rating <= rating)


def _rating_variance(players: List[Player]) -> float:
    if len(players) <= 1:
        return 0.0

    ratings = [p.rating for p in players]
    average = sum(ratings) / len(ratings)

    return sum((rating - average) ** 2 for rating in ratings) / len(ratings)


def _apply_small_random_swaps(teams: List[Dict], max_swaps: int = 8) -> None:
    """
    Adds redraw variation without destroying balance.
    Only swaps players with same rating or 0.5 difference.
    """
    if len(teams) < 2:
        return

    for _ in range(max_swaps):
        team_indices = list(range(len(teams)))
        random.shuffle(team_indices)

        t1 = teams[team_indices[0]]
        t2 = teams[team_indices[1]]

        if not t1["players"] or not t2["players"]:
            continue

        i = random.randrange(len(t1["players"]))
        j = random.randrange(len(t2["players"]))

        p1 = t1["players"][i]
        p2 = t2["players"][j]

        if abs(p1.rating - p2.rating) > 0.5:
            continue

        current_spread = _total_rating_spread(teams)

        t1["players"][i], t2["players"][j] = p2, p1
        _recalculate_totals(teams)

        new_spread = _total_rating_spread(teams)

        if new_spread > current_spread + 0.5:
            t1["players"][i], t2["players"][j] = p1, p2
            _recalculate_totals(teams)


def _total_rating_spread(teams: List[Dict]) -> float:
    totals = [team["total_rating"] for team in teams]
    return max(totals) - min(totals)


def _recalculate_totals(teams: List[Dict]) -> None:
    for team in teams:
        team["total_rating"] = sum(player.rating for player in team["players"])