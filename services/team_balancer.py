from typing import List, Dict
import math

from models import Player


def balance_teams(players: List[Player], team_size: int) -> List[Dict]:
    """
    Create balanced teams using a greedy algorithm with fixed capacities:
    - Calculate how many full teams (with team_size players) we can have.
    - If there is a remainder, create one extra smaller team.
    - Sort players by rating (descending).
    - Assign each player to the team with the lowest total rating
      that still has available slots.
    This ensures distributions like:
      17 players, team_size=5 -> 5, 5, 5, 2
    instead of 5, 4, 4, 4.
    """
    if team_size <= 0:
        raise ValueError("team_size must be > 0")

    total_players = len(players)
    if total_players == 0:
        return []

    # How many full teams with "team_size" players
    full_teams = total_players // team_size
    remainder = total_players % team_size

    # If team_size > total_players, we will have:
    # full_teams = 0 and remainder = total_players -> 1 team with all players
    team_count = full_teams + (1 if remainder > 0 else 0)

    teams = []
    for i in range(team_count):
        if i < full_teams:
            capacity = team_size
        else:
            # Last team with the remaining players (if any)
            capacity = remainder if remainder > 0 else team_size

        teams.append(
            {
                "players": [],
                "total_rating": 0.0,
                "capacity": capacity,
            }
        )

    # Sort players by rating high to low
    sorted_players = sorted(players, key=lambda p: p.rating, reverse=True)

    for player in sorted_players:
        # Teams that still have room (respecting their individual capacities)
        candidate_teams = [
            t for t in teams if len(t["players"]) < t["capacity"]
        ]

        if not candidate_teams:
            # Edge case: no team has capacity left, just drop into last team
            # (should not really happen with the math above)
            last_team = teams[-1]
            last_team["players"].append(player)
            last_team["total_rating"] += player.rating
            continue

        # Pick the team with the lowest total rating among those with available slots
        best_team = min(candidate_teams, key=lambda t: t["total_rating"])
        best_team["players"].append(player)
        best_team["total_rating"] += player.rating

    # We don't need to return capacity to the caller, but it's harmless if kept.
    return teams
