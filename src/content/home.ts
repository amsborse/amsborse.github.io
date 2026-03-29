/**
 * Homepage-only copy: positioning paragraph, section intros, and highlight stats.
 */
export const home = {
  /** Credibility column — long positioning paragraph. */
  credibility: `I build and operate backend systems with an emphasis on reliability, clear APIs, and honest tradeoffs. Writing is part of my practice—clarity for teammates today, and a record worth revisiting later.`,
  sectionEngineering:
    "Representative work across systems, internal platforms, and product-minded experiments.",
  sectionWriting:
    "Long-form notes on reliability, API design, and how strong teams ship under real constraints.",
  highlights: {
    yearsExperience: "10+",
    focusAreas: [
      "Distributed systems & APIs",
      "Data pipelines & observability",
      "Product-minded backend design",
    ],
    currentInterests: [
      "Reliability engineering",
      "Developer experience",
      "Long-form technical writing",
    ],
  },
} as const;
