import { Seo } from "@/components/Seo";
import { SectionHeading } from "@/components/SectionHeading";
import { PageStage } from "@/components/stage/PageStage";
import { about, contactPage, links, profile, site } from "@/data";

function ValuesSection({ values }: { values: readonly string[] }) {
  return (
    <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
      {values.map((line) => {
        const colonIdx = line.indexOf(": ");
        const hasColon = colonIdx !== -1;
        const title = hasColon ? line.slice(0, colonIdx) : "";
        const desc = hasColon ? line.slice(colonIdx + 2) : line;

        return (
          <li key={line} className="editorial-card">
            <div className="text-base leading-relaxed text-[var(--color-body)]">
              {hasColon ? (
                <h3 className="mb-2 font-display text-xl font-semibold text-[var(--color-ink)]">
                  {title}
                </h3>
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
          className="about-connect-row group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <div className="about-connect-row__text">
            <span className="text-base font-medium text-[var(--color-ink)]">{row.label}</span>
            <span className="text-base text-[var(--color-body)] font-sans">
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
        className="about-connect-row group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <div className="about-connect-row__text">
          <span className="text-base font-medium text-[var(--color-ink)]">Email</span>
          <span className="text-base font-sans text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 group-hover:decoration-[var(--color-accent)] transition-colors">
            {site.email}
          </span>
        </div>
      </a>
      <p className="mt-3 text-sm text-[var(--color-body)]">{contactPage.emailNote}</p>
    </div>
  );
}

export default function About() {
  return (
    <>
      <Seo title="About" description={about.seoDescription} path="/about" />

      <div className="about-page page-depth article-shell max-w-3xl page-top pb-16 sm:pb-20 lg:pb-24">
        <PageStage
          motif="about"
          eyebrow="About"
          title={about.pageTitle}
          lede={
            profile.artistYogiIdentity ? (
              <p className="italic">{profile.artistYogiIdentity}</p>
            ) : null
          }
        />

        <div className="about-content">
          <div className="space-y-6 max-w-[68ch]">
            {about.intro.map((paragraph, i) => (
              <p key={i} className="text-lg leading-relaxed text-[var(--color-body)] font-sans">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-16 pt-12 border-t border-[var(--color-border)]">
            <SectionHeading eyebrow="About" title={about.valuesHeading} />
            <ValuesSection values={about.values} />
          </div>

          <section
            id="contact"
            className="scroll-mt-24 mt-16 pt-12 border-t border-[var(--color-border)]"
          >
            <SectionHeading eyebrow="Networks" title="Connect" />
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
      </div>
    </>
  );
}
