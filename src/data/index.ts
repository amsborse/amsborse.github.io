/**
 * Barrel export — import site data from here: `import { site, projects } from '@/data'`.
 */

export type { ArticleSlug } from "./articles";
export { articleOrder } from "./articles";
export { about } from "./about";
export { contactPage } from "./contact";
export { contentPaths } from "./paths";
export { experience } from "./experience";
export { home } from "./home";
export { links, socialNav } from "./socials";
export { navItems } from "./navigation";
export { profile } from "./profile";
export { projectCategories, projects } from "./projects";
export { resume } from "./resume";
export type {
  ExperienceEntry,
  NavItem,
  Project,
  ProjectCategory,
  ProjectCategoryDef,
  SocialLinks,
} from "./types";

import { home } from "./home";
import { links } from "./socials";
import { profile } from "./profile";

/** Composite for SEO, footer, and home — built from `profile`, `home`, and `links`. */
export const site = {
  name: profile.name,
  title: profile.title,
  headline: profile.headline,
  heroStatement: profile.heroStatement,
  tagline: profile.subheadline,
  taglineHighlights: home.taglineHighlights,
  description: profile.description,
  url: links.siteUrl,
  email: links.email,
  social: links.social,
  homeCredibility: home.credibility,
  homeSectionEngineering: home.sectionEngineering,
  homeSectionWriting: home.sectionWriting,
  homeCredibilityLead: home.credibilityLead,
  homeCredibilityRightLabel: home.credibilityRightLabel,
  homeCredibilityStatCaption: home.credibilityStatCaption,
  highlights: home.highlights,
  heroRoleLabel: profile.heroRoleLabel,
  heroSoulLine: profile.heroSoulLine,
  footerTagline: profile.footerIntro,
} as const;
