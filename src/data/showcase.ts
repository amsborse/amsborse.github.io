import type { ShowcaseProject } from "./types";

export const showcase: ShowcaseProject[] = [
  {
    id: "sutra",
    title: "Sutra",
    summary:
      "A local-first personal intelligence workspace: research, spaced-repetition memory, and autonomous coding agents in one place.",
    tags: ["React 19", "Three.js / WebGPU", "Fastify", "PostgreSQL", "Agents"],
    status: "Private · in active development",
    links: [],
  },
  {
    id: "invisible-loops",
    title: "Invisible Loops",
    summary:
      "An editorial reading platform where concept-heavy essays unfold visually, scene by scene.",
    tags: ["React", "Motion", "Editorial design"],
    links: [
      { label: "Live", href: "https://invisible-loops.vercel.app" },
      { label: "Code", href: "https://github.com/amsborse/InvisibleLoops" },
    ],
  },
  {
    id: "thought-loop-explorer",
    title: "Thought Loop Explorer",
    summary:
      "An interactive skill-tree canvas mapping emotions, thought loops and CBT/ACT patterns.",
    tags: ["React Flow", "TypeScript", "Data viz"],
    links: [{ label: "Code", href: "https://github.com/amsborse/Thought-Loop-Explorer" }],
  },
  {
    id: "ambient-tv-home",
    title: "Ambient TV Home",
    summary:
      "A cinematic smart-TV home screen for LG webOS and Fire TV: moon phase, flip clock, weather, calendar — built for 10-foot viewing.",
    tags: ["Vanilla JS", "CSS", "webOS", "Android TV"],
    status: "Personal build",
    links: [],
  },
  {
    id: "karma-simulator",
    title: "Karma Simulator",
    summary:
      "A cognitive-signature visualizer that maps behavioral traits as a living identity graph.",
    tags: ["React", "Canvas", "Simulation"],
    links: [{ label: "Code", href: "https://github.com/amsborse/KarmaSimulator" }],
  },
  {
    id: "careeros",
    title: "CareerOS",
    summary:
      "An AI-powered career operating system: job-application autofill, résumé and cover-letter tooling, and application tracking in one workspace.",
    tags: ["Next.js", "Chrome MV3", "FastAPI", "Python"],
    links: [{ label: "Code", href: "https://github.com/Oblivion-Labs-Dev/CareerOS" }],
  },
];
