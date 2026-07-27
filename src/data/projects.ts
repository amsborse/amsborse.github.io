/**
 * EDIT HERE: Project portfolio — categories and project cards.
 * Set `featured: true` on up to a few items to show on the home page.
 */

import type { Project, ProjectCategoryDef } from "./types";

export const projectCategories: ProjectCategoryDef[] = [
  { id: "systems", label: "Systems" },
  { id: "product", label: "Product" },
  { id: "ai", label: "AI / ML" },
  { id: "tooling", label: "Tooling" },
];

export const projects: Project[] = [
  {
    id: "leetdesign",
    title: "LeetDesign",
    featured: true,
    category: "systems",
    summary:
      "Interactive system-design simulator for modeling scalability, fault tolerance, and architectural trade-offs through executable service and workload models.",
    problem:
      "System design concepts are hard to internalize from static diagrams alone; engineers need hands-on models of load, failure, and scaling behavior.",
    stack: ["TypeScript", "React", "Node.js", "Kafka", "Redis", "Neo4j", "WebSockets"],
    impact:
      "Turns abstract design patterns into runnable simulations teams can stress-test before production.",
    links: [{ label: "GitHub", href: "https://github.com/amsborse" }],
  },
  {
    id: "financeos",
    title: "FinanceOS",
    featured: true,
    category: "ai",
    summary:
      "AI-powered financial intelligence platform combining deterministic processing with LLM-assisted reasoning for explainable insights and recommendations.",
    problem:
      "Personal finance tools often hide their logic or over-trust opaque models; users need transparent, actionable guidance.",
    stack: ["TypeScript", "React", "Node.js", "LLM APIs", "Progressive Web App"],
    impact:
      "Transforms raw transactions into explainable insights with a hybrid deterministic + LLM pipeline.",
    links: [{ label: "GitHub", href: "https://github.com/amsborse" }],
  },
  {
    id: "orbit",
    title: "Orbit",
    featured: true,
    category: "product",
    summary:
      "Offline-first life-management platform for organizing tasks, habits, recurring routines, and workload insights.",
    problem:
      "Productivity apps break down without connectivity and rarely surface meaningful patterns across habits and workload.",
    stack: ["TypeScript", "React", "Offline-First Architecture", "PWA", "Vitest", "Playwright"],
    impact:
      "Delivers reliable task and habit tracking with sync when online and actionable workload insights.",
    links: [{ label: "GitHub", href: "https://github.com/amsborse" }],
  },
  {
    id: "arsenal-tooling",
    title: "Arsenal",
    featured: true,
    category: "tooling",
    summary:
      "Developer-tooling platform for project scaffolding, workflow automation, and context-efficient coding workflows.",
    problem:
      "Repeated setup, validation, and context assembly slow down every new service and experiment.",
    stack: ["TypeScript", "Node.js", "Monorepo", "CLI", "Workflow Automation"],
    impact:
      "Standardizes scaffolding and agent context so new projects start with structure, not boilerplate hunting.",
    links: [{ label: "GitHub", href: "https://github.com/amsborse" }],
  },
  {
    id: "ad-infinitum",
    title: "Ad-infinitum",
    featured: true,
    category: "systems",
    summary:
      "Linux filesystem research exploring F2FS garbage-collection policies through kernel instrumentation, benchmarking, and latency optimization.",
    problem:
      "Flash-friendly filesystems trade write amplification against read latency; GC policy choices need empirical validation.",
    stack: ["C", "Linux Kernel", "F2FS", "Benchmarking", "Performance Analysis"],
    impact:
      "Characterized GC behavior under realistic workloads to inform latency and wear trade-offs.",
    links: [{ label: "GitHub", href: "https://github.com/amsborse" }],
  },
];
