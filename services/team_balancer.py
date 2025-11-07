from typing import List, Dict
import math

from models import Player


def balance_teams(players: List[Player], team_size: int) -> List[Dict]:
    """
    Create balanced teams using a greedy algorithm:
    - Sort players by rating (descending).
    - Assign each player to the team with the lowest total rating
      that still has space.
    """
    if team_size <= 0:
        raise ValueError("team_size must be > 0")

    total_players = len(players)
    if total_players == 0:
        return []

    # Calculate how many teams we need (ceil)
    team_count = math.ceil(total_players / team_size)

    teams = [
        {"players": [], "total_rating": 0.0}
        for _ in range(team_count)
    ]

    # Sort players by rating high to low
    sorted_players = sorted(players, key=lambda p: p.rating, reverse=True)

    for player in sorted_players:
        # Find team with smallest total rating that still has room
        candidate_teams = [
            t for t in teams if len(t["players"]) < team_size
        ]
        if not candidate_teams:
            # No team has room, just append to the last team (edge case)
            teams[-1]["players"].append(player)
            teams[-1]["total_rating"] += player.rating
            continue

        best_team = min(candidate_teams, key=lambda t: t["total_rating"])
        best_team["players"].append(player)
        best_team["total_rating"] += player.rating

    return teams
