import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Seo } from "@/components/Seo";
import { SelectedWork } from "@/components/SelectedWork";
import { experience } from "@/data";

const microsoft = experience.find((entry) => entry.id === "microsoft");
const proofPoints = [
  {
    value: microsoft?.achievements.find((achievement) => achievement.includes("237K+"))
      ? "237K+"
      : null,
    label: "AI agents governed",
  },
  {
    value: microsoft?.achievements.find((achievement) => achievement.includes("28 Azure regions"))
      ? "28"
      : null,
    label: "Azure regions",
  },
  {
    value: microsoft?.achievements.find((achievement) => achievement.includes("135K+"))
      ? "135K+"
      : null,
    label: "signals / day",
  },
].filter((point): point is { value: string; label: string } => point.value !== null);

export default function Home() {
  const prefersReducedMotion =
    useReducedMotion() ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const creativityWords =
    "Creativity is a choice to see the world differently and create your own reality".split(" ");

  return (
    <>
      <Seo
        title="Akshay Borse — Senior Software Engineer"
        description="Akshay Borse is a Senior Software Engineer at Microsoft building enterprise AI governance and risk-detection systems, alongside independent product and interface work."
        path="/"
      />

      <div className="home-page relative w-full selection:bg-[var(--color-accent-soft)]">
        <section className="article-shell flex min-h-[100svh] max-w-6xl items-center pb-12 pt-24 sm:pb-16 sm:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="grid w-full gap-9 lg:grid-cols-[1.12fr_0.88fr] lg:items-end lg:gap-14"
          >
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-[var(--color-accent)] sm:text-sm">
                Senior Software Engineer at Microsoft
              </p>
              <h1 className="theme-heading max-w-[9ch] font-display text-[clamp(3.6rem,10vw,7.75rem)] font-semibold leading-[0.88] tracking-[-0.045em]">
                Akshay
                <br />
                Borse
              </h1>
            </div>

            <div className="max-w-xl lg:pb-1">
              <p className="text-lg leading-[1.55] text-[var(--color-ink)] sm:text-xl sm:leading-[1.6]">
                I build AI governance and risk-detection systems at enterprise scale — and premium
                interfaces on the side.
              </p>

              <ul
                aria-label="Engineering impact"
                className="mt-7 grid grid-cols-3 gap-3 border-y border-[var(--color-border)] py-4 sm:gap-5 sm:py-5"
              >
                {proofPoints.map((point) => (
                  <li key={point.label} className="min-w-0">
                    <span className="block font-mono text-lg font-medium tabular-nums text-[var(--color-ink)] sm:text-xl">
                      {point.value}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-[var(--color-ink-muted)] sm:text-sm">
                      {point.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                <a
                  href="#work"
                  className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-on-accent)] transition-[filter,transform] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] motion-reduce:transition-none"
                >
                  View work{" "}
                  <span className="ml-2" aria-hidden="true">
                    ↓
                  </span>
                </a>
                <Link
                  to="/experience"
                  className="inline-flex min-h-11 items-center text-sm text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  Experience
                </Link>
                <Link
                  to="/resume"
                  className="inline-flex min-h-11 items-center text-sm text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                >
                  Resume
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

        <section
          aria-label="A creative point of view"
          className="article-shell flex min-h-[68svh] max-w-5xl items-center justify-center py-16 sm:py-20"
        >
          <blockquote className="max-w-4xl text-center font-display text-[clamp(2.05rem,5.2vw,4.4rem)] leading-[1.12] tracking-[-0.03em] text-[var(--color-ink)]">
            {creativityWords.map((word, index) => (
              <motion.span
                key={`${word}-${index}`}
                initial={prefersReducedMotion ? false : { color: "var(--color-ink-muted)" }}
                whileInView={prefersReducedMotion ? undefined : { color: "var(--color-ink)" }}
                viewport={{ once: true, amount: 0.35 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.62, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {word}
                {index < creativityWords.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </blockquote>
        </section>

        <div id="work" className="scroll-mt-24">
          <SelectedWork />
        </div>

        <section className="article-shell max-w-6xl pb-20 pt-10 sm:pb-28 sm:pt-16">
          <div className="flex flex-col gap-5 border-t border-[var(--color-border)] pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-xl text-[var(--color-ink)] sm:text-2xl">
              Building systems that earn trust — and products worth spending time with.
            </p>
            <div className="flex shrink-0 gap-5">
              <Link
                to="/experience"
                className="inline-flex min-h-11 items-center text-sm text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Experience
              </Link>
              <Link
                to="/about#contact"
                className="inline-flex min-h-11 items-center text-sm text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
