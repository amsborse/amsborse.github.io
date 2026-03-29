/**
 * About page — all body copy. Each string in `intro` is a paragraph.
 */
export const bio = {
  pageTitle: "Who I am",
  seoDescription: "Background, values, and how Akshay Borse approaches engineering and writing.",
  intro: [
    "I am a backend-focused software engineer with a bias toward systems thinking and product curiosity. I care about services that stay understandable as they grow—clear boundaries, honest metrics, and APIs that do not surprise the people who depend on them.",
    "Placeholder: Replace this copy with your story—where you work, what problems energize you, and what you want collaborators to know before a first conversation.",
  ],
  valuesHeading: "Values & approach",
  values: [
    "Reliability is a feature; ship with an explicit story for failure modes.",
    "Simple architectures beat clever ones when the team has to operate them at 3 a.m.",
    "Writing clarifies judgment—design docs and essays are part of the craft.",
  ],
  buildingHeading: "What I like building",
  building:
    "Data-heavy APIs, internal platforms, and the glue between product intent and infrastructure reality. I am drawn to teams that respect craft, debate tradeoffs openly, and treat on-call as a learning loop—not a punishment.",
  /** Optional closing line (uses profile.name + profile.headline from site). */
  showQuickReference: true,
} as const;
