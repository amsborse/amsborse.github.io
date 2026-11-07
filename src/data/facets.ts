/**
 * EDIT HERE: the "beyond engineering" facets on the home page.
 * Every line points at real work or content elsewhere on the site.
 */
export type Facet = {
  id: string;
  label: string;
  title: string;
  body: string;
  to: string;
  cta: string;
};

export const facetsIntro = {
  label: "More than the job title",
  title: "Engineering is one part of the story.",
};

export const facets: readonly Facet[] = [
  {
    id: "engineer",
    label: "Engineer",
    title: "Systems that earn trust",
    body: "AI governance and risk detection at Microsoft, after six years building large-scale services at Amazon.",
    to: "/experience",
    cta: "Experience & résumé",
  },
  {
    id: "maker",
    label: "Maker",
    title: "Calm, crafted software",
    body: "Products I design and build on my own time — Sutra with its Kriya and Artha workspaces, and an ambient home screen for the TV.",
    to: "/projects",
    cta: "Projects",
  },
  {
    id: "mind",
    label: "Mind",
    title: "How people think and change",
    body: "Thought Loop Explorer, Karma Simulator and Invisible Loops — tools and essays about patterns, habits and choice.",
    to: "/projects",
    cta: "See the work",
  },
  {
    id: "learner",
    label: "Learner",
    title: "Always a student",
    body: "Learning about technology, spirituality, relationships and myself — from algorithms and system design to Sanskrit.",
    to: "/learning",
    cta: "Learning",
  },
];
