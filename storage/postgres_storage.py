import os
from typing import List, Optional, Dict

import psycopg2
import psycopg2.extras

from models import Player


def _get_connection():
    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=psycopg2.extras.RealDictCursor,
        sslmode="require",
    )


def ensure_schema() -> None:
    """
    Create the database tables if they do not exist.
    Peladas have a password for access control.
    """
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS peladas (
                    id         SERIAL PRIMARY KEY,
                    name       TEXT NOT NULL,
                    password   TEXT NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)

            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'peladas' AND column_name = 'password'
                    ) THEN
                        ALTER TABLE peladas ADD COLUMN password TEXT NOT NULL DEFAULT '';
                    END IF;
                END
                $$;
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

        conn.commit()


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


def _row_to_pelada(row) -> Dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "player_count": int(row.get("player_count", 0)),
    }


class PeladaStorage:
    def list_peladas(self) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT p.id, p.name, COUNT(pl.id) AS player_count
                    FROM peladas p
                    LEFT JOIN players pl ON pl.pelada_id = p.id
                    GROUP BY p.id, p.name
                    ORDER BY p.id
                """)
                return [_row_to_pelada(r) for r in cur.fetchall()]

    def create_pelada(self, name: str, password: str) -> Dict:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO peladas (name, password) VALUES (%s, %s) RETURNING id, name, 0 AS player_count",
                    (name, password),
                )
                row = cur.fetchone()
                return {"id": row["id"], "name": row["name"], "player_count": 0}

    def verify_password(self, pelada_id: int, password: str) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT password FROM peladas WHERE id = %s",
                    (pelada_id,),
                )
                row = cur.fetchone()
                if row is None:
                    return False
                return row["password"] == password

    def get_pelada(self, pelada_id: int) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT p.id, p.name, COUNT(pl.id) AS player_count
                    FROM peladas p
                    LEFT JOIN players pl ON pl.pelada_id = p.id
                    WHERE p.id = %s
                    GROUP BY p.id, p.name
                """, (pelada_id,))
                row = cur.fetchone()
                return _row_to_pelada(row) if row else None


class PlayerStorage:
    """
    Postgres-backed storage for players scoped to a pelada_id.
    """

    def get_all_players(self, pelada_id: int) -> List[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM players WHERE pelada_id = %s ORDER BY id",
                    (pelada_id,),
                )
                return [_row_to_player(r) for r in cur.fetchall()]

    def add_player(
        self,
        pelada_id: int,
        name: str,
        rating: float,
        marking: int = 2,
        stamina: int = 2,
        scoring: int = 2,
    ) -> Player:
        with _get_connection() as conn:
            with conn.cursor() as cur:
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
        pelada_id: int,
        player_id: int,
        name: str,
        rating: float,
        marking: Optional[int] = None,
        stamina: Optional[int] = None,
        scoring: Optional[int] = None,
    ) -> Optional[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
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

    def delete_player(self, pelada_id: int, player_id: int) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM players WHERE id = %s AND pelada_id = %s",
                    (player_id, pelada_id),
                )
                return cur.rowcount > 0

    def toggle_active(self, pelada_id: int, player_id: int) -> Optional[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
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

    def deactivate_all_players(self, pelada_id: int) -> None:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE players SET active = FALSE WHERE pelada_id = %s",
                    (pelada_id,),
                )

    def set_active_batch(self, pelada_id: int, active_ids: List[int]) -> List[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
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