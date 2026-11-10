import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Props = { id: string; eyebrow: string; title: string; children?: ReactNode };

/** The shared opening of a home chapter: amber eyebrow on the current, then a serif title. */
export function ChapterHeading({ id, eyebrow, title, children }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      className="chapter-heading"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="chapter-eyebrow">{eyebrow}</p>
      <h2 id={id} className="chapter-title">
        {title}
      </h2>
      {children ? <p className="chapter-lede">{children}</p> : null}
    </motion.header>
  );
}
