/**
 * Writing — order of posts in listings (newest-first is typical; adjust as you like).
 * Post bodies and frontmatter live in `posts/<slug>.md`. Add a new slug here when you add a file.
 */
export const articleOrder = [
  "designing-for-reliability",
  "notes-on-api-design",
  "observability-without-overload",
  "tradeoffs-in-distributed-systems",
  "writing-as-engineering",
] as const;

export type ArticleSlug = (typeof articleOrder)[number];
