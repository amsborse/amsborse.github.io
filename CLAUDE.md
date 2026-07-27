# Claude Context Policy

Canonical workflow for all coding agents: **`AGENTS.md`**.

Use Arsenal context files before reading raw source.

Priority order:

1. `.arsenal/memory/active-task.md`
2. `.arsenal/summaries/architecture.md`
3. `.arsenal/repo-map.json`
4. `.arsenal/knowledge-graph.json`
5. Relevant file summaries
6. Raw files only when required

Do not consume large token context unless the task requires it.
Prefer precise edits.
Do not rewrite whole files unless necessary.

## Scoped autoreview + memory

1. Bootstrap: `npm run agent:task -- --task "…"`
2. Read `.autoreview/reports/task-context.md` (and listed `.agent-memory` files only).
3. Implement the change.
4. Validate: `npm run review:run` (fast — default).
5. Finish: `npm run agent:finish` (refuses stale/missing reports).
6. Present evidence from `.autoreview/reports/latest.md`.

Use `review:thorough` / `review:cross-browser` only when the user explicitly requests them.
Never claim the entire site was reviewed. Never load the entire memory directory into a model.
