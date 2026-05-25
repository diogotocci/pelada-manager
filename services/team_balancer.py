import random
from typing import Dict, List

from models import Player


def balance_teams(players: List[Player], team_size: int) -> List[Dict]:
    """
    Build balanced teams considering:
    - total rating balance;
    - spreading top and weak players;
    - marking distribution;
    - scoring distribution;
    - stamina distribution;
    - controlled random swaps for redraw variation.
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

    _apply_attribute_aware_swaps(teams, max_attempts=90)
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
    simulated_players = team["players"] + [player]
    simulated_total = team["total_rating"] + player.rating

    projected_totals = [
        simulated_total if t is team else t["total_rating"]
        for t in all_teams
    ]

    rating_spread_penalty = max(projected_totals) - min(projected_totals)

    top_players_penalty = _count_players_at_or_above(simulated_players, 4.5)
    weak_players_penalty = _count_players_at_or_below(simulated_players, 2.5)

    very_top_players_penalty = _count_players_at_or_above(simulated_players, 5.0)
    very_weak_players_penalty = _count_players_at_or_below(simulated_players, 1.5)

    marking_low_penalty = _count_attribute_value(simulated_players, "marking", 1)
    scoring_low_penalty = _count_attribute_value(simulated_players, "scoring", 1)
    scoring_high_penalty = _count_attribute_value(simulated_players, "scoring", 3)
    stamina_low_penalty = _count_attribute_value(simulated_players, "stamina", 1)
    stamina_high_penalty = _count_attribute_value(simulated_players, "stamina", 3)

    variance_penalty = _rating_variance(simulated_players)
    size_penalty = len(simulated_players) / max(team["capacity"], 1)

    return (
        rating_spread_penalty * 18.0
        + max(0, top_players_penalty - 1) * 6.0
        + max(0, weak_players_penalty - 1) * 6.0
        + max(0, very_top_players_penalty - 1) * 10.0
        + max(0, very_weak_players_penalty - 1) * 10.0
        + max(0, marking_low_penalty - 1) * 7.0
        + max(0, scoring_low_penalty - 1) * 5.0
        + max(0, scoring_high_penalty - 1) * 5.0
        + max(0, stamina_low_penalty - 1) * 4.0
        + max(0, stamina_high_penalty - 1) * 4.0
        + variance_penalty * 2.0
        + size_penalty * 0.5
        + random.random() * 0.25
    )


def _apply_attribute_aware_swaps(teams: List[Dict], max_attempts: int = 90) -> None:
    """
    Try small swaps between players with the same rating or a rating difference up to 0.5.
    A swap is kept only if it improves or preserves the overall team score.
    """
    if len(teams) < 2:
        return

    for _ in range(max_attempts):
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

        current_score = _overall_balance_score(teams)

        t1["players"][i], t2["players"][j] = p2, p1
        _recalculate_totals(teams)

        new_score = _overall_balance_score(teams)

        if new_score > current_score + 0.25:
            t1["players"][i], t2["players"][j] = p1, p2
            _recalculate_totals(teams)


def _overall_balance_score(teams: List[Dict]) -> float:
    totals = [team["total_rating"] for team in teams]
    rating_spread = max(totals) - min(totals)

    marking_totals = [_sum_attribute(team["players"], "marking") for team in teams]
    scoring_totals = [_sum_attribute(team["players"], "scoring") for team in teams]
    stamina_totals = [_sum_attribute(team["players"], "stamina") for team in teams]

    marking_spread = max(marking_totals) - min(marking_totals)
    scoring_spread = max(scoring_totals) - min(scoring_totals)
    stamina_spread = max(stamina_totals) - min(stamina_totals)

    concentrated_extremes = 0.0

    for team in teams:
        players = team["players"]

        concentrated_extremes += max(0, _count_players_at_or_above(players, 4.5) - 1) * 5.0
        concentrated_extremes += max(0, _count_players_at_or_below(players, 2.5) - 1) * 5.0
        concentrated_extremes += max(0, _count_attribute_value(players, "marking", 1) - 1) * 7.0
        concentrated_extremes += max(0, _count_attribute_value(players, "scoring", 1) - 1) * 5.0
        concentrated_extremes += max(0, _count_attribute_value(players, "scoring", 3) - 1) * 5.0
        concentrated_extremes += max(0, _count_attribute_value(players, "stamina", 1) - 1) * 4.0
        concentrated_extremes += max(0, _count_attribute_value(players, "stamina", 3) - 1) * 4.0

    return (
        rating_spread * 20.0
        + marking_spread * 3.5
        + scoring_spread * 3.0
        + stamina_spread * 2.5
        + concentrated_extremes
    )


def _count_players_at_or_above(players: List[Player], rating: float) -> int:
    return sum(1 for p in players if p.rating >= rating)


def _count_players_at_or_below(players: List[Player], rating: float) -> int:
    return sum(1 for p in players if p.rating <= rating)


def _count_attribute_value(players: List[Player], attribute_name: str, value: int) -> int:
    return sum(1 for p in players if getattr(p, attribute_name, 2) == value)


def _sum_attribute(players: List[Player], attribute_name: str) -> int:
    return sum(getattr(p, attribute_name, 2) for p in players)


def _rating_variance(players: List[Player]) -> float:
    if len(players) <= 1:
        return 0.0

    ratings = [p.rating for p in players]
    average = sum(ratings) / len(ratings)

    return sum((rating - average) ** 2 for rating in ratings) / len(ratings)


def _recalculate_totals(teams: List[Dict]) -> None:
    for team in teams:
        team["total_rating"] = sum(player.rating for player in team["players"])