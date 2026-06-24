import os
from typing import List, Optional

import psycopg2
import psycopg2.extras

from models import Player

DEFAULT_PELADA_NAME = "Minha Pelada"


def _get_connection():
    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=psycopg2.extras.RealDictCursor,
        sslmode="require",
    )


def ensure_schema() -> None:
    """
    Create the database tables if they do not exist.
    The peladas table supports future multi-pelada functionality.
    A default pelada is created automatically on first run.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS peladas (
                    id         SERIAL PRIMARY KEY,
                    name       TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS players (
                    id         SERIAL PRIMARY KEY,
                    pelada_id  INTEGER NOT NULL REFERENCES peladas(id) ON DELETE CASCADE,
                    name       TEXT NOT NULL,
                    rating     NUMERIC(3,1) NOT NULL DEFAULT 3.0,
                    active     BOOLEAN NOT NULL DEFAULT TRUE,
                    marking    SMALLINT NOT NULL DEFAULT 2,
                    stamina    SMALLINT NOT NULL DEFAULT 2,
                    scoring    SMALLINT NOT NULL DEFAULT 2,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            cur.execute("SELECT id FROM peladas LIMIT 1")
            if cur.fetchone() is None:
                cur.execute(
                    "INSERT INTO peladas (name) VALUES (%s)",
                    (DEFAULT_PELADA_NAME,),
                )

        conn.commit()


def _get_default_pelada_id(cur) -> int:
    cur.execute("SELECT id FROM peladas ORDER BY id LIMIT 1")
    row = cur.fetchone()
    if row is None:
        raise RuntimeError("No pelada found in the database")
    return row["id"]


def _row_to_player(row) -> Player:
    return Player(
        id=row["id"],
        name=row["name"],
        rating=float(row["rating"]),
        active=bool(row["active"]),
        marking=int(row["marking"]),
        stamina=int(row["stamina"]),
        scoring=int(row["scoring"]),
    )


class PlayerStorage:
    """
    Postgres-backed storage for players.
    All operations scope to the default pelada automatically.
    When multi-pelada support is added, pelada_id will be passed explicitly.
    """

    def get_all_players(self) -> List[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)
                cur.execute(
                    "SELECT * FROM players WHERE pelada_id = %s ORDER BY id",
                    (pelada_id,),
                )
                return [_row_to_player(r) for r in cur.fetchall()]

    def add_player(
        self,
        name: str,
        rating: float,
        marking: int = 2,
        stamina: int = 2,
        scoring: int = 2,
    ) -> Player:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)
                cur.execute(
                    """
                    INSERT INTO players (pelada_id, name, rating, active, marking, stamina, scoring)
                    VALUES (%s, %s, %s, TRUE, %s, %s, %s)
                    RETURNING *
                    """,
                    (pelada_id, name, rating, marking, stamina, scoring),
                )
                return _row_to_player(cur.fetchone())

    def update_player(
        self,
        player_id: int,
        name: str,
        rating: float,
        marking: Optional[int] = None,
        stamina: Optional[int] = None,
        scoring: Optional[int] = None,
    ) -> Optional[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)
                cur.execute(
                    """
                    UPDATE players
                    SET name    = %s,
                        rating  = %s,
                        marking = COALESCE(%s, marking),
                        stamina = COALESCE(%s, stamina),
                        scoring = COALESCE(%s, scoring)
                    WHERE id = %s AND pelada_id = %s
                    RETURNING *
                    """,
                    (name, rating, marking, stamina, scoring, player_id, pelada_id),
                )
                row = cur.fetchone()
                return _row_to_player(row) if row else None

    def delete_player(self, player_id: int) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)
                cur.execute(
                    "DELETE FROM players WHERE id = %s AND pelada_id = %s",
                    (player_id, pelada_id),
                )
                return cur.rowcount > 0

    def toggle_active(self, player_id: int) -> Optional[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)
                cur.execute(
                    """
                    UPDATE players
                    SET active = NOT active
                    WHERE id = %s AND pelada_id = %s
                    RETURNING *
                    """,
                    (player_id, pelada_id),
                )
                row = cur.fetchone()
                return _row_to_player(row) if row else None

    def deactivate_all_players(self) -> None:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)
                cur.execute(
                    "UPDATE players SET active = FALSE WHERE pelada_id = %s",
                    (pelada_id,),
                )

    def set_active_batch(self, active_ids: List[int]) -> List[Player]:
        """
        Set active=True for players whose id is in active_ids,
        and active=False for all others in the default pelada.
        Returns the full updated player list.
        """
        with _get_connection() as conn:
            with conn.cursor() as cur:
                pelada_id = _get_default_pelada_id(cur)

                if active_ids:
                    cur.execute(
                        """
                        UPDATE players
                        SET active = (id = ANY(%s))
                        WHERE pelada_id = %s
                        """,
                        (active_ids, pelada_id),
                    )
                else:
                    cur.execute(
                        "UPDATE players SET active = FALSE WHERE pelada_id = %s",
                        (pelada_id,),
                    )

                cur.execute(
                    "SELECT * FROM players WHERE pelada_id = %s ORDER BY id",
                    (pelada_id,),
                )
                return [_row_to_player(r) for r in cur.fetchall()]