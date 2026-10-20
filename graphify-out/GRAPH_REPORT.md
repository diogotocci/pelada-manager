# Graph Report - pelada-manager  (2026-10-20)

## Corpus Check
- 37 files · ~46,172 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .ini 1, .toml 1)

## Summary
- 875 nodes · 1750 edges · 36 communities (29 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d2ed05d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- Player
- test_match_stats.py
- match.js
- players.js
- test_positions.py
- ui.js
- test_invites.py
- admin.js
- test_account.py
- test_admin.py
- test_membership.py
- invites.js
- pitch.js
- teams.js
- git-workflow.md
- UserStorage
- test_clientlog.py
- test_feedback.py
- position-warnings.js
- test_auth_google.py
- manifest.json
- Pelada Manager - Project Context
- compare.js
- _get_connection
- PlayerStorage
- postgres_storage.py
- PeladaStorage
- Project coding standards
- auth.js
- MatchStatsStorage
- InviteStorage
- ⚙️ Build and run locally
- api.js
- project.md
- sw.js

## God Nodes (most connected - your core abstractions)
1. `_get_connection()` - 49 edges
2. `Player` - 40 edges
3. `balance_teams()` - 36 edges
4. `_require_pelada()` - 18 edges
5. `_auth()` - 18 edges
6. `_require_membership()` - 16 edges
7. `mk()` - 16 edges
8. `_issue_session_token()` - 15 edges
9. `_mark()` - 15 edges
10. `_player_json()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Directory Structure` --references--> `Player`  [INFERRED]
  docs/PROJECT_CONTEXT.md → models.py
- `Player Model` --references--> `Player`  [INFERRED]
  docs/PROJECT_CONTEXT.md → models.py
- `Authorization & Role Permission Matrix` --references--> `_require_membership()`  [INFERRED]
  docs/PROJECT_CONTEXT.md → app.py
- `Authorization & Role Permission Matrix` --references--> `_require_pelada()`  [INFERRED]
  docs/PROJECT_CONTEXT.md → app.py
- `Known Technical Debt & Architectural Decisions` --references--> `_player_json()`  [INFERRED]
  docs/PROJECT_CONTEXT.md → app.py

## Import Cycles
- None detected.

## Communities (36 total, 7 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.05
Nodes (61): accept_invite(), admin_clear_errors(), admin_delete_feedback(), admin_delete_useful(), admin_list_errors(), admin_list_feedback(), admin_list_useful(), admin_mark_read() (+53 more)

### Community 1 - "Player"
Cohesion: 0.07
Nodes (58): Goalkeeper Seeding, Outfielder Selection, Swapping Phase, Team Generation & Balancing Algorithm, Player, _apply_attribute_aware_swaps(), balance_teams(), _count_attribute_value() (+50 more)

### Community 2 - "test_match_stats.py"
Cohesion: 0.05
Nodes (43): change_player_stat(), _ranking_json(), _require_stats_pelada(), stats_day_ranking(), stats_today(), stats_year_ranking(), _visible_day_ranking(), day_ranking_until() (+35 more)

### Community 3 - "match.js"
Cohesion: 0.09
Nodes (54): addTimerMinute(), applyMatchSettings(), BALL_PATHS, ballIconSVG(), bootIconSVG(), buildRankingText(), changeLiveStat(), currentRankingRows() (+46 more)

### Community 4 - "players.js"
Cohesion: 0.09
Nodes (43): askDeletePlayer(), buildFieldCheckinRow(), togglePresence(), checkAll(), deleteAccount(), enterPelada(), getPresentIds(), goHome() (+35 more)

### Community 5 - "test_positions.py"
Cohesion: 0.08
Nodes (29): _day_position_active(), _issue_session_token(), day_position_until(), effective_position(), today_local(), test_create_pelada_with_stats(), test_create_pelada_with_stats_needs_weekday(), _auth() (+21 more)

### Community 6 - "ui.js"
Cohesion: 0.06
Nodes (27): applyTheme(), BIB_COLORS, buildBibEl(), buildStarsHTML(), checkinState, closeSheets(), dateLabel(), formatDecimal() (+19 more)

### Community 7 - "test_invites.py"
Cohesion: 0.09
Nodes (24): _auth(), env(), FakeInviteStorage, FakeUserStorage, _iso(), _seed_invite(), test_accept_adds_membership(), test_accept_expired_invite_is_410() (+16 more)

### Community 8 - "admin.js"
Cohesion: 0.20
Nodes (26): api(), CATEGORY, catTag(), clearErrors(), deleteFeedback(), deleteUseful(), escapeHTML(), feedbackList (+18 more)

### Community 9 - "test_account.py"
Cohesion: 0.12
Nodes (15): _auth(), env(), FakeUsers, test_admin_can_demote_admin_to_member(), test_admin_can_promote_member_to_admin(), test_changing_role_of_non_member_is_404(), test_delete_account(), test_invalid_target_role_is_rejected() (+7 more)

### Community 10 - "test_admin.py"
Cohesion: 0.11
Nodes (12): _auth(), client(), FakeStore, FakeUsers, test_delete_feedback(), test_list_feedback_reports_unread_count(), test_mark_read(), test_mark_read_missing_is_404() (+4 more)

### Community 11 - "test_membership.py"
Cohesion: 0.11
Nodes (12): _auth(), env(), FakePeladaStorage, FakeUserStorage, test_create_pelada_makes_the_user_owner(), test_list_peladas_returns_only_the_users_peladas(), test_membership_requires_login(), test_membership_requires_pelada_header() (+4 more)

### Community 12 - "invites.js"
Cohesion: 0.16
Nodes (21): acceptInvite(), detectInviteFromUrl(), generateInvite(), getPendingInvite(), handleInviteAfterAuth(), INVITE_ROLE_OPTS, INVITE_TTL_OPTS, inviteErrorHTML() (+13 more)

### Community 13 - "pitch.js"
Cohesion: 0.18
Nodes (21): buildFormation(), buildPitchEl(), byName(), defenseSlots(), drawHalf(), drawPitchFloor(), drawPitchImage(), drawPlayerChip() (+13 more)

### Community 14 - "teams.js"
Cohesion: 0.23
Nodes (19): buildShareText(), confirmDraw(), copyShareText(), getTeamAuditStats(), getTeamColorKey(), openDrawSheet(), performDraw(), redraw() (+11 more)

### Community 15 - "git-workflow.md"
Cohesion: 0.11
Nodes (17): Application Version, Commit, Continuing an Existing Task, Creating the Task Branch, During Development, Final Report, Git Workflow, Pull Request (+9 more)

### Community 17 - "test_clientlog.py"
Cohesion: 0.14
Nodes (6): _auth(), client(), FakeClientLog, FakeUsers, test_admin_clears_errors(), test_admin_lists_errors()

### Community 18 - "test_feedback.py"
Cohesion: 0.18
Nodes (11): client(), FakeFeedbackStorage, _payload(), test_anonymous_feedback_is_not_scoped(), test_contact_is_optional(), test_empty_message_is_rejected(), test_invalid_category_is_rejected(), test_logged_in_user_scopes_feedback_to_the_current_pelada() (+3 more)

### Community 19 - "position-warnings.js"
Cohesion: 0.26
Nodes (15): countPositions(), currentPositionCheck(), movePlayerForBalance(), openPositionFixSheet(), POSITION_NOUNS, positionNoun(), positionWarnings(), presentOutfielders() (+7 more)

### Community 20 - "test_auth_google.py"
Cohesion: 0.13
Nodes (4): client(), FakeUserStorage, test_invalid_google_token_is_rejected(), test_me_returns_the_logged_in_user()

### Community 21 - "manifest.json"
Cohesion: 0.13
Nodes (14): background_color, categories, description, dir, display, icons, id, lang (+6 more)

### Community 22 - "Pelada Manager - Project Context"
Cohesion: 0.14
Nodes (13): Additional Balancing Attributes, Architecture, Authentication, Authorization & Role Permission Matrix, Database Model, Directory Structure, Domain Model, Important Configurations (+5 more)

### Community 23 - "compare.js"
Cohesion: 0.33
Nodes (12): autoScrollCompare(), clampToTier(), COMPARE_TIERS, comparePlayerPayload(), makeChip(), moveGhost(), onChipPointerDown(), onChipPointerMove() (+4 more)

### Community 24 - "_get_connection"
Cohesion: 0.29
Nodes (4): FeedbackStorage, _get_connection(), _row_to_feedback(), _row_to_useful()

### Community 26 - "postgres_storage.py"
Cohesion: 0.18
Nodes (3): Known Technical Debt & Architectural Decisions, ClientLogStorage, ensure_schema()

### Community 28 - "Project coding standards"
Cohesion: 0.22
Nodes (8): AI attribution, Application version, Completion requirements, Language, No emojis in code, Project coding standards, Repository configuration, Tests

### Community 29 - "auth.js"
Cohesion: 0.47
Nodes (8): clearUserSession(), getCurrentUser(), handleGoogleCredential(), initGoogleLogin(), logoutUser(), refreshUserSession(), renderAccountBar(), setUserSession()

### Community 32 - "⚙️ Build and run locally"
Cohesion: 0.40
Nodes (4): ⚙️ Build and run locally, Build the image, pelada-manager, Run the container

### Community 33 - "api.js"
Cohesion: 0.70
Nodes (4): authHeaders(), fetchJSON(), fetchJSONRaw(), handleSessionExpired()

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `balance_teams()` connect `Player` to `app.py`, `test_positions.py`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 17 inferred relationships involving `Player` (e.g. with `Directory Structure` and `Player Model`) actually correct?**
  _`Player` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.051055867415129644 - nodes in this community are weakly interconnected._
- **Why does `goHome()` connect `players.js` to `match.js`, `invites.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.07243243243243243 - nodes in this community are weakly interconnected._
- **Why does `Player` connect `Player` to `app.py`, `test_positions.py`, `Pelada Manager - Project Context`, `PlayerStorage`, `postgres_storage.py`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `test_match_stats.py` be split into smaller, more focused modules?**
  _Cohesion score 0.050078247261345854 - nodes in this community are weakly interconnected._