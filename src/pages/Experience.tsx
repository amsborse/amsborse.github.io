import { ExperienceCard } from "@/components/ExperienceCard";
import { Seo } from "@/components/Seo";
import { contentPaths, experience } from "@/content";

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
        <h1 className="mt-4 font-display text-[2.25rem] font-medium tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Work history
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[0.9375rem]">
          A recruiter-friendly view of roles and impact. Edit entries in{" "}
          <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[0.8125rem] text-[var(--color-body)]">
            {contentPaths.experienceFile}
          </code>
          .
        </p>

        <div className="mt-14">
          {experience.map((e) => (
            <ExperienceCard key={e.id} entry={e} />
          ))}
        </div>
      </div>
    </>
  );
}
