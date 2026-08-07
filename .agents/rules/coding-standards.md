---
trigger: always_on
---

---
trigger: always_on
description: Mandatory coding, testing, language, versioning and repository standards for this project.
---

# Project coding standards

These rules are mandatory for every development task in this repository.

## Language

All communication with the user must be in Brazilian Portuguese (pt-BR).

All source code must use English for:

- variable names
- function names
- class names
- method names
- file names
- comments
- docstrings
- log messages intended for developers
- test names

Do not translate existing technical identifiers unnecessarily.

## No emojis in code

Never add emojis to:

- source code
- comments
- log messages
- exceptions
- tests
- configuration files
- scripts

Keep code and technical output professional and plain.

## Application version

Before EVERY commit that contains code changes, bump `APP_VERSION` in `app.py`.

The version bump must happen after implementation and tests are complete, but before staging the final commit.

Preserve the existing version format used by the project.

Increment the smallest/last version component unless the task explicitly requires a different versioning strategy.

Example:

APP_VERSION = "1.4.7"

becomes:

APP_VERSION = "1.4.8"

Never create a code commit without updating `APP_VERSION`.

After bumping the version, include `app.py` in the same commit.

The purpose of this version bump is to invalidate browser cache after deployments.

## Tests

Every new backend logic must include automated tests in the same task and Pull Request.

This includes:

- new business rules
- new services
- changes to existing business logic
- authorization rules
- validation logic
- team balancing logic
- calculations
- data transformations
- bug fixes involving backend behavior

Do not consider backend work complete without relevant tests.

When modifying existing behavior, update existing tests or add regression tests that demonstrate the expected behavior.

Run the relevant test suite before committing.

If tests cannot be created or executed, explicitly explain why before completing the task.

## Repository configuration

Never create `pyproject.toml`.

This project intentionally does not use `pyproject.toml` because it breaks the Vercel build.

Keep Ruff configuration in:

ruff.toml

Keep Pytest configuration in:

pytest.ini

Do not migrate these configurations into another file.

Do not introduce tooling that requires creating `pyproject.toml` without explicit user approval.

## AI attribution

Never include AI or Claude co-authorship or attribution.

Do not add:

Co-Authored-By

Do not mention Claude, Gemini, Antigravity, ChatGPT, AI assistants or generated-by-AI information in:

- Git commits
- commit trailers
- source code
- comments
- documentation
- Pull Request content
- changelogs

unless the user explicitly asks for such attribution.

Commits must appear as normal project commits authored by the configured Git user.

## Completion requirements

A development task that modifies backend code is only complete when:

1. The implementation is finished.
2. Relevant automated tests exist.
3. Relevant tests pass.
4. `graphify update .` has been executed.
5. `APP_VERSION` in `app.py` has been bumped.
6. The final diff has been reviewed.
7. Only task-related files are staged.
8. The commit follows the project's Git workflow.