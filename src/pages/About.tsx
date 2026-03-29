import { Seo } from "@/components/Seo";
import { bio, site } from "@/content";

export default function About() {
  return (
    <>
      <Seo title="About" description={bio.seoDescription} path="/about" />

      <div className="article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <p className="section-label">About</p>
        <h1 className="mt-4 font-display text-[2.25rem] font-medium tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          {bio.pageTitle}
        </h1>
        {bio.intro.map((paragraph, i) => (
          <p key={i} className="mt-6 text-lg leading-relaxed text-[var(--color-body)]">
            {paragraph.startsWith("Placeholder:") ? (
              <>
                <strong className="font-medium text-[var(--color-ink)]">Placeholder:</strong>
                {paragraph.replace(/^Placeholder:\s*/, " ")}
              </>
            ) : (
              paragraph
            )}
          </p>
        ))}

        <h2 className="mt-14 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {bio.valuesHeading}
        </h2>
        <ul className="mt-4 space-y-3 text-[var(--color-body)]">
          {bio.values.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="text-[var(--color-accent)]">—</span>
              {line}
            </li>
          ))}
        </ul>

        <h2 className="mt-14 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {bio.buildingHeading}
        </h2>
        <p className="mt-4 leading-relaxed text-[var(--color-body)]">{bio.building}</p>

        {bio.showQuickReference ? (
          <p className="mt-10 text-sm text-[var(--color-ink-muted)]">
            Quick reference: {site.name} — {site.headline}
          </p>
        ) : null}
      </div>
    </>
  );
}
