/**
 * Data shapes for the portfolio. Edit values in the other `src/data/*.ts` files.
 * Only change this file when adding or renaming fields.
 */

export type ExperienceEntry = {
  id: string;
  company: string;
  /** Job title (e.g. Senior Software Engineer). */
  title: string;
  location: string;
  start: string;
  end: string;
  summary: string;
  /** Bullet points — impact and scope. */
  achievements: string[];
};

export type ProjectCategory = "systems" | "product" | "ai" | "tooling";

export type Project = {
  id: string;
  /** Display title. */
  title: string;
  featured: boolean;
  category: ProjectCategory;
  summary: string;
  problem: string;
  stack: string[];
  impact: string;
  links: { label: string; href: string }[];
};

export type ProjectCategoryDef = { id: ProjectCategory; label: string };

export type NavItem = { to: string; label: string };

export type SocialLinks = {
  github: string;
  linkedin: string;
  medium: string;
  substack: string;
};
