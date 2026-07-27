# Codex instructions

Read and follow [`AGENTS.md`](../AGENTS.md) before making changes.

Canonical lifecycle:

1. `npm run agent:task -- --task "<request>"`
2. Implement scoped changes
3. `npm run review:run`
4. `npm run agent:finish`

Fast mode is default. Thorough and cross-browser checks are never automatic.
