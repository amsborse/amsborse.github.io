# Agent instructions — knowledge graph

Use this repo’s knowledge graph **before** large refactors and **after** structural changes.

## Start here

1. Read [`graph.json`](./graph.json) for routes, pages, data sources, and shared components.
2. Read [`SCHEMA.md`](./SCHEMA.md) for node/edge types.
3. Read [`AGENTS.md`](../../AGENTS.md) for quality gates.

## Exploration workflow

```
Task received
    → Find domain in graph.json (e.g. domain:learning)
    → List pages + routes in that domain
    → Follow `uses` / `reads` edges to components + data files
    → Edit data first (src/data), then pages, then shared components
    → Update graph.json if structure changed
    → npm run verify:kg && npm run validate
```

## Common tasks → graph entry points

| Task                            | Start nodes                                                       | Also read                                                              |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Change hero / SEO / footer copy | `data:profile`, `data:home`, `data:socials`                       | `page:home`, `component:seo`                                           |
| Add nav link                    | `data:navigation`, `route:*`                                      | `src/App.tsx`, `layout:navbar`                                         |
| New portfolio project card      | `data:projects`, `page:projects`                                  | `component:interactive-card`                                           |
| New learning hub card           | `data:algorithmCategories` or inline topic arrays                 | `component:learning-hub-layout`, `component:learning-interactive-card` |
| New coding pattern sandbox      | `data:coding-pattern-topics`, `route:/learning/coding-patterns/*` | `page:sliding-window` as reference                                     |
| New system design sandbox       | `page:system-design-concepts`, concept pages                      | `component:learning-sandbox-layout`                                    |
| New article                     | `data:articles`, `content:*`, `util:load-articles`                | `page:writing`, `page:article`                                         |
| Resume / interactive CV         | `page:resume`, `data:resume`                                      | `scripts/compile-resume.mjs`                                           |
| Performance / bundle            | `script:check-bundle-size`, `entry:vite-config`                   | `layout:root`, `layout:immersive-routes`                               |
| 3D / particles                  | `page:aether-lab`, `component:interactive-particles`              | `component:god-sphere` (do not remove)                                 |

## Editing rules

### Data vs UI

- **Copy & lists** → `src/data/*.ts` or `src/content/articles/*.md`
- **Layout & interaction** → `src/pages/*`, `src/components/*`
- **Global shell** → `src/layout/*`, `src/styles/index.css`

### Shared card system

Most hub pages use:

- `component:interactive-card` — shell, grid constants (`HUB_CARD_GRID`, `HUB_PAGE_CONTAINER`)
- `component:learning-interactive-card` — learning-specific wrapper
- `component:learning-hub-layout` — shared learning page chrome

Default card density is **`quad`** (4 columns on `lg`). Changing defaults affects all hub pages.

### Routing

- Register every new page in `src/App.tsx` (lazy import + `<Route>`).
- Sync `data:navigation` if the page should appear in the navbar.
- Add a `route:` and `page:` node; connect with `renders`.
- Algorithm visualizer lives at **`/algorithm`** (singular), not `/algorithms`.

### Immersive / perf routes

Only **`/aether-lab`** disables Lenis, particles, and footer via `layout:immersive-routes`.  
Learning sandboxes (including sliding window) are **scrollable** normal pages.

## Updating the graph

When you change structure:

1. Add/update/remove nodes in `graph.json`.
2. Add/update edges (`uses`, `reads`, `renders`, `lazy_loads`, `part_of`).
3. Bump `meta.lastUpdated`.
4. Run:

```bash
npm run verify:kg
npm run validate
```

## Validation failures

| Error                            | Fix                                                     |
| -------------------------------- | ------------------------------------------------------- |
| Missing file                     | Create the file or fix the path in `graph.json`         |
| Route in App.tsx not in graph    | Add `route:` node + `renders` edge                      |
| Graph route missing from App.tsx | Remove stale node or restore route                      |
| Orphan `page:` node              | Add route or mark `status: "internal"` in node metadata |

## Do not

- Treat `graph.json` as generated — keep it accurate by hand (or extend `verify-knowledge-graph.mjs` later).
- Document every component — only **shared** or **architecturally important** ones.
- Skip graph updates when adding routes (future agents will get lost).

## Optional: visual map

See the domain diagram in [`README.md`](./README.md).
