import { Seo } from "@/components/Seo";
import { contactPage, links, site } from "@/data";

function SocialLinksList() {
  return (
    <div className="mt-6 flex flex-col gap-4">
      {contactPage.socialRows.map((row) => (
        <a
          key={row.key}
          href={links.social[row.key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 group py-1 pointer-events-auto w-fit"
        >
          <div className="h-[1px] w-12 bg-[var(--color-border-strong)] group-hover:w-24 group-hover:bg-[var(--color-ink)] transition-all duration-500 ease-out" />
          <div className="flex items-baseline gap-3">
            <span className="font-mono uppercase tracking-widest text-sm text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors">
              {row.label}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]/70 font-sans">
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
    <div className="mt-8">
      <a
        href={`mailto:${site.email}`}
        className="flex items-center gap-4 group py-1 pointer-events-auto w-fit"
      >
        <div className="h-[1px] w-12 bg-[var(--color-border-strong)] group-hover:w-24 group-hover:bg-[var(--color-ink)] transition-all duration-500 ease-out" />
        <div className="flex items-baseline gap-3">
          <span className="font-mono uppercase tracking-widest text-sm text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors">
            Email
          </span>
          <span className="text-sm font-sans text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 group-hover:decoration-[var(--color-ink)] transition-colors">
            {site.email}
          </span>
        </div>
      </a>
      <p className="mt-2 text-xs text-[var(--color-ink-muted)] pl-16">{contactPage.emailNote}</p>
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
        <p className="section-label font-mono uppercase tracking-widest text-xs text-[var(--color-ink-muted)]">
          Contact
        </p>
        <h1 className="mt-4 font-display text-[2.25rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.65rem]">
          Let’s connect
        </h1>
        <p className="mt-5 leading-relaxed text-[var(--color-body)] text-lg">{contactPage.intro}</p>

        <EmailLink />

        <div className="mt-10">
          <p className="font-mono uppercase tracking-widest text-xs text-[var(--color-ink-muted)] mb-4">
            Networks
          </p>
          <SocialLinksList />
        </div>
      </div>
    </>
  );
}
