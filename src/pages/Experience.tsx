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

        <div className="mt-12">
          {experience.map((entry, idx) => (
            <ExperienceCard key={entry.id} entry={entry} index={idx} />
          ))}
        </div>
      </div>
    </>
  );
}
