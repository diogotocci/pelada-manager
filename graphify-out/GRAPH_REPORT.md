# Graph Report - pelada-manager  (2026-08-13)

## Corpus Check
- 41 files · ~41,342 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 647 nodes · 1133 edges · 35 communities (28 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac2775f6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.py
- _get_connection
- Player
- players.js
- ui.js
- test_clientlog.py
- test_invites.py
- admin.js
- test_account.py
- test_admin.py
- test_membership.py
- invites.js
- teams.js
- test_feedback.py
- manifest.json
- compare.js
- auth.js
- api.js
- sw.js
- What You Must Do When Invoked
- git-workflow.md
- Pelada Manager - Project Context
- Project coding standards
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- ⚙️ Build and run locally
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- rules/graphify.md
- project.md
- extraction-spec.md
- workflows/graphify.md

## God Nodes (most connected - your core abstractions)
1. `_get_connection()` - 41 edges
2. `Player` - 30 edges
3. `balance_teams()` - 21 edges
4. `_auth()` - 18 edges
5. `_require_membership()` - 15 edges
6. `_require_pelada()` - 14 edges
7. `_auth()` - 14 edges
8. `UserStorage` - 13 edges
9. `_require_superadmin()` - 12 edges
10. `FeedbackStorage` - 12 edges

## Surprising Connections (you probably didn't know these)
- `test_membership_requires_login()` --calls--> `_require_membership()`  [EXTRACTED]
  tests/test_membership.py → app.py
- `ClientLogStorage` --uses--> `Player`  [INFERRED]
  storage/postgres_storage.py → models.py
- `FeedbackStorage` --uses--> `Player`  [INFERRED]
  storage/postgres_storage.py → models.py
- `InviteStorage` --uses--> `Player`  [INFERRED]
  storage/postgres_storage.py → models.py
- `PeladaStorage` --uses--> `Player`  [INFERRED]
  storage/postgres_storage.py → models.py

## Import Cycles
- None detected.

## Communities (35 total, 7 thin omitted)

### Community 0 - "app.py"
Cohesion: 0.07
Nodes (66): accept_invite(), admin_clear_errors(), admin_delete_feedback(), admin_delete_useful(), admin_list_errors(), admin_list_feedback(), admin_list_useful(), admin_mark_read() (+58 more)

### Community 1 - "_get_connection"
Cohesion: 0.06
Nodes (23): ClientLogStorage, ensure_schema(), FeedbackStorage, _get_connection(), InviteStorage, PeladaStorage, PlayerStorage, Create the database tables if they do not exist. Peladas have a password for… (+15 more)

### Community 2 - "Player"
Cohesion: 0.13
Nodes (36): Player, _apply_attribute_aware_swaps(), balance_teams(), _count_attribute_value(), _count_players_at_or_above(), _count_players_at_or_below(), _create_empty_teams(), _gk_advantage() (+28 more)

### Community 3 - "players.js"
Cohesion: 0.10
Nodes (35): askDeletePlayer(), checkAll(), deleteAccount(), enterPelada(), getPresentIds(), goHome(), leaveCurrentPelada(), loadPeladas() (+27 more)

### Community 4 - "ui.js"
Cohesion: 0.08
Nodes (28): applyTheme(), BIB_COLORS, buildBibEl(), buildStarsHTML(), checkinState, closeSheets(), dateLabel(), formatDecimal() (+20 more)

### Community 5 - "test_clientlog.py"
Cohesion: 0.07
Nodes (14): _issue_session_token(), client(), FakeUserStorage, fixture, Google login: token exchange and the current-user endpoint. The Google token…, test_me_returns_the_logged_in_user(), _auth(), client() (+6 more)

### Community 6 - "test_invites.py"
Cohesion: 0.09
Nodes (27): _auth(), env(), FakeInviteStorage, FakeUserStorage, _iso(), fixture, Phase 3 invites: create/list/revoke, the public preview, and accepting an…, Members see only invites they created; admins/owners see all. (+19 more)

### Community 7 - "admin.js"
Cohesion: 0.20
Nodes (26): api(), CATEGORY, catTag(), clearErrors(), deleteFeedback(), deleteUseful(), escapeHTML(), feedbackList (+18 more)

### Community 8 - "test_account.py"
Cohesion: 0.12
Nodes (17): _auth(), env(), FakeUsers, fixture, Phase 4 features: delete account, transfer ownership, leave pelada. Storage is…, test_admin_can_demote_admin_to_member(), test_admin_can_promote_member_to_admin(), test_changing_role_of_non_member_is_404() (+9 more)

### Community 9 - "test_admin.py"
Cohesion: 0.12
Nodes (14): _auth(), client(), FakeStore, FakeUsers, fixture, General-admin (/admin) feedback inbox: authorization (by Google email) and…, test_delete_feedback(), test_list_feedback_reports_unread_count() (+6 more)

### Community 10 - "test_membership.py"
Cohesion: 0.11
Nodes (15): _auth(), env(), FakePeladaStorage, FakeUserStorage, fixture, parametrize, Phase 2 authorization: access to a pelada comes from the caller's membership…, test_create_pelada_makes_the_user_owner() (+7 more)

### Community 11 - "invites.js"
Cohesion: 0.16
Nodes (21): acceptInvite(), detectInviteFromUrl(), generateInvite(), getPendingInvite(), handleInviteAfterAuth(), INVITE_ROLE_OPTS, INVITE_TTL_OPTS, inviteErrorHTML() (+13 more)

### Community 12 - "teams.js"
Cohesion: 0.23
Nodes (19): buildShareText(), confirmDraw(), copyShareText(), getTeamAuditStats(), getTeamColorKey(), openDrawSheet(), performDraw(), redraw() (+11 more)

### Community 13 - "test_feedback.py"
Cohesion: 0.18
Nodes (14): client(), FakeFeedbackStorage, _payload(), fixture, parametrize, Feedback endpoint: validation and storage forwarding. Runs without a database…, test_anonymous_feedback_is_not_scoped(), test_contact_is_optional() (+6 more)

### Community 14 - "manifest.json"
Cohesion: 0.12
Nodes (15): sports, background_color, categories, description, dir, display, icons, id (+7 more)

### Community 15 - "compare.js"
Cohesion: 0.35
Nodes (12): autoScrollCompare(), clampToTier(), COMPARE_TIERS, comparePlayerPayload(), makeChip(), moveGhost(), onChipPointerDown(), onChipPointerMove() (+4 more)

### Community 16 - "auth.js"
Cohesion: 0.47
Nodes (8): clearUserSession(), getCurrentUser(), handleGoogleCredential(), initGoogleLogin(), logoutUser(), refreshUserSession(), renderAccountBar(), setUserSession()

### Community 17 - "api.js"
Cohesion: 0.70
Nodes (4): authHeaders(), fetchJSON(), fetchJSONRaw(), handleSessionExpired()

### Community 19 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 20 - "git-workflow.md"
Cohesion: 0.11
Nodes (17): Application Version, Commit, Continuing an Existing Task, Creating the Task Branch, During Development, Final Report, Git Workflow, Pull Request (+9 more)

### Community 21 - "Pelada Manager - Project Context"
Cohesion: 0.12
Nodes (16): Additional Balancing Attributes, Architecture, Authentication, Authorization & Role Permission Matrix, Database Model, Directory Structure, Domain Model, Goalkeeper Seeding (+8 more)

### Community 22 - "Project coding standards"
Cohesion: 0.22
Nodes (8): AI attribution, Application version, Completion requirements, Language, No emojis in code, Project coding standards, Repository configuration, Tests

### Community 23 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 24 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 25 - "⚙️ Build and run locally"
Cohesion: 0.40
Nodes (4): ⚙️ Build and run locally, Build the image, pelada-manager, Run the container

### Community 26 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 27 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 28 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **109 isolated node(s):** `feedbackList`, `usefulList`, `CATEGORY`, `INVITE_ROLE_OPTS`, `INVITE_TTL_OPTS` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `balance_teams()` connect `Player` to `app.py`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `UserStorage` connect `_get_connection` to `app.py`, `Player`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Player` (e.g. with `ClientLogStorage` and `FeedbackStorage`) actually correct?**
  _`Player` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedbackList`, `usefulList`, `CATEGORY` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06990622335890878 - nodes in this community are weakly interconnected._
- **Should `_get_connection` be split into smaller, more focused modules?**
  _Cohesion score 0.0629800307219662 - nodes in this community are weakly interconnected._
- **Should `Player` be split into smaller, more focused modules?**
  _Cohesion score 0.12804878048780488 - nodes in this community are weakly interconnected._