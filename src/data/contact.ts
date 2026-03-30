/**
 * EDIT HERE: Contact page copy. Email and social URLs live in `socials.ts`.
 */

import type { SocialLinks } from "./types";

export const contactPage = {
  intro:
    "The best way to reach me is email. For open-source or side projects, GitHub works well too.",
  emailNote: "Replace with your real address in `src/data/socials.ts` (email field).",
  socialRows: [
    { key: "github" as keyof SocialLinks, label: "GitHub", description: "Code and experiments" },
    { key: "linkedin" as keyof SocialLinks, label: "LinkedIn", description: "Professional background" },
    { key: "medium" as keyof SocialLinks, label: "Medium", description: "Essays (if you cross-post)" },
    { key: "substack" as keyof SocialLinks, label: "Substack", description: "Newsletter / longer notes" },
  ],
  closingLine: "No form, no tracking.",
} as const;
