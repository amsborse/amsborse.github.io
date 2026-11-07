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
  note: "The rest shows up in the work — each of these links to it.",
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
    id: "builder",
    label: "Builder",
    title: "Products, idea to ship",
    body: "Sutra, FinanceOS, CareerOS and LeetDesign — products I design, build and run end to end on my own time.",
    to: "/projects",
    cta: "Projects",
  },
  {
    id: "writer",
    label: "Writer",
    title: "Writing things down",
    body: "Essays on reliability, API design and observability, and Invisible Loops — a reading platform where ideas unfold visually.",
    to: "/writing",
    cta: "Writing",
  },
  {
    id: "creative",
    label: "Creative",
    title: "Creativity is a choice",
    body: "Living visuals and motion — Sutra’s WebGPU thread, particle and gravity labs, and an ambient home screen for the TV.",
    to: "/arsenal",
    cta: "Visual labs",
  },
  {
    id: "mind",
    label: "Mind",
    title: "How people think and change",
    body: "Thought Loop Explorer and Karma Simulator — tools for seeing patterns, habits and choice.",
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
