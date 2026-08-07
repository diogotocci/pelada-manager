---
trigger: always_on
---

---
trigger: always_on
description: Project development rules.
---

# Project rules

This is an existing football team balancing application.

Before making architectural or business-logic changes:

1. Consult `docs/PROJECT_CONTEXT.md`.
2. Query Graphify before exploring the repository.
3. Prefer `graphify query`, `graphify explain` and `graphify path` over broad repository searches.
4. Read only source files relevant to the current task.
5. Preserve existing player balancing and authorization rules unless explicitly asked to change them.
6. After code changes, run the relevant tests.
7. Run `graphify update .` after modifying source code.