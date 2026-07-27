# Repository knowledge graph

Structured map of routes, pages, data, shared components, and tooling for AI agents and contributors.

**Also see:** [`.arsenal/knowledge-graph.json`](../.arsenal/knowledge-graph.json) — auto-generated full repo graph from the Arsenal context engine (410+ nodes). Use `.cursor/knowledge-graph/` for curated task routing; use `.arsenal/` for deep exploration and summaries.

| File                                               | Purpose                                    |
| -------------------------------------------------- | ------------------------------------------ |
| [`graph.json`](./graph.json)                       | Canonical nodes + edges (edit this)        |
| [`SCHEMA.md`](./SCHEMA.md)                         | Node/edge types and ID rules               |
| [`AGENT_INSTRUCTIONS.md`](./AGENT_INSTRUCTIONS.md) | How agents should use and update the graph |

```bash
npm run verify:kg        # validate graph vs filesystem + App.tsx routes
npm run verify:arsenal   # validate .arsenal/ context workspace
```

## Domain map

```mermaid
flowchart TB
  subgraph core [Core]
    Home["/"]
    About["/about"]
    Contact["/contact"]
  end

  subgraph portfolio [Portfolio]
    Projects["/projects"]
    Experience["/experience"]
  end

  subgraph writing [Writing]
    Writing["/writing"]
    Article["/writing/:slug"]
  end

  subgraph resume [Resume]
    Resume["/resume"]
  end

  subgraph learning [Learning Lab]
    Learning["/learning"]
    Patterns["/learning/coding-patterns"]
    Sliding["/learning/.../sliding-window"]
    AlgoHub["/learning/algorithm"]
    SysDesign["/learning/system-design-concepts"]
    Algorithms["/algorithm"]
  end

  subgraph visual [Arsenal]
    Arsenal["/arsenal"]
    Celestial["/arsenal/celestial-grid"]
    Particle["/arsenal/particle-core"]
    Anomaly["/arsenal/anomaly-matrix"]
    Gravity["/arsenal/gravity-well"]
    Quantum["/arsenal/quantum-mesh"]
  end

  RootLayout --> core
  RootLayout --> portfolio
  RootLayout --> writing
  RootLayout --> resume
  RootLayout --> learning
  RootLayout --> visual

  Learning --> Patterns
  Patterns --> Sliding
  Learning --> AlgoHub
  Learning --> SysDesign
  Arsenal --> Celestial
  Arsenal --> Particle
  Arsenal --> Anomaly
  Arsenal --> Gravity
  Arsenal --> Quantum
```

## Layer stack

```mermaid
flowchart BT
  Data["src/data/*.ts"]
  Content["src/content/articles/*.md"]
  Utils["src/utils/*"]
  Components["src/components/*"]
  Pages["src/pages/*"]
  App["src/App.tsx"]
  Shell["RootLayout + Navbar + Footer"]

  Data --> Pages
  Content --> Utils
  Utils --> Pages
  Components --> Pages
  Pages --> App
  App --> Shell
```

## Quick pointers

- **Edit copy** → start at `data:*` nodes in `graph.json`
- **New page** → `App.tsx` + `graph.json` route node + optional `data:navigation`
- **Hub cards** → `component:interactive-card` (quad density, 4-col grid)
- **Quality gates** → `AGENTS.md`, `script:validate`
