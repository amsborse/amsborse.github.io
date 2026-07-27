# Local scoped autoreview (`tools/autoreview`)

Repository-embedded verification for coding agents. Reviews **only** files changed during the current task session. It does **not** publish a package and does **not** depend on Arsenal.

Paired with **`.agent-memory/`** for repository-local design feedback lessons (no model fine-tuning).

Advanced Playwright visual quality (geometry, typography, decorative lines, z-index, state matrix, timing, animation instrumentation, CLS, baselines, flake control) runs **only** for UI-affecting scoped changes.

## Quick start

```bash
# 1. Before implementing
npm run agent:task -- --task "Improve component showcase cards"

# 2. Make your changes

# 3. Calculate scope / run review (loads scoped memory automatically)
npm run review:scope
npm run review:run   # always fast unless --mode thorough

# 4. Finish only when review is fresh and gates pass
npm run agent:finish

# 5. Capture user corrections after verified fixes / approvals
npm run memory:add -- --feedback "Badge overlaps title on mobile" --component FeatureCard --route /components --verified
```

## Scripts

| Script                       | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `agent:task`                 | Bootstrap session + memory context (`current-task.json`, `task-context.md`) |
| `agent:context`              | Print task context / stale status                                           |
| `agent:finish`               | Complete session only if review is fresh and gates pass                     |
| `review:start`               | Start task session (lower-level)                                            |
| `review:status`              | Show session status                                                         |
| `review:scope`               | Write `.autoreview/reports/current-scope.json`                              |
| `review:run` / `review:fast` | **Default** — fast mode (Chromium, task scope)                              |
| `review:thorough`            | Thorough budgets/browsers — **explicit only**                               |
| `review:visual`              | Chromium layout / geometry / critic                                         |
| `review:animation`           | Changed motion only                                                         |
| `review:accessibility`       | Scoped a11y                                                                 |
| `review:responsive`          | Responsive widths                                                           |
| `review:cross-browser`       | Chromium + Firefox + WebKit — **explicit only**                             |
| `review:baseline`            | Baseline diffs for changed surfaces                                         |
| `review:report`              | Regenerate `latest.md` from `latest.json` (no rerun)                        |
| `review:finish`              | Mark session finished (does not check staleness)                            |
| `review:test`                | Unit tests for autoreview                                                   |

Fast mode never auto-escalates to thorough or cross-browser. High-risk changes may be **recommended** in the Task Completion Report only.

## Task isolation

When a session exists, only files created/modified **after** `review:start` are included. Pre-existing dirty files with unchanged hashes are excluded.

Without a session, scope falls back to: explicit `--file` → git dirty → branch diff → commit diff, and the report warns that isolation is less precise.

## GitHub Pages

Configured for this user site (`basePath: "/"` on port `1111`). Project-site deploys can set `app.basePath` / `VITE_BASE` in `autoreview.config.ts`. Browser URLs honor base path and optional HashRouter.

## Deterministic-only / CI

- Local default runs deterministic checks + related tests + scoped Playwright visits.
- AI critic is optional (`ai.enabled` or `AUTOREVIEW_AI`); not required.
- PR workflow uses deterministic mode and skips external AI unless secrets are present.
- Set `AUTOREVIEW_SKIP_BROWSER=1` to skip browser automation.

## Budgets (fast defaults)

- ≤20 changed source files, ≤2 routes, ≤6 screenshots, ≤5 interactions, ≤1 AI call, ≤2 repair iterations

Exceeding a budget records exclusions — limits are never silently exceeded.

## Reports

- `.autoreview/reports/latest.json`
- `.autoreview/reports/latest.md`

Mandatory wording: **“Verification completed for the current task scope.”**

Never claim the entire application was verified.

## Visual baselines

```bash
npm run review:baseline:approve -- --screenshot path.png --component X --route /path
npm run review:baseline:list
npm run review:baseline:diff -- --screenshot path.png --route /path
npm run review:baseline:remove -- --id <baseline-id>
```

Fast mode projects: `chromium-desktop`, `chromium-mobile`.  
Thorough also: `webkit-desktop`, `firefox-desktop`, `reduced-motion`.

## Limitations

- Auto-repairs are planned conservatively; agents usually apply fixes themselves.
- Browser review requires Playwright browsers (`npx playwright install`). Thorough needs webkit/firefox too.
- Animation timing is browser-run evidence, not exact real-device FPS.
- Full-site crawls remain intentionally out of scope.
