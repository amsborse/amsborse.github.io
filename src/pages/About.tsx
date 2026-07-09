import { Seo } from "@/components/Seo";
import { ContentInteractiveCard } from "@/components/InteractiveCard";
import { about, profile, site } from "@/data";

function ValuesCard({ values }: { values: readonly string[] }) {
  return (
    <ContentInteractiveCard color="from-emerald-500 to-teal-600" className="mt-6">
      <ul className="space-y-3 text-sm leading-relaxed">
        {values.map((line) => (
          <li key={line} className="flex gap-3">
            <span className="text-indigo-400 font-bold">—</span>
            {line}
          </li>
        ))}
      </ul>
    </ContentInteractiveCard>
  );
}

function BuildingCard({ text }: { text: string }) {
  return (
    <ContentInteractiveCard color="from-amber-500 to-orange-600" className="mt-6">
      <p className="text-sm leading-relaxed">{text}</p>
    </ContentInteractiveCard>
  );
}

export default function About() {
  return (
    <>
      <Seo title="About" description={about.seoDescription} path="/about" />

      <div className="article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <p className="section-label">About</p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          {about.pageTitle}
        </h1>
        {profile.artistYogiIdentity ? (
          <p className="mt-6 text-lg italic leading-relaxed text-[var(--color-ink-muted)] border-l-2 border-[var(--color-accent)]/20 pl-4">
            {profile.artistYogiIdentity}
          </p>
        ) : null}
        {about.intro.map((paragraph, i) => (
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
          {about.valuesHeading}
        </h2>
        <ValuesCard values={about.values} />

        <h2 className="mt-14 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {about.buildingHeading}
        </h2>
        <BuildingCard text={about.building} />

        {profile.whyAnthropic ? (
          <>
            <h2 className="mt-14 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
              {profile.whyAnthropic.heading}
            </h2>
            {profile.whyAnthropic.paragraphs.map((paragraph, i) => (
              <p key={i} className="mt-6 text-lg leading-relaxed text-[var(--color-body)]">
                {paragraph}
              </p>
            ))}
          </>
        ) : null}

        {about.showQuickReference ? (
          <p className="mt-12 text-xs text-[var(--color-ink-muted)] font-mono">
            Telemetry reference: {site.name} — {site.headline}
          </p>
        ) : null}
      </div>
    </>
  );
}
