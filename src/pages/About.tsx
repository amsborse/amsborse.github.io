import { Seo } from "@/components/Seo";
import { ContentInteractiveCard } from "@/components/InteractiveCard";
import { about, contactPage, links, profile, site } from "@/data";

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

function EmailCard() {
  return (
    <ContentInteractiveCard color="from-sky-500 to-cyan-600" className="mt-10">
      <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-500">Email</p>
      <a
        href={`mailto:${site.email}`}
        className="mt-3 block w-fit font-display text-lg text-indigo-400 underline decoration-indigo-400/25 underline-offset-4 transition-colors hover:decoration-indigo-400/55 sm:text-xl"
      >
        {site.email}
      </a>
      <p className="mt-3 text-sm text-slate-400">{contactPage.emailNote}</p>
    </ContentInteractiveCard>
  );
}

function SocialCard() {
  return (
    <ContentInteractiveCard color="from-pink-500 to-rose-600" className="mt-8">
      <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-500 mb-4">
        Networks
      </p>
      <ul className="divide-y divide-white/5">
        {contactPage.socialRows.map((row) => (
          <li key={row.key} className="first:pt-0 last:pb-0">
            <a
              href={links.social[row.key]}
              className="group flex items-start justify-between gap-4 py-4 transition-colors"
            >
              <div>
                <span className="font-medium text-white group-hover:text-indigo-400">
                  {row.label}
                </span>
                <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>
              </div>
              <span
                className="font-mono text-xs text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                aria-hidden
              >
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
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

        <section id="contact" className="scroll-mt-24">
          <h2 className="mt-14 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
            Contact
          </h2>
          <p className="mt-5 leading-relaxed text-[var(--color-ink-muted)]">{contactPage.intro}</p>
          <EmailCard />
          <SocialCard />
          <p className="mt-12 text-sm text-[var(--color-ink-muted)] italic">
            {contactPage.closingLine}
          </p>
        </section>

        {about.showQuickReference ? (
          <p className="mt-12 text-xs text-[var(--color-ink-muted)] font-mono">
            Telemetry reference: {site.name} — {site.headline}
          </p>
        ) : null}
      </div>
    </>
  );
}
