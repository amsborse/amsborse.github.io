import { Seo } from "@/components/Seo";
import { contactPage, links, site } from "@/content";

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Contact"
        description="How to reach Akshay Borse — links and email."
        path="/contact"
      />

      <div className="article-shell max-w-2xl py-16 sm:py-20 lg:py-24">
        <p className="section-label">Contact</p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Let’s connect
        </h1>
        <p className="mt-5 leading-relaxed text-[var(--color-ink-muted)]">{contactPage.intro}</p>

        <div className="mt-12 border-b border-[var(--color-border)] pb-12">
          <p className="section-label">Email</p>
          <a
            href={`mailto:${site.email}`}
            className="mt-4 block w-fit font-display text-xl text-[var(--color-accent)] underline decoration-[var(--color-accent)]/25 underline-offset-4 transition-colors hover:decoration-[var(--color-accent)]/55 sm:text-2xl"
          >
            {site.email}
          </a>
          <p className="mt-4 text-sm text-[var(--color-ink-muted)]">{contactPage.emailNote}</p>
        </div>

        <ul className="mt-0 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {contactPage.socialRows.map((row) => (
            <li key={row.key}>
              <a
                href={links.social[row.key]}
                className="group flex items-start justify-between gap-4 py-5 transition-colors sm:py-6"
              >
                <div>
                  <span className="font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                    {row.label}
                  </span>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{row.description}</p>
                </div>
                <span className="font-mono text-xs text-[var(--color-ink-muted)]" aria-hidden>
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-sm text-[var(--color-ink-muted)]">{contactPage.closingLine}</p>
      </div>
    </>
  );
}
