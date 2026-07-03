import { Seo } from "@/components/Seo";
import { useTilt } from "@/hooks/useTilt";
import { contactPage, links, site } from "@/data";

function EmailCard() {
  const tiltRef = useTilt<HTMLDivElement>({
    maxRotation: 3,
    scale: 1.01,
    perspective: 1200,
  });

  return (
    <div ref={tiltRef} className="mt-10">
      <div className="premium-card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
        <p className="section-label">Email</p>
        <a
          href={`mailto:${site.email}`}
          className="mt-4 block w-fit font-display text-xl text-[var(--color-accent)] underline decoration-[var(--color-accent)]/25 underline-offset-4 transition-colors hover:decoration-[var(--color-accent)]/55 sm:text-2xl"
        >
          {site.email}
        </a>
        <p className="mt-4 text-sm text-[var(--color-body)]">{contactPage.emailNote}</p>
      </div>
    </div>
  );
}

function SocialCard() {
  const tiltRef = useTilt<HTMLDivElement>({
    maxRotation: 2,
    scale: 1.005,
    perspective: 1200,
  });

  return (
    <div ref={tiltRef} className="mt-8">
      <div className="premium-card p-6 sm:p-8 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
        <p className="section-label mb-4">Networks</p>
        <ul className="divide-y divide-[var(--color-border)]">
          {contactPage.socialRows.map((row) => (
            <li key={row.key} className="first:pt-0 last:pb-0">
              <a
                href={links.social[row.key]}
                className="group flex items-start justify-between gap-4 py-4 transition-colors"
              >
                <div>
                  <span className="font-medium text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                    {row.label}
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{row.description}</p>
                </div>
                <span
                  className="font-mono text-xs text-[var(--color-ink-muted)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                  aria-hidden
                >
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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

        <EmailCard />
        <SocialCard />

        <p className="mt-12 text-sm text-[var(--color-ink-muted)] italic">
          {contactPage.closingLine}
        </p>
      </div>
    </>
  );
}
