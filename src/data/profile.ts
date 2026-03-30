/**
 * EDIT HERE: Core identity — name, headlines, SEO, hero/footer copy, CTAs, and optional “artist–yogi” line.
 * This file drives the home hero, SEO defaults, footer, and parts of About.
 */

export const profile = {
  /** Your name as shown across the site. */
  name: "Akshay Borse",

  /** Default `<title>` and Open Graph title. */
  title: "Akshay Borse — Engineer & Writer",

  /** Short line often shown next to your name in listings (e.g. footer quick reference). */
  headline:
    "Engineer · Systems · Writing — craft, clarity, and long horizons",

  /**
   * Primary hero headline (main H1 line)—specific and memorable, not a job title.
   * Your name appears below as a second line.
   */
  heroStatement:
    "Clarity under load—in architecture, in language, in practice.",

  /**
   * Main supporting paragraph on the hero (after soul line).
   * Keep `taglineHighlights` in `home.ts` as substrings of this text.
   */
  subheadline:
    "I ship reliable backends, publish notes on tradeoffs, and work with teams who still care what happens after deploy.",

  /** One or two sentences for meta / intros where a “short bio” is needed. */
  shortBio:
    "Backend-focused software engineer with a bias toward reliability, clear APIs, and honest tradeoffs.",

  /** Meta description (SEO + Open Graph fallback). */
  description:
    "Portfolio and writing by Akshay Borse — engineer with a bias for reliable systems, careful APIs, and prose that earns its place.",

  /** Small label above the hero headline — professional, not a job title stack. */
  heroRoleLabel: "Software · Systems · Practice",

  /**
   * Tight bridge between headline and body: credibility + depth without cliché.
   */
  heroSoulLine:
    "The same discipline I bring to diagrams and APIs—edges, constraints, room to breathe—I bring to how I think and write.",

  /** Footer one-liner under your name. */
  footerIntro: "Engineering with attention, writing with patience, and taste that stays under the surface.",

  /**
   * Optional extra line on About — quiet, human, non-doctrinal (shown when non-empty).
   */
  artistYogiIdentity:
    "Off-screen: art, movement, and the kind of focus that doesn’t need an audience.",

  /** Primary + secondary hero buttons (paths must match routes in `App.tsx`). */
  cta: {
    primary: { label: "View projects", to: "/projects" },
    secondary: { label: "Read writing", to: "/writing" },
  },
} as const;
