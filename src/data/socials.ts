/**
 * EDIT HERE: Site URL, email, and all external profile links (GitHub, LinkedIn, Medium, Substack, etc.).
 * Add more keys to `social` and list them in `socialNav` if you want them in the footer.
 */

import type { SocialLinks } from "./types";

export const links = {
  /** Public site URL (no trailing slash) — canonical & Open Graph. */
  siteUrl: "https://amsborse.github.io",
  email: "hello@example.com",
  social: {
    github: "https://github.com/amsborse",
    linkedin: "https://www.linkedin.com/in/akshay-borse-placeholder",
    medium: "https://medium.com/@placeholder",
    substack: "https://placeholder.substack.com",
  } satisfies SocialLinks,
} as const;

/** Footer / contact: order and labels (href comes from `links.social[key]`). */
export const socialNav: { key: keyof SocialLinks; label: string }[] = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "medium", label: "Medium" },
  { key: "substack", label: "Substack" },
];
