/**
 * EDIT HERE: Display order for writing posts (by slug = markdown filename without `.md`).
 * Add each new article’s slug here; files live in `src/content/articles/*.md`.
 */

export const articleOrder = [
  "designing-for-reliability",
  "notes-on-api-design",
  "observability-without-overload",
  "tradeoffs-in-distributed-systems",
  "writing-as-engineering",
] as const;

export type ArticleSlug = (typeof articleOrder)[number];
