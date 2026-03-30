import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { resume } from "@/data";

function resumeDownloadHref(path: string): string {
  const t = path.trim();
  if (t.startsWith("http")) return t;
  const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const rest = t.startsWith("/") ? t.slice(1) : t;
  return `${base}${rest}`;
}

export default function ResumePage() {
  const hasResumeFile = Boolean(resume.downloadUrl?.trim());

  return (
    <>
      <Seo
        title="Resume & career highlights"
        description="Skills, focus areas, and selected achievements — Akshay Borse."
        path="/resume"
      />

      <div className="article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <p className="section-label">Resume</p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Career highlights
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[0.9375rem]">
          A concise snapshot for recruiters and hiring managers. Full timeline on the{" "}
          <Link to="/experience" className="text-[var(--color-accent)] hover:underline">
            Experience
          </Link>{" "}
          page.
        </p>

        {hasResumeFile ? (
          <p className="mt-6">
            <a
              href={resumeDownloadHref(resume.downloadUrl)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--color-gold)_32%,var(--color-accent)_18%)] bg-[var(--color-accent)] px-5 text-sm font-medium text-[var(--color-surface-elevated)] shadow-sm transition-[color,background-color,border-color,box-shadow] duration-300 [transition-timing-function:var(--ease-out-luxe)] hover:bg-[var(--color-accent-bright)]"
              {...(resume.downloadUrl.trim().startsWith("http") ? {} : { download: true })}
            >
              {resume.downloadLabel}
            </a>
          </p>
        ) : null}

        <div className="mt-12 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-8 shadow-sm sm:p-10">
          <h2 className="section-label">Executive summary</h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--color-body)]">{resume.executiveSummary}</p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="section-label">Skills</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-[var(--color-ink-muted)]">Languages</dt>
                <dd className="mt-1 text-[var(--color-body)]">{resume.skills.languages.join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Systems</dt>
                <dd className="mt-1 text-[var(--color-body)]">{resume.skills.systems.join(" · ")}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-ink-muted)]">Practices</dt>
                <dd className="mt-1 text-[var(--color-body)]">{resume.skills.practices.join(" · ")}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="section-label">Focus areas</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--color-body)] marker:text-[var(--color-accent)]/50">
              {resume.focusAreas.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className="mt-14 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
          Selected achievements
        </h2>
        <ul className="mt-4 space-y-3 text-[var(--color-body)]">
          {resume.achievements.map((a) => (
            <li key={a} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]/60" />
              {a}
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-wrap gap-4">
          <Link
            to="/contact"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] shadow-sm transition-colors hover:border-[var(--color-border-strong)]"
          >
            Get in touch
          </Link>
          <Link
            to="/projects"
            className="rounded-md px-5 py-2.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
          >
            View projects →
          </Link>
        </div>
      </div>
    </>
  );
}
