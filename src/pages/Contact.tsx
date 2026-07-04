import { Seo } from "@/components/Seo";
import { ContentInteractiveCard } from "@/components/InteractiveCard";
import { contactPage, links, site } from "@/data";

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
