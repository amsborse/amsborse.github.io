# Agent & contributor guardrails

This repo uses automated gates to catch AI/agent regressions before they ship.

## Required checks (local + CI)

```bash
npm run validate        # typecheck, lint, format, unit coverage, build
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

1. **Run `npm run validate`** after every non-trivial edit.
2. **Run `npm run test:e2e`** when touching pages, routing, layout, or resume.
3. **Do not** commit `dist/`, `coverage/`, or `test-results/`.
4. **Do not** weaken thresholds in `vitest.config.ts` to make CI pass.
5. **Prefer small diffs** — one feature or fix per commit.
6. **Match existing patterns** — read surrounding code before adding abstractions.
7. **GitHub Pages** publishes `dist/` only when `npm run build` succeeds in CI.

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

## Knowledge graph (for agents)

Structured repo map lives in [`.cursor/knowledge-graph/`](.cursor/knowledge-graph/README.md):

| File                    | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `graph.json`            | Routes, pages, data files, shared components, edges |
| `AGENT_INSTRUCTIONS.md` | Exploration workflow + task entry points            |
| `SCHEMA.md`             | Node/edge types                                     |

```bash
npm run verify:kg   # validate graph vs App.tsx + filesystem
```

Update `graph.json` whenever you add routes, pages, or shared components.
