# Graph Report - .  (2026-08-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 522 nodes · 1012 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b057dc4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18

## God Nodes (most connected - your core abstractions)
1. `_get_connection()` - 41 edges
2. `Player` - 30 edges
3. `balance_teams()` - 21 edges
4. `_require_membership()` - 15 edges
5. `_require_pelada()` - 14 edges
6. `_auth()` - 14 edges
7. `UserStorage` - 13 edges
8. `_require_superadmin()` - 12 edges
9. `FeedbackStorage` - 12 edges
10. `_current_user()` - 11 edges

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

## Communities (19 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (66): accept_invite(), admin_clear_errors(), admin_delete_feedback(), admin_delete_useful(), admin_list_errors(), admin_list_feedback(), admin_list_useful(), admin_mark_read() (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (23): ClientLogStorage, ensure_schema(), FeedbackStorage, _get_connection(), InviteStorage, PeladaStorage, PlayerStorage, Create the database tables if they do not exist. Peladas have a password for… (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (36): Player, _apply_attribute_aware_swaps(), balance_teams(), _count_attribute_value(), _count_players_at_or_above(), _count_players_at_or_below(), _create_empty_teams(), _gk_advantage() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (35): askDeletePlayer(), checkAll(), deleteAccount(), enterPelada(), getPresentIds(), goHome(), leaveCurrentPelada(), loadPeladas() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (28): applyTheme(), BIB_COLORS, buildBibEl(), buildStarsHTML(), checkinState, closeSheets(), dateLabel(), formatDecimal() (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (14): _issue_session_token(), client(), FakeUserStorage, fixture, Google login: token exchange and the current-user endpoint. The Google token…, test_me_returns_the_logged_in_user(), _auth(), client() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): _auth(), env(), FakeInviteStorage, FakeUserStorage, _iso(), fixture, Phase 3 invites: create/list/revoke, the public preview, and accepting an…, _seed_invite() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (26): api(), CATEGORY, catTag(), clearErrors(), deleteFeedback(), deleteUseful(), escapeHTML(), feedbackList (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): _auth(), env(), FakeUsers, fixture, Phase 4 features: delete account, transfer ownership, leave pelada. Storage is…, test_admin_can_demote_admin_to_member(), test_admin_can_promote_member_to_admin(), test_changing_role_of_non_member_is_404() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (14): _auth(), client(), FakeStore, FakeUsers, fixture, General-admin (/admin) feedback inbox: authorization (by Google email) and…, test_delete_feedback(), test_list_feedback_reports_unread_count() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (15): _auth(), env(), FakePeladaStorage, FakeUserStorage, fixture, parametrize, Phase 2 authorization: access to a pelada comes from the caller's membership…, test_create_pelada_makes_the_user_owner() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (21): acceptInvite(), detectInviteFromUrl(), generateInvite(), getPendingInvite(), handleInviteAfterAuth(), INVITE_ROLE_OPTS, INVITE_TTL_OPTS, inviteErrorHTML() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (19): buildShareText(), confirmDraw(), copyShareText(), getTeamAuditStats(), getTeamColorKey(), openDrawSheet(), performDraw(), redraw() (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (14): client(), FakeFeedbackStorage, _payload(), fixture, parametrize, Feedback endpoint: validation and storage forwarding. Runs without a database…, test_anonymous_feedback_is_not_scoped(), test_contact_is_optional() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (15): sports, background_color, categories, description, dir, display, icons, id (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.35
Nodes (12): autoScrollCompare(), clampToTier(), COMPARE_TIERS, comparePlayerPayload(), makeChip(), moveGhost(), onChipPointerDown(), onChipPointerMove() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (8): clearUserSession(), getCurrentUser(), handleGoogleCredential(), initGoogleLogin(), logoutUser(), refreshUserSession(), renderAccountBar(), setUserSession()

### Community 17 - "Community 17"
Cohesion: 0.70
Nodes (4): authHeaders(), fetchJSON(), fetchJSONRaw(), handleSessionExpired()

## Knowledge Gaps
- **27 isolated node(s):** `feedbackList`, `usefulList`, `CATEGORY`, `INVITE_ROLE_OPTS`, `INVITE_TTL_OPTS` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `balance_teams()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `UserStorage` connect `Community 1` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Player` (e.g. with `ClientLogStorage` and `FeedbackStorage`) actually correct?**
  _`Player` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `feedbackList`, `usefulList`, `CATEGORY` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06990622335890878 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0629800307219662 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12804878048780488 - nodes in this community are weakly interconnected._