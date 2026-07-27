# Agent & contributor guardrails

This file is the **canonical workflow for every coding agent** (Cursor, Codex, Claude Code, Antigravity, and others).

## Universal implementation lifecycle

Every implementation task follows this lifecycle:

1. **Start a task session** — `npm run agent:task -- --task "<user request>"`
2. **Read relevant repository memory** — use `.autoreview/reports/task-context.md` and listed `.agent-memory` files only (`npm run agent:context`)
3. **Inspect only the necessary code**
4. **Implement the requested change**
5. **Run fast scoped validation** — `npm run review:run`
6. **Fix critical and high-confidence issues**; re-run only invalidated checks
7. **Generate the task completion report** (written by `review:run` to `.autoreview/reports/latest.md`)
8. **Finish** — `npm run agent:finish` (fails if the report is missing/stale or gates failed)
9. **Present a concise evidence-based final response**
10. **Never claim that the entire website was tested**

### Required commands

```bash
npm run agent:task -- --task "<user request>"
npm run review:run
npm run agent:finish
```

### Hard rules

- **Fast mode is the default** (`npm run review:run` ≡ `--mode fast`).
- **Thorough mode is never automatic** (`npm run review:thorough` only when explicitly requested).
- **Cross-browser testing is never automatic** (`npm run review:cross-browser` only when explicitly requested).
- Only files changed during the current task (and directly affected surfaces) are reviewed.
- Existing unrelated dirty files must remain excluded unless modified again during the task.
- Relevant `.agent-memory` must be loaded before UI implementation.
- Final responses must include: what changed, what was tested, what was skipped, remaining risks, and the report path.
- Agents must not answer only “done,” “implemented,” or “tests pass.”
- Agents must not hide skipped checks or unresolved findings.
- `agent:finish` refuses completion when verification is stale or quality gates fail.

### Final response template

```
Implemented:
* …

Verified:
* …

Skipped:
* …

Remaining:
* …

Report:
`.autoreview/reports/latest.md`

Final status:
Passed | Passed with warnings | Failed | Budget exhausted | Needs user visual approval
```

Exact completion wording: **Verification completed for the current task scope.**

---

## Required checks (local + CI)

```bash
npm run validate        # verify:kg, verify:arsenal, typecheck, lint, format, coverage, build
npm run test:e2e        # Playwright smoke + interaction tests
```

## Pre-commit / pre-push hooks (Husky)

| Hook           | Runs                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **pre-commit** | Prettier + ESLint on staged files, `typecheck`, unit tests with **99% coverage** on `src/utils/frontmatter.ts` and `src/utils/markdown.ts` |
| **pre-push**   | Full `validate` + Playwright e2e                                                                                                           |

Bypass hooks only when you fully understand the risk: `git commit --no-verify`.

## Coverage policy (99% ruleset)

Unit coverage thresholds are **99%** (lines, functions, statements) and **90%** (branches) for:

- `src/utils/frontmatter.ts`
- `src/utils/markdown.ts`

E2E tests cover routes, navigation, and key interactions. Together they reduce—but cannot eliminate—UI regressions.

## Safe change checklist for agents

1. **Bootstrap** with `npm run agent:task -- --task "…"`.
2. **Read task context** / scoped `.agent-memory` (`npm run agent:context`).
3. **Implement** only the requested change.
4. **Validate** with `npm run review:run` — see [tools/autoreview/README.md](tools/autoreview/README.md). Do **not** run thorough/cross-browser unless asked.
5. **Finish** with `npm run agent:finish` and cite `.autoreview/reports/latest.md`.
6. **Capture user corrections** with `npm run memory:add` after verified fixes / approvals.
7. **Run `npm run validate`** after every non-trivial edit (especially before push).
8. **Run `npm run test:e2e`** when touching pages, routing, layout, or resume.
9. **Do not** commit `dist/`, `coverage/`, `test-results/`, `.autoreview/cache|screenshots|sessions|traces`, or `.agent-memory/feedback/raw`.
10. **Do not** weaken thresholds in `vitest.config.ts` to make CI pass.
11. **Prefer small diffs** — one feature or fix per commit.
12. **Match existing patterns** — read surrounding code before adding abstractions.
13. **GitHub Pages** publishes `dist/` only when `npm run build` succeeds in CI.
14. Never claim the entire application was verified by autoreview — only the current task scope.
15. Never load the entire design-memory directory into a model call.

## Modern techniques that help (2025–2026)

| Technique                                           | What it does                                               |
| --------------------------------------------------- | ---------------------------------------------------------- |
| **Pre-commit quality gates** (this repo)            | Blocks bad formatting, types, and tests before commit      |
| **CI on every push/PR**                             | Catches what hooks miss; required for deploy               |
| **E2E smoke tests** (Playwright)                    | Verifies real pages load after agent refactors             |
| **High coverage on pure utils**                     | Cheap, fast tests on parsing/data logic agents often break |
| **Branch protection** (GitHub Settings)             | Require CI green before merge to `master`                  |
| **CODEOWNERS**                                      | Forces human review on sensitive paths                     |
| **Deploy only from CI artifacts**                   | Never serve raw `src/` (already configured)                |
| **Cursor/IDE rules** (`.cursor/rules`, `AGENTS.md`) | Steer agents toward repo conventions                       |
| **Lockfile + `npm ci`**                             | Reproducible installs in CI                                |
| **Optional: AI PR bots** (Bugbot, CodeRabbit)       | Extra review layer on agent PRs                            |

Enable **branch protection** on `master`: see [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md). Required checks: `Quality gate`, `Playwright e2e`.

**CODEOWNERS** (`.github/CODEOWNERS`) requests review on CI, dependencies, routing, and resume. **Dependabot** opens weekly npm/GitHub Actions PRs.

## Knowledge layers (for agents)

This repo uses **two complementary** knowledge systems:

### 1. Arsenal context engine (`.arsenal/`)

Auto-indexed repo intelligence from [Arsenal](../Arsenal/docs/using-arsenal-in-any-repo.md). Prefer this for exploration and token-efficient context.

| Path                             | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `.arsenal/knowledge-graph.json`  | Full dependency + symbol graph (410+ nodes) |
| `.arsenal/repo-map.json`         | File index with hashes                      |
| `.arsenal/summaries/files/`      | Per-file summaries                          |
| `.arsenal/memory/active-task.md` | Current task / handoff                      |
| `.arsenal/rules/`                | Agent rules templates                       |

```bash
npm run verify:arsenal      # validate committed .arsenal structure
npm run context:refresh     # regenerate index + summaries + graph (local, needs Arsenal CLI)
npm run context:doctor      # health check via Arsenal CLI
```

Before editing: read `.arsenal/memory/active-task.md`, relevant summaries, then open source files only as needed.

### 2. Curated Cursor graph (`.cursor/knowledge-graph/`)

Hand-maintained map for routes, data entry points, and task routing:

| File                    | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `graph.json`            | Routes, pages, data files, shared components, edges |
| `AGENT_INSTRUCTIONS.md` | Exploration workflow + task entry points            |
| `SCHEMA.md`             | Node/edge types                                     |

```bash
npm run verify:kg   # validate graph vs App.tsx + filesystem
```

Update `graph.json` whenever you add routes, pages, or shared components. After large refactors, also run `npm run context:refresh`.

### 3. Repository design memory (`.agent-memory/`)

Scoped design lessons for UI work. Loaded automatically by `agent:task` / `review:run`. Do not load the entire directory into a model.
