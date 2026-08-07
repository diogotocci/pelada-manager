---
trigger: always_on
---

## Before committing

After implementation is complete:

1. Run the relevant automated tests.

2. For any new or modified backend logic, verify that corresponding tests were
   added or updated.

3. Update the Graphify knowledge graph:

   graphify update .

4. Bump `APP_VERSION` in `app.py`.

   Preserve the existing version format and increment the last version component.

5. Review all changes:

   git diff

6. Review repository status:

   git status

7. Verify that:
   - all changes belong to the current task
   - relevant tests are included
   - APP_VERSION was bumped
   - no pyproject.toml was introduced
   - no AI attribution or Co-Authored-By metadata was introduced

8. Stage only files intentionally related to the task.

Prefer:

git add <file1> <file2> <file3>

Do not automatically use:

git add .
git add -A

unless every changed file has been reviewed and confirmed to belong to the task.