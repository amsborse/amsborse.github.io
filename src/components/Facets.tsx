import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { facets, facetsIntro } from "@/data";

export function Facets() {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="facets-title" className="article-shell max-w-6xl py-16 sm:py-24">
      <p className="chapter-eyebrow">{facetsIntro.label}</p>
      <h2
        id="facets-title"
        className="theme-heading mt-3 max-w-[18ch] font-display text-[clamp(2rem,4.4vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.03em]"
      >
        {facetsIntro.title}
      </h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-body)]">
        {facetsIntro.note}
      </p>

      <ol className="mt-10 grid grid-cols-1 gap-x-10 border-t border-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
        {facets.map((facet, index) => (
          <motion.li
            key={facet.id}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-[var(--color-border)]"
          >
            <Link
              to={facet.to}
              className="group flex h-full flex-col gap-3 py-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <span className="flex items-baseline gap-3 text-sm text-[var(--color-body)]">
                <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[var(--color-accent)]">{facet.label}</span>
              </span>
              <span className="font-display text-2xl font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                {facet.title}
              </span>
              <span className="max-w-md text-base leading-relaxed text-[var(--color-body)]">
                {facet.body}
              </span>
              <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]">
                {facet.cta}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
                >
                  →
                </span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
