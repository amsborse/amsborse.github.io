import { ExperienceCard } from "@/components/ExperienceCard";
import { Seo } from "@/components/Seo";
import { contentPaths, experience } from "@/data";

export default function ExperiencePage() {
  return (
    <>
      <Seo
        title="Experience"
        description="Work history, roles, and selected achievements — Akshay Borse."
        path="/experience"
      />

      <div className="article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <p className="section-label">Experience</p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Work history
        </h1>

        <div className="mt-14">
          {experience.map((entry, idx) => (
            <ExperienceCard key={entry.id} entry={entry} index={idx} />
          ))}
        </div>
      </div>
    </>
  );
}
