import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChapterHeading } from "./ChapterHeading";

type Study = { title: string; body: string; to: string; sketch: ReactNode };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
  strokeLinecap: "round" as const,
};

/** Each sketch is the idea of the study in a few hairlines, not decoration. */
const studies: readonly Study[] = [
  {
    title: "Algorithms",
    body: "Sorting, search, graphs, dynamic programming, greedy methods and trees, each with its own interactive sandbox.",
    to: "/learning/algorithm",
    sketch: (
      <>
        <path {...stroke} d="M10 46V30M22 46V18M34 46V36M46 46V10M58 46V24" />
        <path {...stroke} className="sketch-accent" d="M6 50h56" />
      </>
    ),
  },
  {
    title: "Coding patterns",
    body: "Problem-solving patterns worked one step at a time, starting with the sliding window.",
    to: "/learning/coding-patterns",
    sketch: (
      <>
        <path {...stroke} d="M8 30h4M18 30h4M28 30h4M38 30h4M48 30h4M58 30h4" />
        <rect {...stroke} className="sketch-accent" x="24" y="20" width="22" height="20" rx="3" />
      </>
    ),
  },
  {
    title: "System design concepts",
    body: "Consistency models, load balancing, caching, database sharding and content delivery, as running simulations.",
    to: "/learning/system-design-concepts",
    sketch: (
      <>
        <circle {...stroke} className="sketch-accent" cx="14" cy="30" r="4" />
        <path {...stroke} d="M18 30h14M32 30l14-14M32 30l14 14M32 30h14" />
        <circle {...stroke} cx="52" cy="14" r="4" />
        <circle {...stroke} cx="52" cy="30" r="4" />
        <circle {...stroke} cx="52" cy="46" r="4" />
      </>
    ),
  },
  {
    title: "Visual labs",
    body: "Celestial grid, particle core, anomaly matrix, gravity well and quantum mesh: studies in real-time graphics.",
    to: "/projects#arsenal",
    sketch: (
      <>
        <ellipse {...stroke} cx="34" cy="30" rx="26" ry="10" />
        <ellipse {...stroke} cx="34" cy="30" rx="14" ry="22" />
        <circle className="sketch-accent sketch-accent--fill" cx="34" cy="30" r="3" />
      </>
    ),
  },
];

/** Engineering depth: the interactive studies that already live under Learning and the labs. */
export function DepthChapter() {
  const reduce = useReducedMotion();
  return (
    <section id="depth" aria-labelledby="depth-title" className="chapter article-shell">
      <ChapterHeading
        id="depth-title"
        eyebrow="Engineering depth"
        title="Understanding, built by hand."
      >
        Working models of the ideas underneath the job. Each one runs in the browser.
      </ChapterHeading>

      <ul className="studies">
        {studies.map((study, index) => (
          <motion.li
            key={study.to}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: (index % 2) * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link to={study.to} className="study">
              <svg className="study__sketch" viewBox="0 0 68 60" aria-hidden="true">
                {study.sketch}
              </svg>
              <span className="study__text">
                <span className="study__title">
                  {study.title}
                  <span className="study__arrow" aria-hidden="true">
                    →
                  </span>
                </span>
                <span className="study__body">{study.body}</span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
