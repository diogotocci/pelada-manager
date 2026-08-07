---
trigger: always_on
---

---
trigger: always_on
description: Git workflow rules for all development tasks.
---

# Git workflow

Every new development task must start from the latest version of the remote `main` branch.

Each task must use its own dedicated Git branch.

The normal workflow is:

main
→ update main from origin
→ create task branch
→ develop
→ test
→ update Graphify
→ commit
→ push branch
→ user creates Pull Request
→ user merges Pull Request into main

The agent must NEVER merge the task branch into `main`.

The user is responsible for creating and merging the Pull Request.

## Starting a new task

Before making any code changes:

1. Run:

   git status --short

2. Check the current branch:

   git branch --show-current

3. Check for uncommitted changes.

If unrelated uncommitted changes exist:

DO NOT:

- discard them
- reset them
- stash them
- commit them
- overwrite them

Stop and ask the user how to proceed.

If the working tree is clean, start the new task from `main`.

Run:

git checkout main

Then update the local main branch:

git pull origin main

Only after the pull completes successfully should a new task branch be created.

## Creating the task branch

Create exactly one branch for the current development task.

Use one of these prefixes:

feature/
fix/
refactor/
chore/
test/

Use short kebab-case names.

Examples:

feature/player-speed-attribute
feature/player-statistics
fix/team-balancing-rating
fix/admin-permissions
refactor/team-generator
chore/update-dependencies

Create the branch from the updated `main`:

git checkout -b <branch-name>

Never create a new development branch from another feature or fix branch.

Every new task must branch from the latest local `main` after:

git checkout main
git pull origin main

## Continuing the same task

If the current conversation is continuing work that already belongs to an existing dedicated task branch, continue using that branch.

Do not return to main and create another branch for small follow-up changes that are part of the same task.

Examples of the same task:

User:
"Add player speed attribute."

Branch:

feature/player-speed-attribute

Later the user says:

"Also show speed on the player edit page."

Continue using:

feature/player-speed-attribute

Do not create another branch.

## During development

Make only changes related to the current task.

Preserve unrelated user changes.

Do not use destructive Git commands such as:

git reset --hard
git clean -fd
git checkout -- .
git restore .

unless the user explicitly requests them.

## Before committing

After implementation is complete:

1. Run the relevant tests.
2. Run:

   graphify update .

3. Review the changes:

   git diff

4. Review repository status:

   git status

5. Verify that no unrelated files were modified.

Stage only files intentionally related to the task.

Prefer:

git add <file1> <file2> <file3>

Do not automatically use:

git add .
git add -A

unless all changed files were verified to belong to the current task.

## Commit

Every completed development task must have at least one commit.

Use Conventional Commit style messages.

Examples:

feat: add player speed attribute
feat: add player statistics
fix: improve team rating balance
fix: correct admin permissions
refactor: simplify team generator
test: add balancing algorithm coverage
chore: update project configuration

Commit the staged changes:

git commit -m "<commit-message>"

## Push

After the commit succeeds, push the task branch to GitHub.

For the first push of the branch:

git push -u origin <branch-name>

For subsequent commits on the same branch:

git push

The agent should automatically push completed task commits to the remote task branch.

## Pull Request

Do NOT create or merge a Pull Request unless the user explicitly asks.

Do NOT merge the task branch into `main`.

After the branch has been pushed, report that it is ready for the user to create the Pull Request.

The user will:

1. Create the Pull Request.
2. Review it.
3. Merge it into `main`.

## Starting the next task

When the user starts a NEW task, do not continue working from the previous task branch.

Return to main:

git checkout main

Update main from GitHub:

git pull origin main

Then create a new branch from the updated main:

git checkout -b <new-task-branch>

This cycle must repeat for every new development task.

## Final report

After completing and pushing a task, report:

- branch name
- commit hash
- commit message
- remote branch pushed
- tests executed
- Graphify update status
- files changed

Finish with a clear message that the branch is ready for the user to create the Pull Request.