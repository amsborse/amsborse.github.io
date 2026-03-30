import { Fragment, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { useParallaxEnabled, useScrollOffset } from "@/hooks/useParallax";
import { home, profile, projectCategories, projects, site } from "@/data";
import { getFeaturedPosts } from "@/utils/loadArticles";

const featuredProjects = projects.filter((p) => p.featured).slice(0, 3);
const writingPreview = getFeaturedPosts().slice(0, 3);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Highlights phrases in `profile.subheadline` (see `home.taglineHighlights`). */
function taglineWithEmphasis(text: string, highlights: readonly string[]): ReactNode {
  const safe = highlights.filter((h) => h.length > 0 && text.includes(h));
  if (safe.length === 0) return text;
  const pattern = new RegExp(`(${safe.map(escapeRegExp).join("|")})`, "g");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    safe.includes(part) ? (
      <span key={`${part}-${i}`} className="text-emphasis">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export default function Home() {
  const parallaxOn = useParallaxEnabled();
  const sy = useScrollOffset(parallaxOn);

  /* Slow parallax — hero backdrop only */
  const pHero = sy * 0.03;
  const pMesh = sy * 0.017;

  return (
    <>
      <Seo title={site.title} description={site.description} path="/" />

      <section className="home-hero home-section relative min-h-[min(88vh,52rem)] overflow-hidden pb-16 pt-10 sm:min-h-[min(90vh,56rem)] sm:pb-20 sm:pt-14 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="home-hero__wash parallax-layer absolute inset-0"
            style={{
              transform: parallaxOn ? `translate3d(0, ${pHero * 0.32}px, 0)` : undefined,
            }}
          />
          <div className="home-hero__geometry home-hero__geometry--drift" />
          <div
            className="home-hero__mesh parallax-layer absolute -inset-[22%] opacity-[0.88]"
            style={{
              transform: parallaxOn ? `translate3d(0, ${pMesh}px, 0)` : undefined,
            }}
          />
          <div
            className="home-hero__fine parallax-layer absolute inset-0"
            style={{
              transform: parallaxOn ? `translate3d(0, ${pHero * 0.2}px, 0)` : undefined,
            }}
          />
          <div
            className="home-hero__center-bloom"
            aria-hidden
            style={{
              transform: `translate3d(-50%, calc(-50% + ${parallaxOn ? pHero * 0.12 : 0}px), 0)`,
            }}
          />
          <div
            className="home-hero__bloom home-hero__bloom--warm parallax-layer absolute -left-[18%] top-[-25%] h-[min(85vw,520px)] w-[min(85vw,520px)]"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 20%, transparent) 0%, transparent 68%)",
              transform: parallaxOn ? `translate3d(0, ${pHero * 0.45}px, 0)` : undefined,
            }}
          />
          <div
            className="home-hero__bloom home-hero__bloom--cool parallax-layer absolute -right-[12%] top-[-8%] h-[min(75vw,480px)] w-[min(75vw,480px)]"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 14%, transparent) 0%, transparent 70%)",
              transform: parallaxOn ? `translate3d(0, ${pHero * 0.62}px, 0)` : undefined,
            }}
          />
          <div
            className="parallax-layer absolute bottom-[-20%] left-1/2 h-[45%] w-[120%] opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 55% 60% at 50% 100%, color-mix(in srgb, var(--color-accent) 6%, transparent), transparent 72%)",
              transform: `translate3d(-50%, ${parallaxOn ? pHero * 0.18 : 0}px, 0)`,
            }}
          />
        </div>

        <div className="hero-intro relative z-10 mx-auto flex max-w-6xl flex-col px-4 sm:px-6 lg:px-10">
          <div className="max-w-[36rem] lg:max-w-[40rem] xl:max-w-[42rem]">
            <p className="hero-enter hero-enter--1 section-label section-label--hero">{site.heroRoleLabel}</p>

            <h1 className="hero-enter hero-enter--2 mt-10 sm:mt-12 lg:mt-14">
              <span className="hero-statement block font-display text-[2rem] font-semibold leading-[1.12] tracking-[-0.038em] text-[var(--color-ink)] sm:text-[2.45rem] sm:leading-[1.1] lg:text-[2.85rem] lg:leading-[1.08]">
                {site.heroStatement}
              </span>
              <span className="hero-name-line mt-6 block font-display text-[1.35rem] font-medium tracking-[-0.02em] text-[var(--color-ink)] sm:mt-7 sm:text-[1.5rem] lg:text-[1.65rem]">
                {site.name}
              </span>
            </h1>

            <p className="hero-enter hero-enter--3 hero-soul-line mt-8 max-w-[34rem] text-[1.0625rem] leading-[1.72] sm:mt-10 sm:text-[1.125rem] sm:leading-[1.78] lg:mt-11">
              {site.heroSoulLine}
            </p>
            <p className="hero-enter hero-enter--4 mt-8 max-w-xl text-[1.0625rem] leading-[1.9] text-[var(--color-body)] sm:mt-9 sm:text-[1.125rem] sm:leading-[1.92] lg:max-w-[36rem]">
              {taglineWithEmphasis(site.tagline, site.taglineHighlights)}
            </p>
          </div>

          <div className="hero-enter hero-enter--5 motif-separator mt-16 sm:mt-20 lg:mt-24" aria-hidden />

          <div className="hero-enter hero-enter--6 mt-12 flex flex-col gap-12 sm:mt-14 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-14 sm:gap-y-8 lg:mt-16">
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <Button to={profile.cta.primary.to} className="hero-cta hero-cta--primary">
                {profile.cta.primary.label}
              </Button>
              <Button
                to={profile.cta.secondary.to}
                variant="ghost"
                className="hero-cta hero-cta--ghost !min-h-[44px] px-5 text-[var(--color-ink-muted)]"
              >
                {profile.cta.secondary.label}
              </Button>
            </div>
            <nav className="flex flex-wrap gap-x-10 gap-y-3 text-[0.9375rem]" aria-label="Quick links">
              {home.quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="hero-quick-link motion-link font-medium text-[var(--color-ink-muted)] underline decoration-transparent underline-offset-[6px] transition-[color,text-decoration-color,transform] duration-500 [transition-timing-function:var(--ease-out-luxe)] motion-safe:hover:text-[var(--color-accent)] motion-safe:hover:decoration-[var(--color-accent)]/35 motion-safe:hover:translate-x-0.5"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="home-section home-section--tint-sage relative overflow-hidden">
        <Reveal className="relative article-shell max-w-6xl py-24 sm:py-28 lg:py-36" delayMs={40}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="premium-panel premium-panel--lift lg:col-span-4 rounded-lg p-8 sm:p-10">
              <p className="section-label">Credibility</p>
              <p className="mt-5 max-w-[20ch] text-[0.9375rem] font-display italic leading-[1.65] text-[var(--color-ink-muted)] sm:text-[1rem]">
                {site.homeCredibilityLead}
              </p>
              <p className="mt-9 font-display text-[3.35rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--color-ink)] sm:text-[3.65rem]">
                {site.highlights.yearsExperience}
              </p>
              <p className="mt-5 text-sm leading-[1.75] text-[var(--color-ink-muted)]">
                {site.homeCredibilityStatCaption}
              </p>
              <ul className="mt-11 space-y-4 text-sm leading-relaxed text-[var(--color-body)]">
                {site.highlights.focusAreas.map((item) => (
                  <li
                    key={item}
                    className="border-l-2 border-[var(--color-accent)]/30 pl-4 transition-colors hover:border-[var(--color-gold)]/45"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="premium-panel premium-panel--lift lg:col-span-8 rounded-lg p-8 sm:p-10 lg:border-l lg:border-[var(--color-border-strong)] lg:pl-12 xl:pl-16">
              <p className="section-label">{site.homeCredibilityRightLabel}</p>
              <p className="mt-8 text-[1.0625rem] leading-[1.88] text-[var(--color-body)] sm:text-[1.08rem]">
                {site.homeCredibility}
              </p>
              <p className="mt-10 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                <span className="text-[var(--color-ink-muted)]">Currently interested in: </span>
                {site.highlights.currentInterests.join(" · ")}
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="home-section home-section--tint-parchment">
        <Reveal className="article-shell max-w-6xl py-24 sm:py-28 lg:py-36" delayMs={20}>
          <header className="mb-16 max-w-2xl lg:mb-20">
            <p className="section-label">Engineering</p>
            <h2 className="mt-6 font-display text-[1.9rem] font-semibold tracking-[-0.028em] text-[var(--color-ink)] sm:text-[2.15rem] lg:text-[2.4rem]">
              Selected work
            </h2>
            <p className="mt-7 text-base leading-[1.75] text-[var(--color-ink-muted)] sm:text-[1.0625rem]">
              {site.homeSectionEngineering}
            </p>
          </header>
        </Reveal>
        <Reveal className="article-shell max-w-6xl pb-24 sm:pb-28 lg:pb-36" stagger staggerMs={68}>
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-7">
            {featuredProjects.map((p, i) => (
              <article
                key={p.id}
                className="premium-card reveal-stagger-item group flex flex-col p-7 sm:p-8"
                style={{ "--reveal-index": i } as CSSProperties}
              >
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                  {projectCategories.find((c) => c.id === p.category)?.label ?? p.category}
                </p>
                <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-[var(--color-ink)] lg:text-[1.125rem]">
                  {p.title}
                </h3>
                <p className="mt-3.5 flex-1 text-sm leading-relaxed text-[var(--color-body)]">{p.summary}</p>
                <p className="mt-7 font-mono text-[0.75rem] text-[var(--color-ink-muted)]">
                  {p.stack.slice(0, 4).join(" · ")}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-16">
            <Link to="/projects" className="link-editorial text-sm font-medium">
              Full project archive
            </Link>
          </p>
        </Reveal>
      </section>

      <section className="home-section home-section--tint-lavender relative overflow-hidden pb-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.38]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 100% 28%, color-mix(in srgb, var(--color-gold) 5%, transparent), transparent 55%)",
          }}
        />
        <Reveal className="relative article-shell max-w-6xl pt-24 sm:pt-28 lg:pt-36" delayMs={30}>
          <header className="mb-14 max-w-2xl lg:mb-20">
            <p className="section-label">Writing</p>
            <h2 className="mt-6 font-display text-[1.9rem] font-semibold tracking-[-0.028em] text-[var(--color-ink)] sm:text-[2.15rem] lg:text-[2.4rem]">
              Essays & notes
            </h2>
            <p className="mt-7 text-base leading-[1.75] text-[var(--color-ink-muted)] sm:text-[1.0625rem]">
              {site.homeSectionWriting}
            </p>
          </header>
        </Reveal>
        <Reveal className="relative article-shell max-w-6xl pb-24 sm:pb-28 lg:pb-36" stagger staggerMs={76}>
          <ul className="flex flex-col gap-5">
            {writingPreview.map((post, i) => (
              <li
                key={post.slug}
                className="reveal-stagger-item"
                style={{ "--reveal-index": i } as CSSProperties}
              >
                <Link
                  to={`/writing/${post.slug}`}
                  className="writing-entry-card group block px-6 py-7 sm:px-8 sm:py-8"
                >
                  <div className="writing-entry-card__inner">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
                      <div className="flex shrink-0 flex-col sm:w-32">
                        <span className="writing-entry-card__eyebrow">Essay</span>
                        <time
                          className="mt-3 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]"
                          dateTime={post.date}
                        >
                          {post.date}
                        </time>
                        <p className="mt-2 font-mono text-[0.6875rem] text-[var(--color-gold-muted)]">
                          {post.readingMinutes} min
                        </p>
                        <span className="writing-entry-card__read">
                          Read
                          <span className="writing-entry-card__read-arrow" aria-hidden>
                            →
                          </span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 sm:pl-2">
                        <h3 className="font-display text-[1.125rem] font-semibold leading-snug text-[var(--color-ink)] transition-colors duration-300 group-hover:text-[var(--color-accent)] sm:text-[1.22rem]">
                          {post.title}
                        </h3>
                        <p className="mt-3 text-sm leading-[1.72] text-[var(--color-body)] sm:text-[0.9375rem]">
                          {post.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-14">
            <Link to="/writing" className="link-editorial text-sm font-medium">
              Browse all writing
            </Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
