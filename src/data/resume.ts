/**
 * EDIT HERE: Résumé summary page — skills, achievements, focus areas.
 * Set `downloadUrl` to a PDF path (e.g. `/resume.pdf` in `public/`) or a full URL; leave empty to hide the download button.
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

  /** Example: `/resume.pdf` (file in `public/`) or `https://...` */
  downloadUrl: "",
  downloadLabel: "Download PDF",
};
