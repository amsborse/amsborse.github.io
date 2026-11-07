import type { ShowcaseProject } from "./types";

const projectImage = (file: string, alt: string, width = 1440, height = 900) => ({
  src: `${import.meta.env.BASE_URL}projects/${file}`,
  alt,
  width,
  height,
});

export const showcase: ShowcaseProject[] = [
  {
    id: "sutra",
    title: "Sutra",
    summary:
      "A local-first personal intelligence workspace: research, spaced-repetition memory, and autonomous coding agents in one place.",
    tags: ["React 19", "Three.js / WebGPU", "Fastify", "PostgreSQL", "Agents"],
    images: [
      projectImage(
        "sutra-home.webp",
        "Sutra workspace home screen with its personal intelligence dashboard."
      ),
      projectImage(
        "sutra-kriya.webp",
        "Sutra Kriya interface for autonomous coding agent workflows."
      ),
      projectImage(
        "sutra-artha.webp",
        "Sutra Artha research interface organizing knowledge and sources."
      ),
    ],
    status: "Private · in active development",
    links: [],
  },
  {
    id: "invisible-loops",
    title: "Invisible Loops",
    summary:
      "An editorial reading platform where concept-heavy essays unfold visually, scene by scene.",
    tags: ["React", "Motion", "Editorial design"],
    images: [
      {
        ...projectImage(
          "invisible-loops-dark.webp",
          "Invisible Loops essay page with a dark editorial reading layout."
        ),
        lightSrc: `${import.meta.env.BASE_URL}projects/invisible-loops-light.webp`,
      },
    ],
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
    images: [
      projectImage(
        "thought-loop-skill-tree.webp",
        "Thought Loop Explorer canvas showing a connected skill tree of emotions and thought patterns."
      ),
    ],
    links: [{ label: "Code", href: "https://github.com/amsborse/Thought-Loop-Explorer" }],
  },
  {
    id: "ambient-tv-home",
    title: "Ambient TV Home",
    summary:
      "A cinematic smart-TV home screen for LG webOS and Fire TV: moon phase, flip clock, weather, calendar — built for 10-foot viewing.",
    tags: ["Vanilla JS", "CSS", "webOS", "Android TV"],
    images: [
      {
        ...projectImage(
          "tv-home-dark.webp",
          "Ambient TV Home screen showing a moon phase, large clock, weather, and calendar across a dark interface.",
          1600,
          900
        ),
        lightSrc: `${import.meta.env.BASE_URL}projects/tv-home-light.webp`,
      },
    ],
    status: "Personal build",
    links: [],
  },
  {
    id: "karma-simulator",
    title: "Karma Simulator",
    summary:
      "A cognitive-signature visualizer that maps behavioral traits as a living identity graph.",
    tags: ["React", "Canvas", "Simulation"],
    images: [
      projectImage(
        "karma-identity-graph.webp",
        "Karma Simulator identity graph visualizing behavioral traits as connected nodes."
      ),
    ],
    links: [{ label: "Code", href: "https://github.com/amsborse/KarmaSimulator" }],
  },
];
