/**
 * Content layer — edit the files in this folder to update copy and data.
 * Layout code imports from `@/content` (this file) for a stable API.
 */
export { articleOrder } from "./articles";
export type { ArticleSlug } from "./articles";
export { bio } from "./bio";
export { contactPage } from "./contact";
export { contentPaths } from "./paths";
export { experience } from "./experience";
export { home } from "./home";
export { links, socialNav } from "./links";
export { navItems } from "./nav";
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
import { links } from "./links";
import { profile } from "./profile";

/** Composite site object for components that expect a single `site` prop (SEO, footer, home). */
export const site = {
  name: profile.name,
  title: profile.title,
  headline: profile.headline,
  tagline: profile.tagline,
  description: profile.description,
  url: links.siteUrl,
  email: links.email,
  social: links.social,
  homeCredibility: home.credibility,
  homeSectionEngineering: home.sectionEngineering,
  homeSectionWriting: home.sectionWriting,
  highlights: home.highlights,
  heroRoleLabel: profile.heroRoleLabel,
  footerTagline: profile.footerTagline,
} as const;
