import { Seo } from "@/components/Seo";
import { PageStage } from "@/components/stage/PageStage";
import { about, contactPage, links, profile, site } from "@/data";

function ValuesSection({ values }: { values: readonly string[] }) {
  return (
    <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
      {values.map((line) => {
        const colonIdx = line.indexOf(": ");
        const hasColon = colonIdx !== -1;
        const title = hasColon ? line.slice(0, colonIdx) : "";
        const desc = hasColon ? line.slice(colonIdx + 2) : line;

        return (
          <li key={line} className="flex items-start gap-4 group">
            <div className="h-[1px] w-8 mt-3 bg-[var(--color-border-strong)] group-hover:w-16 group-hover:bg-[var(--color-ink)] transition-all duration-500 ease-out shrink-0" />
            <div className="text-base leading-relaxed text-[var(--color-body)]">
              {hasColon ? (
                <strong className="font-semibold text-[var(--color-ink)]">{title}: </strong>
              ) : null}
              {desc}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SocialLinksList() {
  return (
    <div className="mt-6 flex flex-col gap-4">
      {contactPage.socialRows.map((row) => (
        <a
          key={row.key}
          href={links.social[row.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 group py-1 pointer-events-auto w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <div className="h-[1px] w-12 bg-[var(--color-border-strong)] group-hover:w-24 group-hover:bg-[var(--color-accent)] transition-all duration-500 ease-out" />
          <div className="flex items-baseline gap-3">
            <span className="font-mono uppercase tracking-widest text-sm text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors">
              {row.label}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)] font-sans">
              — {row.description}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function EmailLink() {
  return (
    <div className="mt-6">
      <a
        href={`mailto:${site.email}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 group py-1 pointer-events-auto w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <div className="h-[1px] w-12 bg-[var(--color-border-strong)] group-hover:w-24 group-hover:bg-[var(--color-accent)] transition-all duration-500 ease-out" />
        <div className="flex items-baseline gap-3">
          <span className="font-mono uppercase tracking-widest text-sm text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors">
            Email
          </span>
          <span className="text-sm font-sans text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 group-hover:decoration-[var(--color-accent)] transition-colors">
            {site.email}
          </span>
        </div>
      </a>
      <p className="mt-2 text-xs text-[var(--color-ink-muted)] pl-16">{contactPage.emailNote}</p>
    </div>
  );
}

export default function About() {
  return (
    <>
      <Seo title="About" description={about.seoDescription} path="/about" />

      <div className="article-shell max-w-3xl py-16 sm:py-20 lg:py-24">
        <PageStage
          motif="about"
          eyebrow="About"
          title={about.pageTitle}
          lede={profile.artistYogiIdentity ? <p className="italic">{profile.artistYogiIdentity}</p> : null}
        />

        <div className="space-y-6">
          {about.intro.map((paragraph, i) => (
            <p key={i} className="text-lg leading-relaxed text-[var(--color-body)] font-sans">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-16 pt-12 border-t border-[var(--color-border)]">
          <h2 className="theme-heading text-2xl md:text-4xl font-display font-semibold text-[var(--color-ink)] uppercase tracking-wider">
            {about.valuesHeading}
          </h2>
          <ValuesSection values={about.values} />
        </div>

        <section
          id="contact"
          className="scroll-mt-24 mt-16 pt-12 border-t border-[var(--color-border)]"
        >
          <h2 className="theme-heading text-2xl md:text-4xl font-display font-semibold text-[var(--color-ink)] uppercase tracking-wider">
            Connect
          </h2>
          <p className="mt-5 leading-relaxed text-[var(--color-body)] text-lg">
            {contactPage.intro}
          </p>

          <EmailLink />

          <div className="mt-10">
            <p className="font-mono uppercase tracking-widest text-xs text-[var(--color-ink-muted)] mb-4">
              Networks
            </p>
            <SocialLinksList />
          </div>
        </section>
      </div>
    </>
  );
}
