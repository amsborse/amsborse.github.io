/**
 * Résumé / career snapshot — skills, achievements, and focus areas.
 */
export const resume = {
  executiveSummary:
    "Backend-focused engineer with a track record of shipping reliable systems, tightening observability, and partnering with product on pragmatic tradeoffs. I write to clarify thinking and raise the bar for how teams build.",
  skills: {
    languages: ["TypeScript", "Go", "Python", "SQL"],
    systems: ["Distributed systems", "REST / gRPC", "PostgreSQL", "Redis", "Kafka (conceptual)"],
    practices: ["SLOs & incident response", "Code review", "Technical writing", "Mentoring"],
  },
  achievements: [
    "Owned critical paths for billing and metering at scale (placeholder).",
    "Drove cross-team reliability improvements via tracing and actionable dashboards (placeholder).",
    "Published technical essays on systems thinking and API design (see Writing).",
  ],
  focusAreas: [
    "Reliable backends under real-world load",
    "Developer experience adjacent to infrastructure",
    "Clear communication across engineering and product",
  ],
} as const;
