# Knowledge graph schema

Machine-readable graph: [`graph.json`](./graph.json).  
Agent workflow: [`AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md).

## Node types

| Type        | `id` prefix  | Required fields  | Purpose                                  |
| ----------- | ------------ | ---------------- | ---------------------------------------- |
| `route`     | `route:`     | `path`, `file`   | URL → page component                     |
| `page`      | `page:`      | `file`, `domain` | React page module                        |
| `component` | `component:` | `file`           | Reusable UI / canvas / layout            |
| `data`      | `data:`      | `file`           | Editable copy & config (`src/data`)      |
| `content`   | `content:`   | `file`           | Markdown articles                        |
| `util`      | `util:`      | `file`           | Pure helpers (markdown, articles loader) |
| `script`    | `script:`    | `file`           | Build / validate / CI scripts            |
| `layout`    | `layout:`    | `file`           | Shell, nav, routing helpers              |
| `domain`    | `domain:`    | `label`          | Logical grouping for navigation          |

## Edge types (`rel`)

| `rel`        | Meaning                   | Example                                               |
| ------------ | ------------------------- | ----------------------------------------------------- |
| `renders`    | Route mounts page         | `route:/about` → `page:about`                         |
| `uses`       | Page imports component    | `page:learning` → `component:LearningInteractiveCard` |
| `reads`      | Page/component loads data | `page:projects` → `data:projects`                     |
| `lazy_loads` | App.tsx dynamic import    | `entry:app` → `page:resume`                           |
| `wraps`      | Layout wraps outlet       | `layout:root` → `route:*`                             |
| `depends_on` | Runtime/build dependency  | `layout:root` → `util:loadArticles`                   |
| `documents`  | Human doc references      | `doc:agents` → `script:validate`                      |
| `part_of`    | Node belongs to domain    | `page:sliding-window` → `domain:learning`             |

## ID conventions

- Stable, lowercase, kebab-case suffix: `page:sliding-window`, `data:profile`
- One canonical node per file; routes and pages may both exist with a `renders` edge
- Do not duplicate the same file under two IDs unless it serves different roles (e.g. `route:` vs `page:`)

## When to update the graph

Update `graph.json` in the **same PR** when you:

- Add, rename, or remove a route in `src/App.tsx`
- Add a new page under `src/pages/`
- Introduce a shared component used by 2+ pages (cards, layouts, sandboxes)
- Add or move a data file in `src/data/`
- Add build/validate scripts agents rely on
- Change cross-cutting behavior (`RootLayout`, immersive routes, card system)

Run `npm run verify:kg` after edits.
