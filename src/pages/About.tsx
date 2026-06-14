import { Seo } from "@/components/Seo";
import { useTilt } from "@/hooks/useTilt";
import { about, profile, site } from "@/data";

function ValuesCard({ values }: { values: readonly string[] }) {
  const tiltRef = useTilt<HTMLDivElement>({
    maxRotation: 3,
    scale: 1.008,
    perspective: 1200,
  });

  return (
    <div ref={tiltRef} className="mt-6">
      <div className="premium-card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
        <ul className="space-y-3.5 text-[var(--color-body)]">
          {values.map((line) => (
            <li key={line} className="flex gap-3 text-sm sm:text-base leading-relaxed">
              <span className="text-[var(--color-accent)] font-bold">—</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BuildingCard({ text }: { text: string }) {
  const tiltRef = useTilt<HTMLDivElement>({
    maxRotation: 2.5,
    scale: 1.006,
    perspective: 1200,
  });

  return (
    <div ref={tiltRef} className="mt-6">
      <div className="premium-card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
        <p className="text-sm sm:text-base leading-relaxed text-[var(--color-body)]">
          {text}
        </p>
      </div>
    </div>
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

        {about.showQuickReference ? (
          <p className="mt-12 text-xs text-[var(--color-ink-muted)] font-mono">
            Telemetry reference: {site.name} — {site.headline}
          </p>
        ) : null}
      </div>
    </>
  );
}
