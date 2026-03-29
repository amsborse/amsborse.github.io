import type { SocialLinks } from "./types";

/**
 * URLs & email — canonical site URL and outbound links.
 */
export const links = {
  /** Public site URL (no trailing slash) — used for canonical & Open Graph. */
  siteUrl: "https://amsborse.github.io",
  email: "hello@example.com",
  social: {
    github: "https://github.com/amsborse",
    linkedin: "https://www.linkedin.com/in/akshay-borse-placeholder",
    medium: "https://medium.com/@placeholder",
    substack: "https://placeholder.substack.com",
  } satisfies SocialLinks,
} as const;

/** Footer / elsewhere: ordered list of networks (href from `links.social[key]`). */
export const socialNav: { key: keyof SocialLinks; label: string }[] = [
  { key: "github", label: "GitHub" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "medium", label: "Medium" },
  { key: "substack", label: "Substack" },
];
