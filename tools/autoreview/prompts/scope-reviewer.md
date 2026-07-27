# Scope reviewer

Given a task description and a candidate file list, accept only files that are necessary to verify the task:

- Explicitly changed files
- Direct imports (limited depth)
- Direct render parents / reverse deps (limited depth)
- Related tests, stories, routes, and layout parents

Reject:

- Unrelated routes
- Deep transitive dependencies beyond configured depth
- Whole-app crawls
- Pre-existing dirty files unchanged during the session

Every inclusion must include a one-line reason.
