import os
import secrets
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
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'peladas' AND column_name = 'team1_color'
                    ) THEN
                        ALTER TABLE peladas ADD COLUMN team1_color TEXT NOT NULL DEFAULT 'blue';
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'peladas' AND column_name = 'team2_color'
                    ) THEN
                        ALTER TABLE peladas ADD COLUMN team2_color TEXT NOT NULL DEFAULT 'yellow';
                    END IF;
                END
                $$;
            """)

            # admin_password: per-pelada admin password (replaces the old single
            # global ADMIN_SECRET). Added with an empty default so pre-existing
            # rows get a value; the backfill below then seeds legacy peladas with
            # the old shared admin password so they keep working unchanged.
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'peladas' AND column_name = 'admin_password'
                    ) THEN
                        ALTER TABLE peladas ADD COLUMN admin_password TEXT NOT NULL DEFAULT '';
                    END IF;
                END
                $$;
            """)

            # One-time backfill: peladas created before per-pelada admin
            # passwords existed keep the old shared admin password ('secret123').
            # Guarded by = '' so it only seeds legacy rows and never overrides an
            # admin password chosen at creation time.
            cur.execute("UPDATE peladas SET admin_password = 'secret123' WHERE admin_password = ''")

            # game_weekday: day the pelada is played on.
            # Convention matches JS Date.getDay(): 0=Sunday ... 6=Saturday.
            # Nullable — when unset, sharing falls back to the current date.
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'peladas' AND column_name = 'game_weekday'
                    ) THEN
                        ALTER TABLE peladas ADD COLUMN game_weekday SMALLINT;
                    END IF;
                END
                $$;
            """)

            # One-time backfill for the two known peladas. Guarded by IS NULL
            # so it only seeds the initial value and never overrides a later
            # edit made through the admin UI. Saturday = 6, Monday = 1.
            cur.execute(
                "UPDATE peladas SET game_weekday = 6 WHERE game_weekday IS NULL AND name ILIKE %s",
                ("%fumageiro%",),
            )
            cur.execute(
                "UPDATE peladas SET game_weekday = 1 WHERE game_weekday IS NULL AND name ILIKE %s",
                ("%batista%",),
            )

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

            # Goalkeeper support: a fixed keeper flag and a footwork attribute
            # (1-3, how well the keeper plays with the feet / as a line goalie).
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'players' AND column_name = 'is_goalkeeper'
                    ) THEN
                        ALTER TABLE players ADD COLUMN is_goalkeeper BOOLEAN NOT NULL DEFAULT FALSE;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'players' AND column_name = 'gk_footwork'
                    ) THEN
                        ALTER TABLE players ADD COLUMN gk_footwork SMALLINT NOT NULL DEFAULT 1;
                    END IF;
                END
                $$;
            """)

            # Rate limiting: one row per sensitive-endpoint attempt (auth, admin).
            cur.execute("""
                CREATE TABLE IF NOT EXISTS auth_attempts (
                    id  SERIAL PRIMARY KEY,
                    ip  TEXT NOT NULL,
                    ts  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_ts ON auth_attempts (ip, ts)")

            # User feedback (bug reports, suggestions). pelada_id is optional and
            # kept even if the pelada is later deleted, so we can still read the
            # message; contact is a free-text email/phone the user may leave.
            cur.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id          SERIAL PRIMARY KEY,
                    pelada_id   INTEGER REFERENCES peladas(id) ON DELETE SET NULL,
                    subject     TEXT NOT NULL DEFAULT '',
                    category    TEXT NOT NULL,
                    message     TEXT NOT NULL,
                    contact     TEXT,
                    app_version TEXT,
                    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # subject/is_read added after the table shipped without them.
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'feedback' AND column_name = 'subject'
                    ) THEN
                        ALTER TABLE feedback ADD COLUMN subject TEXT NOT NULL DEFAULT '';
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'feedback' AND column_name = 'is_read'
                    ) THEN
                        ALTER TABLE feedback ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
                    END IF;
                END
                $$;
            """)

            # Feedback marked "useful" is copied here as a standalone to-do item
            # (GitHub-issue style), so it survives even if the original feedback
            # is later deleted (feedback_id then becomes NULL).
            cur.execute("""
                CREATE TABLE IF NOT EXISTS useful_items (
                    id          SERIAL PRIMARY KEY,
                    feedback_id INTEGER REFERENCES feedback(id) ON DELETE SET NULL,
                    subject     TEXT NOT NULL,
                    message     TEXT,
                    category    TEXT,
                    done        BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # ---- Accounts (Google login) --------------------------------
            # A user is identified by the stable Google `sub`; email/name/picture
            # are only for display. google_sub is nullable so the owner of the
            # legacy peladas can be pre-seeded by email and get the sub filled in
            # on their first login.
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id          SERIAL PRIMARY KEY,
                    google_sub  TEXT UNIQUE,
                    email       TEXT UNIQUE NOT NULL,
                    name        TEXT,
                    picture     TEXT,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # Which users belong to which pelada, and with what role.
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pelada_members (
                    pelada_id  INTEGER NOT NULL REFERENCES peladas(id) ON DELETE CASCADE,
                    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (pelada_id, user_id)
                )
            """)

            # Invites: a shareable link (random token) that grants a role in a
            # pelada. Multi-use, time-bound — valid while revoked_at IS NULL and
            # now() < expires_at (no per-quantity limit). accepted_count is only
            # informative.
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pelada_invites (
                    id             SERIAL PRIMARY KEY,
                    pelada_id      INTEGER NOT NULL REFERENCES peladas(id) ON DELETE CASCADE,
                    token          TEXT UNIQUE NOT NULL,
                    role           TEXT NOT NULL CHECK (role IN ('admin', 'member')),
                    created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    expires_at     TIMESTAMPTZ NOT NULL,
                    revoked_at     TIMESTAMPTZ,
                    accepted_count INTEGER NOT NULL DEFAULT 0,
                    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # Migration: make diogotocci@gmail.com the owner of every existing
            # pelada, so nothing is left ownerless when the model switches from
            # per-pelada passwords to accounts. Idempotent (guarded by NOT EXISTS).
            cur.execute("INSERT INTO users (email) VALUES ('diogotocci@gmail.com') ON CONFLICT (email) DO NOTHING")
            cur.execute("""
                INSERT INTO pelada_members (pelada_id, user_id, role)
                SELECT p.id, u.id, 'owner'
                FROM peladas p
                CROSS JOIN users u
                WHERE u.email = 'diogotocci@gmail.com'
                  AND NOT EXISTS (
                      SELECT 1 FROM pelada_members m
                      WHERE m.pelada_id = p.id AND m.user_id = u.id
                  )
            """)

        conn.commit()


def count_recent_failures(ip: str, window_seconds: int) -> int:
    """How many FAILED attempts this IP made within the window (no insert)."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS n FROM auth_attempts "
                "WHERE ip = %s AND ts > NOW() - (%s * INTERVAL '1 second')",
                (ip, window_seconds),
            )
            return int(cur.fetchone()["n"])


def record_failed_attempt(ip: str) -> None:
    """Record one failed attempt and prune old rows. Successes are never
    recorded, so legitimate logins (and groups sharing an IP) are not blocked."""
    with _get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO auth_attempts (ip) VALUES (%s)", (ip,))
            cur.execute("DELETE FROM auth_attempts WHERE ts < NOW() - INTERVAL '1 hour'")


def _row_to_player(row) -> Player:
    return Player(
        id=row["id"],
        name=row["name"],
        rating=float(row["rating"]),
        active=bool(row["active"]),
        marking=int(row["marking"]),
        stamina=int(row["stamina"]),
        scoring=int(row["scoring"]),
        is_goalkeeper=bool(row.get("is_goalkeeper", False)),
        gk_footwork=int(row["gk_footwork"]) if row.get("gk_footwork") is not None else 1,
    )


def _row_to_pelada(row) -> Dict:
    weekday = row.get("game_weekday")
    return {
        "id": row["id"],
        "name": row["name"],
        "player_count": int(row.get("player_count", 0)),
        "team1_color": row.get("team1_color") or "blue",
        "team2_color": row.get("team2_color") or "yellow",
        "game_weekday": int(weekday) if weekday is not None else None,
    }


class PeladaStorage:
    def list_peladas(self) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT p.id, p.name, p.team1_color, p.team2_color, p.game_weekday, COUNT(pl.id) AS player_count
                    FROM peladas p
                    LEFT JOIN players pl ON pl.pelada_id = p.id
                    GROUP BY p.id, p.name, p.team1_color, p.team2_color, p.game_weekday
                    ORDER BY p.id
                """)
                return [_row_to_pelada(r) for r in cur.fetchall()]

    def create_pelada(self, name: str, password: str, admin_password: str, team1_color: str = "blue", team2_color: str = "yellow", game_weekday: Optional[int] = None) -> Dict:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO peladas (name, password, admin_password, team1_color, team2_color, game_weekday)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, name, team1_color, team2_color, game_weekday, 0 AS player_count
                    """,
                    (name, password, admin_password, team1_color, team2_color, game_weekday),
                )
                return _row_to_pelada(cur.fetchone())

    def create_pelada_owned(self, name: str, owner_user_id: int, team1_color: str = "blue", team2_color: str = "yellow", game_weekday: Optional[int] = None) -> Dict:
        """Create a pelada (no password) and make the given user its owner, in
        one transaction. Returns the pelada with role='owner'."""
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO peladas (name, team1_color, team2_color, game_weekday)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, name, team1_color, team2_color, game_weekday, 0 AS player_count
                    """,
                    (name, team1_color, team2_color, game_weekday),
                )
                pelada = _row_to_pelada(cur.fetchone())
                cur.execute(
                    "INSERT INTO pelada_members (pelada_id, user_id, role) VALUES (%s, %s, 'owner')",
                    (pelada["id"], owner_user_id),
                )
                pelada["role"] = "owner"
                return pelada

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

    def verify_admin_password(self, pelada_id: int, password: str) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT admin_password FROM peladas WHERE id = %s",
                    (pelada_id,),
                )
                row = cur.fetchone()
                if row is None or not row["admin_password"]:
                    return False
                return row["admin_password"] == password

    def update_pelada_colors(self, pelada_id: int, team1_color: str, team2_color: str) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE peladas
                    SET team1_color = %s, team2_color = %s
                    WHERE id = %s
                    RETURNING id, name, team1_color, team2_color, game_weekday, 0 AS player_count
                    """,
                    (team1_color, team2_color, pelada_id),
                )
                row = cur.fetchone()
                return _row_to_pelada(row) if row else None

    def set_weekday(self, pelada_id: int, game_weekday: Optional[int]) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE peladas
                    SET game_weekday = %s
                    WHERE id = %s
                    RETURNING id, name, team1_color, team2_color, game_weekday, 0 AS player_count
                    """,
                    (game_weekday, pelada_id),
                )
                row = cur.fetchone()
                return _row_to_pelada(row) if row else None

    def delete_pelada(self, pelada_id: int) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM peladas WHERE id = %s", (pelada_id,))
                return cur.rowcount > 0


def _row_to_feedback(row) -> Dict:
    ts = row.get("created_at")
    return {
        "id": row["id"],
        "pelada_id": row.get("pelada_id"),
        "subject": row.get("subject") or "",
        "category": row["category"],
        "message": row["message"],
        "contact": row.get("contact"),
        "app_version": row.get("app_version"),
        "is_read": bool(row.get("is_read", False)),
        "created_at": ts.isoformat() if ts is not None else None,
    }


def _row_to_useful(row) -> Dict:
    ts = row.get("created_at")
    return {
        "id": row["id"],
        "feedback_id": row.get("feedback_id"),
        "subject": row["subject"],
        "message": row.get("message"),
        "category": row.get("category"),
        "done": bool(row.get("done", False)),
        "created_at": ts.isoformat() if ts is not None else None,
    }


class FeedbackStorage:
    def add_feedback(self, subject: str, category: str, message: str, contact: Optional[str] = None, app_version: Optional[str] = None, pelada_id: Optional[int] = None) -> int:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO feedback (pelada_id, subject, category, message, contact, app_version)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (pelada_id, subject, category, message, contact, app_version),
                )
                return int(cur.fetchone()["id"])

    def list_feedback(self) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM feedback ORDER BY created_at DESC, id DESC")
                return [_row_to_feedback(r) for r in cur.fetchall()]

    def get_feedback(self, feedback_id: int) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM feedback WHERE id = %s", (feedback_id,))
                row = cur.fetchone()
                return _row_to_feedback(row) if row else None

    def mark_read(self, feedback_id: int) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE feedback SET is_read = TRUE WHERE id = %s", (feedback_id,))
                return cur.rowcount > 0

    def delete_feedback(self, feedback_id: int) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM feedback WHERE id = %s", (feedback_id,))
                return cur.rowcount > 0

    def add_useful(self, feedback_id: int, subject: str, message: Optional[str], category: Optional[str]) -> Dict:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO useful_items (feedback_id, subject, message, category)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *
                    """,
                    (feedback_id, subject, message, category),
                )
                return _row_to_useful(cur.fetchone())

    def list_useful(self) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM useful_items ORDER BY done, created_at DESC, id DESC")
                return [_row_to_useful(r) for r in cur.fetchall()]

    def set_useful_done(self, useful_id: int, done: bool) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE useful_items SET done = %s WHERE id = %s RETURNING *",
                    (done, useful_id),
                )
                row = cur.fetchone()
                return _row_to_useful(row) if row else None

    def delete_useful(self, useful_id: int) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM useful_items WHERE id = %s", (useful_id,))
                return cur.rowcount > 0


def _row_to_user(row) -> Dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row.get("name"),
        "picture": row.get("picture"),
    }


class UserStorage:
    def upsert_google_user(self, google_sub: str, email: str, name: Optional[str], picture: Optional[str]) -> Dict:
        """Find the user by google_sub (or by email, for a pre-seeded owner whose
        sub is still NULL) and update their profile; create them otherwise."""
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM users WHERE google_sub = %s", (google_sub,))
                row = cur.fetchone()
                if row is None:
                    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                    row = cur.fetchone()

                if row is not None:
                    cur.execute(
                        """
                        UPDATE users
                        SET google_sub = %s, email = %s, name = %s, picture = %s
                        WHERE id = %s
                        RETURNING *
                        """,
                        (google_sub, email, name, picture, row["id"]),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO users (google_sub, email, name, picture)
                        VALUES (%s, %s, %s, %s)
                        RETURNING *
                        """,
                        (google_sub, email, name, picture),
                    )
                return _row_to_user(cur.fetchone())

    def get_user(self, user_id: int) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                row = cur.fetchone()
                return _row_to_user(row) if row else None

    def get_role(self, pelada_id: int, user_id: int) -> Optional[str]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT role FROM pelada_members WHERE pelada_id = %s AND user_id = %s",
                    (pelada_id, user_id),
                )
                row = cur.fetchone()
                return row["role"] if row else None

    def list_user_peladas(self, user_id: int) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT p.id, p.name, p.team1_color, p.team2_color, p.game_weekday,
                           m.role, COUNT(pl.id) AS player_count
                    FROM pelada_members m
                    JOIN peladas p ON p.id = m.pelada_id
                    LEFT JOIN players pl ON pl.pelada_id = p.id
                    WHERE m.user_id = %s
                    GROUP BY p.id, p.name, p.team1_color, p.team2_color, p.game_weekday, m.role
                    ORDER BY p.id
                    """,
                    (user_id,),
                )
                result = []
                for r in cur.fetchall():
                    pelada = _row_to_pelada(r)
                    pelada["role"] = r["role"]
                    result.append(pelada)
                return result

    def add_membership(self, pelada_id: int, user_id: int, role: str) -> None:
        """Add the user to the pelada with the given role. Idempotent: if they
        are already a member, their role is left unchanged."""
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO pelada_members (pelada_id, user_id, role)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (pelada_id, user_id) DO NOTHING
                    """,
                    (pelada_id, user_id, role),
                )

    def list_members(self, pelada_id: int) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT u.id, u.name, u.email, u.picture, m.role
                    FROM pelada_members m
                    JOIN users u ON u.id = m.user_id
                    WHERE m.pelada_id = %s
                    ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name
                    """,
                    (pelada_id,),
                )
                members = []
                for r in cur.fetchall():
                    member = _row_to_user(r)
                    member["role"] = r["role"]
                    members.append(member)
                return members

    def remove_member(self, pelada_id: int, user_id: int) -> bool:
        """Remove a member. The owner can never be removed this way."""
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM pelada_members WHERE pelada_id = %s AND user_id = %s AND role <> 'owner'",
                    (pelada_id, user_id),
                )
                return cur.rowcount > 0


def _row_to_invite(row) -> Dict:
    exp = row.get("expires_at")
    return {
        "id": row["id"],
        "pelada_id": row["pelada_id"],
        "token": row["token"],
        "role": row["role"],
        "expires_at": exp.isoformat() if exp is not None else None,
        "revoked_at": row["revoked_at"].isoformat() if row.get("revoked_at") is not None else None,
        "accepted_count": int(row.get("accepted_count", 0)),
        "pelada_name": row.get("pelada_name"),
    }


class InviteStorage:
    def add_invite(self, pelada_id: int, role: str, created_by: int, expires_at) -> Dict:
        token = secrets.token_urlsafe(24)
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO pelada_invites (pelada_id, token, role, created_by, expires_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (pelada_id, token, role, created_by, expires_at),
                )
                return _row_to_invite(cur.fetchone())

    def get_invite(self, token: str) -> Optional[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT i.*, p.name AS pelada_name
                    FROM pelada_invites i
                    JOIN peladas p ON p.id = i.pelada_id
                    WHERE i.token = %s
                    """,
                    (token,),
                )
                row = cur.fetchone()
                return _row_to_invite(row) if row else None

    def list_active_invites(self, pelada_id: int) -> List[Dict]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM pelada_invites
                    WHERE pelada_id = %s AND revoked_at IS NULL AND expires_at > NOW()
                    ORDER BY created_at DESC
                    """,
                    (pelada_id,),
                )
                return [_row_to_invite(r) for r in cur.fetchall()]

    def revoke_invite(self, token: str) -> bool:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE pelada_invites SET revoked_at = NOW() WHERE token = %s AND revoked_at IS NULL",
                    (token,),
                )
                return cur.rowcount > 0

    def record_acceptance(self, invite_id: int) -> None:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE pelada_invites SET accepted_count = accepted_count + 1 WHERE id = %s",
                    (invite_id,),
                )


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
        is_goalkeeper: bool = False,
        gk_footwork: int = 1,
    ) -> Player:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO players (pelada_id, name, rating, active, marking, stamina, scoring, is_goalkeeper, gk_footwork)
                    VALUES (%s, %s, %s, TRUE, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (pelada_id, name, rating, marking, stamina, scoring, is_goalkeeper, gk_footwork),
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
        is_goalkeeper: Optional[bool] = None,
        gk_footwork: Optional[int] = None,
    ) -> Optional[Player]:
        with _get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE players
                    SET name          = %s,
                        rating        = %s,
                        marking       = COALESCE(%s, marking),
                        stamina       = COALESCE(%s, stamina),
                        scoring       = COALESCE(%s, scoring),
                        is_goalkeeper = COALESCE(%s, is_goalkeeper),
                        gk_footwork   = COALESCE(%s, gk_footwork)
                    WHERE id = %s AND pelada_id = %s
                    RETURNING *
                    """,
                    (name, rating, marking, stamina, scoring, is_goalkeeper, gk_footwork, player_id, pelada_id),
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