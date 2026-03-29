/** Shared content model types — edit data in the sibling *.ts files, not here, unless you add fields. */

export type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  location: string;
  start: string;
  end: string;
  summary: string;
  achievements: string[];
};

export type ProjectCategory = "systems" | "product" | "ai" | "tooling";

export type Project = {
  id: string;
  name: string;
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
