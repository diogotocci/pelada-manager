---
trigger: always_on
description: Mandatory Git workflow for all development tasks in this project.
---

# Git Workflow

All development tasks in this repository must follow this Git workflow.

The standard lifecycle is:

main
→ pull latest changes from origin
→ create a dedicated task branch
→ develop
→ test
→ update Graphify
→ review changes
→ commit
→ push task branch
→ user creates Pull Request
→ user reviews and merges Pull Request into main

The agent must never merge a task branch into `main`.

The user is responsible for creating, reviewing and merging Pull Requests.

# Starting a New Task

Every NEW development task must start from the latest remote `main`.

Before modifying any code, run:

git status --short

Then check the current branch:

git branch --show-current

## Uncommitted Changes

If there are existing modified, staged or untracked files, inspect them before continuing.

Never automatically:

git reset --hard
git clean -fd
git checkout -- .
git restore .
git stash

Do not discard, overwrite, stash or commit unrelated user changes.

If existing changes cannot be clearly identified as belonging to the current task, stop and ask the user how to proceed.

## Return to Main

If the working tree is safe to continue, switch to `main`:

git switch main

Then update it from GitHub:

git pull origin main

The pull must complete successfully before creating a new task branch.

Never create a new development branch from another feature, fix, refactor, chore or test branch.

Every new task must branch from the latest `main`.

# Creating the Task Branch

Create exactly one dedicated branch for each development task.

Use these prefixes:

feature/
fix/
refactor/
chore/
test/

Use short, descriptive kebab-case names.

Examples:

feature/player-speed-attribute
feature/player-preferred-position
fix/team-balancing-rating
fix/admin-permissions
refactor/team-generator
chore/update-agent-rules
test/team-balancing-coverage

Create the branch using:

git switch -c <branch-name>

Example:

git switch -c feature/player-speed-attribute

# Continuing an Existing Task

If the user is continuing work that already belongs to the current task branch, continue using the same branch.

Do not create a new branch for small adjustments, fixes or additions that are clearly part of the same task.

Example:

Initial request:

Add the player's preferred position.

Branch:

feature/player-preferred-position

Follow-up request:

Also show the preferred position on the player edit page.

Continue using:

feature/player-preferred-position

Do not return to `main` and do not create another branch.

A new branch should only be created when the user starts a genuinely new development task.

# During Development

Make only changes related to the current task.

Preserve unrelated code and user changes.

Follow the project architecture and coding standards.

Use Graphify to understand the affected code before performing broad repository searches.

Do not make unrelated refactors unless explicitly requested or strictly necessary for the task.

# Tests

Before considering implementation complete, run the relevant automated tests.

Backend business logic changes must include corresponding tests as required by the project coding standards.

If the full test suite is appropriate, run it.

Example:

pytest

When a smaller targeted test suite is sufficient, run the relevant tests instead.

Do not commit code with known failing tests unless the user explicitly approves it.

If tests cannot be executed, clearly report the reason.

# Update Graphify

After source code changes are complete, update the Graphify knowledge graph:

graphify update .

This must happen before the final commit whenever source code was modified.

# Application Version

Before committing code changes, follow the application versioning rules defined in the project coding standards.

If the task requires an `APP_VERSION` bump in `app.py`, perform it before staging the final commit.

Configuration-only changes that do not modify application code should follow the rules defined in `coding-standards.md`.

# Review Before Commit

Before staging the final changes, run:

git status

Then review unstaged changes:

git diff

Inspect all modified and untracked files.

Verify that:

1. Every changed file belongs to the current task.
2. Relevant tests were added or updated.
3. Relevant tests passed.
4. Graphify was updated when source code changed.
5. APP_VERSION was updated when required.
6. No `pyproject.toml` was introduced.
7. No unrelated files were modified.
8. No AI attribution was introduced.
9. No `Co-Authored-By` trailer was introduced.

# Staging Files

Stage only files intentionally related to the current task.

Prefer explicit file staging:

git add <file1>
git add <file2>
git add <file3>

Avoid automatically using:

git add .
git add -A

These commands may only be used if every changed and untracked file has already been reviewed and confirmed to belong to the current task.

After staging, run:

git status

Then review exactly what will be committed:

git diff --cached

Do not commit until the staged changes have been reviewed.

# Commit

Every completed development task must have at least one commit.

Use concise Conventional Commit messages.

Examples:

feat: add player speed attribute
feat: add player preferred position
fix: improve team rating balance
fix: correct admin permissions
refactor: simplify team generator
test: add balancing algorithm coverage
chore: update agent rules

Never include:

Co-Authored-By

Never include references to:

Claude
Gemini
Antigravity
ChatGPT
AI assistants
AI-generated code

The commit must use the configured Git user as the sole author.

Create the commit using:

git commit -m "<commit-message>"

# Push

After the commit succeeds, push the task branch to GitHub.

For the first push of a new branch:

git push -u origin <branch-name>

Example:

git push -u origin feature/player-speed-attribute

For subsequent commits on the same branch:

git push

Pushing the completed task branch is part of the normal workflow and does not require the user to explicitly request it.

Never push directly to `main`.

# Pull Request

After pushing the branch, stop the Git workflow.

Do not automatically create a Pull Request.

Do not merge the branch into `main`.

Do not switch back to `main` as part of completing the current task.

The user will:

1. Create the Pull Request.
2. Review the Pull Request.
3. Merge the Pull Request into `main`.

After pushing, report that the branch is ready for the user to create the Pull Request.

# Starting the Next Task

When the user starts a NEW task, begin the Git lifecycle again.

First inspect the repository:

git status --short

Then switch to:

git switch main

Update local `main` from GitHub:

git pull origin main

Only after the pull succeeds, create the new task branch:

git switch -c <new-branch-name>

Never assume that the previous task branch has already been merged.

The remote `main` is the source of truth for new task branches.

If the previous Pull Request has not yet been merged, the new branch must still be based on the current remote `main`, unless the user explicitly states that the new task depends on the previous unmerged branch.

# Final Report

After completing, committing and pushing a task, report:

1. Branch name
2. Commit hash
3. Commit message
4. Remote branch pushed
5. Tests executed and results
6. Graphify update status
7. APP_VERSION change, when applicable
8. Files changed

Finish by clearly stating that the branch has been pushed and is ready for the user to create the Pull Request.