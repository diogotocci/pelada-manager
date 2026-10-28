# Graph Report - pelada-manager  (2026-10-28)

## Corpus Check
- 44 files · ~49,562 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .ini 1, .toml 1)

## Summary
- 1033 nodes · 2043 edges · 46 communities (40 shown, 6 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b684357d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- balance_teams
- test_match_stats.py
- players.js
- match.js
- ui.js
- test_positions.py
- test_panelinha.py
- test_invites.py
- app.py
- admin.js
- test_account.py
- test_admin.py
- pitch.js
- test_membership.py
- invites.js
- route
- _require_pelada
- Player
- teams.js
- test_dominant_foot.py
- git-workflow.md
- UserStorage
- test_clientlog.py
- pelada-manager
- _get_connection
- test_feedback.py
- test_bot_filter.py
- Pelada Manager - Project Context
- position-warnings.js
- test_auth_google.py
- test_validation.py
- steps
- manifest.json
- stats_date
- compare.js
- postgres_storage.py
- PeladaStorage
- Project coding standards
- updates
- auth.js
- MatchStatsStorage
- create_player
- ⚙️ Build and run locally
- api.js
- project.md
- sw.js

## God Nodes (most connected - your core abstractions)
1. `Player` - 51 edges
2. `_get_connection()` - 50 edges
3. `balance_teams()` - 39 edges
4. `_require_pelada()` - 19 edges
5. `renderCheckin()` - 19 edges
6. `_player_json()` - 18 edges
7. `balance_teams_with_group()` - 18 edges
8. `_auth()` - 18 edges
9. `_issue_session_token()` - 17 edges
10. `_require_membership()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Directory Structure` --references--> `Player`  [INFERRED]
  docs/PROJECT_CONTEXT.md → models.py
- `Player Model` --references--> `Player`  [INFERRED]
  docs/PROJECT_CONTEXT.md → models.py
- `Authorization & Role Permission Matrix` --references--> `_require_membership()`  [INFERRED]
  docs/PROJECT_CONTEXT.md → app.py
- `Known Technical Debt & Architectural Decisions` --references--> `_player_json()`  [INFERRED]
  docs/PROJECT_CONTEXT.md → app.py
- `Goalkeeper Seeding` --references--> `_gk_advantage()`  [INFERRED]
  docs/PROJECT_CONTEXT.md → services/team_balancer.py

## Import Cycles
- None detected.

## Communities (46 total, 6 thin omitted)

### Community 0 - "balance_teams"
Cohesion: 0.08
Nodes (52): Goalkeeper Seeding, Outfielder Selection, Swapping Phase, Team Generation & Balancing Algorithm, _apply_attribute_aware_swaps(), balance_teams(), _count_attribute_value(), _count_players_at_or_above() (+44 more)

### Community 1 - "test_match_stats.py"
Cohesion: 0.06
Nodes (35): day_ranking_until(), expired_dates(), is_day_visible(), parse_delta(), rank_rows(), _auth(), env(), FakePeladas (+27 more)

### Community 2 - "players.js"
Cohesion: 0.07
Nodes (56): askDeletePlayer(), buildFieldCheckinRow(), togglePresence(), buildPanelinhaPickRow(), checkAll(), closePanelinhaMode(), deleteAccount(), dropAbsentFromPanelinha() (+48 more)

### Community 3 - "match.js"
Cohesion: 0.08
Nodes (55): addTimerMinute(), applyMatchSettings(), BALL_PATHS, ballIconSVG(), bootIconSVG(), buildRankingText(), changeLiveStat(), copyShareText() (+47 more)

### Community 4 - "ui.js"
Cohesion: 0.06
Nodes (37): applyTheme(), approxColorName(), BIB_COLORS, buildBibEl(), buildStarsHTML(), checkinState, closeSheets(), dateLabel() (+29 more)

### Community 5 - "test_positions.py"
Cohesion: 0.06
Nodes (35): _apply_day_positions(), _day_position_active(), _issue_session_token(), day_position_until(), effective_position(), today_local(), test_create_pelada_with_stats(), test_create_pelada_with_stats_needs_weekday() (+27 more)

### Community 6 - "test_panelinha.py"
Cohesion: 0.08
Nodes (28): balance_teams_with_group(), _group_count(), _auth(), env(), FakePeladas, FakePlayers, FakeUsers, mk() (+20 more)

### Community 7 - "test_invites.py"
Cohesion: 0.09
Nodes (24): _auth(), env(), FakeInviteStorage, FakeUserStorage, _iso(), _seed_invite(), test_accept_adds_membership(), test_accept_expired_invite_is_410() (+16 more)

### Community 8 - "app.py"
Cohesion: 0.09
Nodes (17): accept_invite(), admin_page(), assetlinks(), auth_google(), client_log(), _current_user(), delete_account(), get_invite_info() (+9 more)

### Community 9 - "admin.js"
Cohesion: 0.20
Nodes (26): api(), CATEGORY, catTag(), clearErrors(), deleteFeedback(), deleteUseful(), escapeHTML(), feedbackList (+18 more)

### Community 10 - "test_account.py"
Cohesion: 0.12
Nodes (15): _auth(), env(), FakeUsers, test_admin_can_demote_admin_to_member(), test_admin_can_promote_member_to_admin(), test_changing_role_of_non_member_is_404(), test_delete_account(), test_invalid_target_role_is_rejected() (+7 more)

### Community 11 - "test_admin.py"
Cohesion: 0.11
Nodes (12): _auth(), client(), FakeStore, FakeUsers, test_delete_feedback(), test_list_feedback_reports_unread_count(), test_mark_read(), test_mark_read_missing_is_404() (+4 more)

### Community 12 - "pitch.js"
Cohesion: 0.18
Nodes (22): buildFormation(), buildPitchEl(), byName(), defenseSlots(), drawHalf(), drawPitchFloor(), drawPitchImage(), drawPlayerChip() (+14 more)

### Community 13 - "test_membership.py"
Cohesion: 0.11
Nodes (12): _auth(), env(), FakePeladaStorage, FakeUserStorage, test_create_pelada_makes_the_user_owner(), test_list_peladas_returns_only_the_users_peladas(), test_membership_requires_login(), test_membership_requires_pelada_header() (+4 more)

### Community 14 - "invites.js"
Cohesion: 0.16
Nodes (21): acceptInvite(), detectInviteFromUrl(), generateInvite(), getPendingInvite(), handleInviteAfterAuth(), INVITE_ROLE_OPTS, INVITE_TTL_OPTS, inviteErrorHTML() (+13 more)

### Community 15 - "route"
Cohesion: 0.15
Nodes (20): admin_clear_errors(), admin_delete_feedback(), admin_delete_useful(), admin_list_errors(), admin_list_feedback(), admin_list_useful(), admin_mark_read(), admin_mark_useful() (+12 more)

### Community 16 - "_require_pelada"
Cohesion: 0.12
Nodes (16): deactivate_all_players(), delete_player(), draw_teams(), _in_panelinha(), list_players(), _player_json(), _require_pelada(), set_active_batch() (+8 more)

### Community 17 - "Player"
Cohesion: 0.17
Nodes (4): Player, PlayerStorage, _row_to_player(), FakePlayers

### Community 18 - "teams.js"
Cohesion: 0.24
Nodes (17): confirmDraw(), getTeamAuditStats(), getTeamColorKey(), openDrawSheet(), performDraw(), redraw(), renderAudit(), renderDrawSheet() (+9 more)

### Community 19 - "test_dominant_foot.py"
Cohesion: 0.16
Nodes (12): _auth(), env(), FakePeladas, FakeUsers, test_create_player_dominant_foot_is_optional(), test_create_player_rejects_invalid_dominant_foot(), test_create_player_with_dominant_foot(), test_member_json_includes_dominant_foot() (+4 more)

### Community 20 - "git-workflow.md"
Cohesion: 0.11
Nodes (17): Application Version, Commit, Continuing an Existing Task, Creating the Task Branch, During Development, Final Report, Git Workflow, Pull Request (+9 more)

### Community 22 - "test_clientlog.py"
Cohesion: 0.14
Nodes (6): _auth(), client(), FakeClientLog, FakeUsers, test_admin_clears_errors(), test_admin_lists_errors()

### Community 23 - "pelada-manager"
Cohesion: 0.12
Nodes (16): context, dockerfile, APP_VERSION, FLASK_APP, FLASK_ENV, FLASK_RUN_HOST, PYTHONUNBUFFERED, build (+8 more)

### Community 24 - "_get_connection"
Cohesion: 0.21
Nodes (5): ClientLogStorage, FeedbackStorage, _get_connection(), _row_to_feedback(), _row_to_useful()

### Community 25 - "test_feedback.py"
Cohesion: 0.18
Nodes (11): client(), FakeFeedbackStorage, _payload(), test_anonymous_feedback_is_not_scoped(), test_contact_is_optional(), test_empty_message_is_rejected(), test_invalid_category_is_rejected(), test_logged_in_user_scopes_feedback_to_the_current_pelada() (+3 more)

### Community 26 - "test_bot_filter.py"
Cohesion: 0.16
Nodes (5): _reject_scanner_probes(), is_scanner_probe(), test_app_paths_are_not_detected(), test_probe_gets_plain_404_without_reaching_routes(), test_scanner_paths_are_detected()

### Community 27 - "Pelada Manager - Project Context"
Cohesion: 0.12
Nodes (14): Additional Balancing Attributes, Architecture, Authentication, Database Model, Directory Structure, Domain Model, Important Configurations, Known Technical Debt & Architectural Decisions (+6 more)

### Community 28 - "position-warnings.js"
Cohesion: 0.26
Nodes (15): countPositions(), currentPositionCheck(), movePlayerForBalance(), openPositionFixSheet(), POSITION_NOUNS, positionNoun(), positionWarnings(), presentOutfielders() (+7 more)

### Community 29 - "test_auth_google.py"
Cohesion: 0.13
Nodes (4): client(), FakeUserStorage, test_invalid_google_token_is_rejected(), test_me_returns_the_logged_in_user()

### Community 30 - "test_validation.py"
Cohesion: 0.19
Nodes (10): create_pelada(), _normalize_bib_color(), _parse_weekday(), update_pelada_colors(), update_pelada_weekday(), test_normalize_bib_color_accepts_custom_hex(), test_normalize_bib_color_accepts_presets(), test_normalize_bib_color_rejects_invalid() (+2 more)

### Community 31 - "steps"
Cohesion: 0.13
Nodes (14): jobs, test, name, on, pull_request, push, branches, name (+6 more)

### Community 32 - "manifest.json"
Cohesion: 0.13
Nodes (14): background_color, categories, description, dir, display, icons, id, lang (+6 more)

### Community 33 - "stats_date"
Cohesion: 0.22
Nodes (8): change_player_stat(), _ranking_json(), _require_stats_pelada(), stats_day_ranking(), stats_today(), stats_year_ranking(), _visible_day_ranking(), stats_date()

### Community 34 - "compare.js"
Cohesion: 0.33
Nodes (12): autoScrollCompare(), clampToTier(), COMPARE_TIERS, comparePlayerPayload(), makeChip(), moveGhost(), onChipPointerDown(), onChipPointerMove() (+4 more)

### Community 37 - "Project coding standards"
Cohesion: 0.22
Nodes (8): AI attribution, Application version, Completion requirements, Language, No emojis in code, Project coding standards, Repository configuration, Tests

### Community 38 - "updates"
Cohesion: 0.22
Nodes (8): interval, updates, directory, labels, open-pull-requests-limit, package-ecosystem, schedule, version

### Community 39 - "auth.js"
Cohesion: 0.47
Nodes (8): clearUserSession(), getCurrentUser(), handleGoogleCredential(), initGoogleLogin(), logoutUser(), refreshUserSession(), renderAccountBar(), setUserSession()

### Community 41 - "create_player"
Cohesion: 0.32
Nodes (6): create_player(), _is_valid_attribute(), _parse_dominant_foot(), _parse_position(), update_player(), test_is_valid_attribute()

### Community 42 - "⚙️ Build and run locally"
Cohesion: 0.40
Nodes (4): ⚙️ Build and run locally, Build the image, pelada-manager, Run the container

### Community 43 - "api.js"
Cohesion: 0.70
Nodes (4): authHeaders(), fetchJSON(), fetchJSONRaw(), handleSessionExpired()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Player` connect `Player` to `balance_teams`, `postgres_storage.py`, `test_positions.py`, `test_panelinha.py`, `_require_pelada`, `test_dominant_foot.py`, `Pelada Manager - Project Context`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `Player` (e.g. with `Directory Structure` and `Player Model`) actually correct?**
  _`Player` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Should `balance_teams` be split into smaller, more focused modules?**
  _Cohesion score 0.08397337429595494 - nodes in this community are weakly interconnected._
- **Why does `goHome()` connect `players.js` to `match.js`, `invites.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `test_match_stats.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05552617662612375 - nodes in this community are weakly interconnected._
- **Why does `UserStorage` connect `UserStorage` to `app.py`, `postgres_storage.py`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `players.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07231638418079096 - nodes in this community are weakly interconnected._