import { Link } from "react-router-dom";
import { ExperienceCard } from "@/components/ExperienceCard";
import { Seo } from "@/components/Seo";
import { experience } from "@/data";

export default function ExperiencePage() {
  return (
    <>
      <Seo
        title="Experience"
        description="Work history, roles, and selected achievements — Akshay Borse."
        path="/experience"
      />

      <div className="article-shell max-w-6xl py-16 sm:py-20 lg:py-24">
        <p className="section-label font-mono uppercase tracking-widest text-xs text-[var(--color-ink-muted)]">
          Experience
        </p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Work history
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-body)]">
          Roles and selected achievements. The full résumé is available as a{" "}
          <Link
            to="/resume"
            className="text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            PDF and interactive view
          </Link>
          .
        </p>

        <div className="mt-12">
          {experience.map((entry, idx) => (
            <ExperienceCard key={entry.id} entry={entry} index={idx} />
          ))}
        </div>
      </div>
    </>
  );
}
