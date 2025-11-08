import random
from typing import List, Dict

from models import Player


def balance_teams(players: List[Player], team_size: int) -> List[Dict]:
    """
    Build balanced teams using a greedy algorithm with a bit of randomness:
    - Calculate how many teams we need. Most teams have `team_size` players;
      the last one may have fewer (remainder).
    - Sort players by rating (descending), but break ties randomly so that
      each draw can be slightly different.
    - Assign each player to the team with the lowest total rating that still
      has available slots.
    - Then perform a few random swaps of players with similar ratings
      (difference <= 0.5) to add variation while keeping balance.
    """
    if team_size <= 0:
        raise ValueError("team_size must be > 0")

    total_players = len(players)
    if total_players == 0:
        return []

    # How many full teams and remainder
    full_teams = total_players // team_size
    remainder = total_players % team_size
    team_count = full_teams + (1 if remainder > 0 else 0)

    # Create teams with capacities
    teams = []
    for i in range(team_count):
        if i < full_teams:
            capacity = team_size
        else:
            capacity = remainder if remainder > 0 else team_size

        teams.append({"players": [], "total_rating": 0.0, "capacity": capacity})

    # Sort players by rating DESC, tie-broken randomly to vary each draw
    sorted_players = sorted(
        players,
        key=lambda p: (-p.rating, random.random()),
    )

    # Greedy assignment: stronger players first, always to the "weakest" team
    for player in sorted_players:
        candidate_teams = [t for t in teams if len(t["players"]) < t["capacity"]]
        if not candidate_teams:
            # Fallback: if capacities are somehow all full, just drop into last team
            target = teams[-1]
        else:
            target = min(candidate_teams, key=lambda t: t["total_rating"])

        target["players"].append(player)
        target["total_rating"] += player.rating

    # Add a bit of randomness by swapping similar-rating players between teams
    _apply_small_random_swaps(teams, max_swaps=5)

    return teams


def _apply_small_random_swaps(teams: List[Dict], max_swaps: int = 5) -> None:
    """
    Perform a few random swaps between teams using index-based swapping,
    only when the players have the same rating or differ by at most 0.5.
    This keeps teams balanced but changes compositions between draws.
    """
    if len(teams) < 2:
        return

    for _ in range(max_swaps):
        # Pick two different teams at random
        team_indices = list(range(len(teams)))
        random.shuffle(team_indices)
        t1_idx, t2_idx = team_indices[0], team_indices[1]
        t1, t2 = teams[t1_idx], teams[t2_idx]

        if not t1["players"] or not t2["players"]:
            continue

        # Pick random players by index
        i = random.randrange(len(t1["players"]))
        j = random.randrange(len(t2["players"]))
        p1 = t1["players"][i]
        p2 = t2["players"][j]

        # Swap only if ratings are "close enough"
        if abs(p1.rating - p2.rating) <= 0.5:
            # Swap in place using indices (no list.remove, so no ValueError)
            t1["players"][i], t2["players"][j] = p2, p1

            # Recalculate total ratings
            t1["total_rating"] = sum(p.rating for p in t1["players"])
            t2["total_rating"] = sum(p.rating for p in t2["players"])
