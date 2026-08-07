# Pelada Manager - Project Context

## Purpose
Pelada Manager is a web application designed to manage recreational football (soccer) groups (known in Brazil as "peladas"). It allows users to maintain a roster of players, check their attendance, and use an algorithm to divide the attendees into balanced teams based on their skills and positions.

## Architecture
- **Type**: Single Page Application (SPA) with a JSON REST API.
- **Backend**: Python with Flask.
- **Database**: PostgreSQL (interacted via `psycopg2`).
- **Frontend**: Vanilla JavaScript (Modular architecture, no heavy frameworks), HTML, CSS.
- **Deployment**: Configured for Vercel (WSGI for Flask). It supports Android TWA (Trusted Web Activity) via PWABuilder.

## Directory Structure
- `/app.py`: Main backend entrypoint, route definitions, and authentication middlewares.
- `/models.py`: Domain models (e.g., `Player` dataclass).
- `/services/`: Business logic. Contains `team_balancer.py` where the team division algorithm resides.
- `/storage/`: Database persistence layer (`postgres_storage.py`).
- `/static/js/`: Frontend JavaScript modules.
  - `auth.js`: Google login and session management.
  - `api.js`: Fetch wrappers.
  - `players.js`: UI logic for the player roster, check-in, and pelada creation.
  - `teams.js`: UI logic for team draw, balance comparison, and WhatsApp sharing.
  - `invites.js`: UI for generating and accepting join links.
- `/tests/`: Pytest suite.

## Domain Model
### Player Model
Defined in `models.py`, the `Player` dataclass includes:
- `id` (int): Database ID.
- `name` (str): Player's name.
- `rating` (float): Main skill classification (e.g., 1.0 to 5.0).
- `active` (bool): Attendance status for the current session.
- `is_goalkeeper` (bool): Indicates if the player is a goalkeeper.

### Additional Balancing Attributes
- `marking` (int): Defensive capability (1-3).
- `stamina` (int): Endurance (1-3).
- `scoring` (int): Finishing/goal-scoring ability (1-3).
- `gk_footwork` (int): Goalkeeper's ability to play with their feet (1-3), used to calculate keeper advantage.

## Team Generation & Balancing Algorithm
Located in `services/team_balancer.py`.

### Goalkeeper Seeding
- Only the first two goalkeepers are assigned as fixed goalkeepers (one per playing team). They occupy a slot (reducing outfield capacity by 1).
- Any extra goalkeepers are treated as outfielders.
- Fixed goalkeepers contribute an "advantage" score to their team (`_gk_advantage`), which is a function of their `rating`, `gk_footwork`, and a baseline. This seeds the team so outfielders compensate for a weaker keeper.

### Outfielder Selection
- Outfielders are sorted by rating in descending order, with a random tie-breaker.
- Each player is sequentially assigned to the team where their addition results in the lowest penalty score.
- The penalty score (`_team_score_if_added`) heavily weighs:
  1. Rating spread (variance between team totals).
  2. Concentration of extreme players (too many top or weak players on one team).
  3. Concentration of attributes (imbalance in marking, stamina, or scoring).
  4. Team size and rating variance.

### Swapping Phase
- After initial distribution, a controlled swapping phase (`_apply_attribute_aware_swaps`) is executed.
- It attempts random swaps between outfield players with a rating difference of <= 0.5.
- A swap is finalized only if it improves the overall balance score by a meaningful threshold.

## Authentication
- Handled via Google One Tap (Google Identity Services).
- Frontend sends the `credential` token to `POST /api/auth/google`.
- Backend verifies it using `google.oauth2.id_token`.
- Backend issues a session token using `itsdangerous.URLSafeTimedSerializer`, which is returned to the client and stored in `localStorage`.
- The client sends this token in the `Authorization` header (`Bearer <token>`).

## Authorization & Role Permission Matrix
Access control is managed in `app.py` via middlewares like `_require_membership` and `_require_pelada`.

- **Member**:
  - Capabilities: Can view the pelada, check in, view player names and public data, and leave the pelada.
  - Restrictions: Cannot see player ratings or attributes. Cannot generate draws or edit data.
- **Admin**:
  - Capabilities: Can view and edit players, ratings, attributes, perform draws, and change pelada configuration.
  - Restrictions: Cannot delete the pelada or transfer ownership.
- **Owner**:
  - Capabilities: Everything an admin can do, plus transfer ownership, manage admin roles, and delete the pelada.

## Database Model
Managed in `storage/postgres_storage.py`.
Tables:
- `peladas`: The groups (id, name, colors, game_weekday, created_at).
- `players`: Players linked to a pelada (id, pelada_id, name, rating, active, marking, stamina, scoring, is_goalkeeper, gk_footwork).
- `users`: Authenticated users via Google (id, sub, email, name, picture).
- `memberships`: Links users to peladas and stores their role (user_id, pelada_id, role).
- `invites`: Invite links for peladas (id, token, pelada_id, created_by, role, expires_at).
- `feedback`: User bug reports / suggestions.
- `client_logs`: Error tracking from the frontend.

## Important Configurations
- `DATABASE_URL`: Postgres connection string.
- `GOOGLE_CLIENT_ID`: Required for authentication.
- `SECRET_KEY`: Used by `itsdangerous` to sign session tokens.
- `SUPERADMIN_EMAIL`: Email address granted access to the global feedback inbox (`/admin`).
- `ANDROID_PACKAGE_NAME` & `ANDROID_CERT_FINGERPRINT`: Used for TWA Digital Asset Links validation.

## Known Technical Debt & Architectural Decisions
- The database schema is initialized directly from Python using raw `psycopg2` (`ensure_schema()`). There is no robust migration tool (like Alembic) configured; instead, `ALTER TABLE ... IF NOT EXISTS` blocks are used.
- Frontend uses plain Vanilla JS without a build step or bundler. Global functions and state are shared across modules, which requires care when scaling.
- The `is_admin` boolean dictates whether sensitive fields (like ratings) are serialized to JSON in the API (`_player_json` in `app.py`). This invariant must be preserved so members cannot reverse-engineer team logic.
- Tests (e.g., `test_team_balancer.py`) use dummy classes for dependencies since they skip DB initialization when `DATABASE_URL` is missing.
