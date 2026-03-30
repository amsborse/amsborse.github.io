/**
 * EDIT HERE: Homepage-only copy — credibility column, section intros, stats, and hero quick links.
 * Tagline emphasis: each string must appear inside `profile.subheadline`.
 */

export const home = {
  taglineHighlights: ["reliable backends", "after deploy"] as const,

  /** One line under “Credibility”—warmth without losing rigor. */
  credibilityLead:
    "Proof accumulates in production: shipping, observing, adjusting—again and again.",

  /** Label for the long-form credibility column (right). */
  credibilityRightLabel: "Practice",

  /** Caption under the “years” stat. */
  credibilityStatCaption: "Years in production systems—shipping, observing, refining.",

  credibility: `I build and operate backend systems with an emphasis on reliability, clear APIs, and honest tradeoffs. Writing is part of my practice—clarity for teammates today, and a record worth revisiting later.`,

  sectionEngineering:
    "Work that lives in code and operations—systems, platforms, and experiments held to a humane standard of clarity.",

  sectionWriting:
    "Essays and notes on reliability, API design, and how good teams ship when reality refuses to simplify.",

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

  /** Secondary text links next to hero CTAs. */
  quickLinks: [
    { to: "/experience", label: "Experience" },
    { to: "/resume", label: "Résumé" },
    { to: "/about", label: "About" },
  ],
} as const;
