import { motion, useReducedMotion } from "framer-motion";
import { ChapterPlate } from "./ChapterPlate";

const words =
  "Creativity is a choice to see the world differently and create your own reality".split(" ");

/**
 * The hero opens out onto the wider lake. The line lights word by word as it is
 * read, the way lanterns come on across the water in the plate behind it.
 */
export function HorizonInterlude() {
  const reduce =
    useReducedMotion() ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <section aria-label="A creative point of view" className="horizon">
      <ChapterPlate name="horizon" className="horizon__plate" />
      <blockquote className="horizon__quote">
        {words.map((word, index) => (
          <motion.span
            key={`${word}-${index}`}
            initial={reduce ? false : { color: "var(--color-ink-muted)" }}
            whileInView={reduce ? undefined : { color: "var(--color-ink)" }}
            viewport={{ once: true, amount: 0.35 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.62, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {word}
            {index < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </blockquote>
    </section>
  );
}
