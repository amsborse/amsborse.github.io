import type { Project, ProjectCategoryDef } from "./types";

export const projectCategories: ProjectCategoryDef[] = [
  { id: "systems", label: "Systems" },
  { id: "product", label: "Product" },
  { id: "ai", label: "AI / ML" },
  { id: "tooling", label: "Tooling" },
];

/** Projects — featured items surface on the home page. */
export const projects: Project[] = [
  {
    id: "finance-spend-analyzer",
    name: "Finance Spend Analyzer (placeholder)",
    featured: true,
    category: "product",
    summary:
      "A personal finance tool that surfaces spending patterns and anomalies without storing sensitive credentials server-side.",
    problem:
      "Users needed clarity on discretionary spend and recurring charges without trusting opaque third-party aggregators.",
    stack: ["TypeScript", "Node.js", "PostgreSQL", "React"],
    impact:
      "Prototype validated with a small user group; informed a clearer data model for categorization and alerts.",
    links: [
      { label: "GitHub", href: "https://github.com/amsborse" },
      { label: "Demo", href: "#" },
    ],
  },
  {
    id: "ai-experiments",
    name: "AI Product Experiments (placeholder)",
    featured: true,
    category: "ai",
    summary:
      "A set of small experiments exploring retrieval, evaluation, and guardrails for domain-specific assistants.",
    problem:
      "Generic chat UX fails for specialized workflows; needed a disciplined loop for prompts, evals, and failure modes.",
    stack: ["Python", "OpenAI API", "Vector store", "FastAPI"],
    impact:
      "Established a lightweight eval checklist reused across experiments; reduced hallucination incidents in test scenarios.",
    links: [{ label: "Case study", href: "#" }],
  },
  {
    id: "distributed-job-runner",
    name: "Distributed Job Runner (placeholder)",
    featured: true,
    category: "systems",
    summary:
      "Internal-style service for enqueueing, retrying, and observing long-running background jobs across workers.",
    problem:
      "Cron sprawl and opaque failures made operational work painful; needed backpressure and visibility.",
    stack: ["Go", "Redis", "gRPC", "Prometheus"],
    impact:
      "Cut mean time to detect stuck jobs; standardized retry semantics across teams (placeholder narrative).",
    links: [{ label: "GitHub", href: "https://github.com/amsborse" }],
  },
  {
    id: "api-design-kit",
    name: "API Design Kit (placeholder)",
    featured: false,
    category: "tooling",
    summary:
      "Opinionated templates and checklists for versioning, errors, and pagination on public HTTP APIs.",
    problem: "Inconsistent API patterns slowed client integration and increased support load.",
    stack: ["Markdown", "OpenAPI", "Node.js"],
    impact:
      "Adopted as a reference for two internal services; shortened API review cycles (placeholder).",
    links: [{ label: "Docs", href: "#" }],
  },
];
