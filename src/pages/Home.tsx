import { Link } from "react-router-dom";
import { Button } from "@/components/Button";
import { Seo } from "@/components/Seo";
import { useParallaxEnabled, useScrollOffset } from "@/hooks/useParallax";
import { getFeaturedPosts } from "@/content/loadPosts";
import { projectCategories, projects, site } from "@/content";

const featuredProjects = projects.filter((p) => p.featured).slice(0, 3);
const writingPreview = getFeaturedPosts().slice(0, 3);

export default function Home() {
  const parallaxOn = useParallaxEnabled();
  const sy = useScrollOffset(parallaxOn);

  const pHeroA = sy * 0.042;
  const pHeroB = sy * 0.022;
  const pBand = sy * 0.013;
  const pWrite = sy * 0.008;

  return (
    <>
      <Seo title={site.title} description={site.description} path="/" />

      <section className="home-section relative overflow-hidden pt-6 sm:pt-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {/* Royal hero glow — champagne center + plum/indigo orbs */}
          <div
            className="home-hero-aurora absolute left-1/2 top-[-28%] h-[95%] w-[120%] -translate-x-1/2 rounded-full opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 50% 42% at 50% 38%, rgba(212, 184, 150, 0.14) 0%, rgba(118, 92, 168, 0.08) 38%, transparent 68%)",
            }}
          />
          <div
            className="parallax-layer absolute -left-[22%] top-[-38%] h-[88%] w-[88%] rounded-full opacity-[0.11]"
            style={{
              background: "radial-gradient(circle, rgba(118, 82, 158, 0.55) 0%, transparent 68%)",
              transform: parallaxOn ? `translate3d(0, ${pHeroA}px, 0)` : undefined,
            }}
          />
          <div
            className="parallax-layer absolute -right-[18%] top-[8%] h-[62%] w-[62%] rounded-full opacity-[0.09]"
            style={{
              background: "radial-gradient(circle, rgba(58, 72, 138, 0.52) 0%, transparent 72%)",
              transform: parallaxOn ? `translate3d(0, ${pHeroB}px, 0)` : undefined,
            }}
          />
        </div>
        <div className="relative article-shell max-w-6xl pb-24 pt-14 sm:pb-28 sm:pt-16 lg:pb-36 lg:pt-20">
          <p className="section-label">{site.heroRoleLabel}</p>
          <h1 className="mt-10 max-w-[20ch] font-display text-[2.5rem] font-medium leading-[1.06] tracking-[-0.035em] text-[var(--color-ink)] sm:text-[2.85rem] sm:leading-[1.05] lg:mt-12 lg:text-[3.45rem] lg:leading-[1.02]">
            {site.name}
          </h1>
          <p className="mt-10 max-w-xl text-[1.0625rem] leading-[1.75] text-[var(--color-body)] sm:text-[1.125rem] sm:leading-[1.78] lg:mt-11 lg:max-w-[34rem]">
            {site.tagline}
          </p>
          <div className="mt-14 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-14 sm:gap-y-3 lg:mt-16">
            <Button to="/projects">View projects</Button>
            <div className="flex flex-wrap gap-x-11 gap-y-2 text-[0.9375rem]">
              <Link
                to="/writing"
                className="motion-link text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                Writing
              </Link>
              <Link
                to="/experience"
                className="motion-link text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                Experience
              </Link>
              <Link
                to="/resume"
                className="motion-link text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                Résumé
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section relative overflow-hidden">
        <div
          className="parallax-layer pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 95% 75% at 50% 0%, rgba(88, 62, 128, 0.1), transparent 58%)",
            transform: parallaxOn ? `translate3d(0, ${pBand}px, 0)` : undefined,
          }}
        />
        <div className="relative article-shell max-w-6xl py-20 sm:py-24 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="premium-panel premium-panel--lift lg:col-span-4 rounded-sm p-8 sm:p-9">
              <p className="section-label">Credibility</p>
              <p className="mt-7 font-display text-[3rem] font-medium tabular-nums leading-none tracking-tight text-[var(--color-ink)] sm:text-[3.35rem]">
                {site.highlights.yearsExperience}
              </p>
              <p className="mt-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Years building and operating production systems.
              </p>
              <ul className="mt-11 space-y-4 text-sm leading-relaxed text-[var(--color-body)]">
                {site.highlights.focusAreas.map((item) => (
                  <li
                    key={item}
                    className="border-l border-[var(--color-accent)]/25 pl-4 transition-colors duration-500 hover:border-[var(--color-accent)]/45"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="premium-panel premium-panel--lift lg:col-span-8 rounded-sm p-8 sm:p-10 lg:border-l lg:border-[var(--color-border-strong)]/80 lg:pl-12 xl:pl-16">
              <p className="section-label">Positioning</p>
              <p className="mt-7 text-[1.0625rem] leading-[1.82] text-[var(--color-body)] sm:text-[1.075rem]">
                {site.homeCredibility}
              </p>
              <p className="mt-10 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                <span className="text-[var(--color-ink-muted)]">Currently interested in: </span>
                {site.highlights.currentInterests.join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="article-shell max-w-6xl py-20 sm:py-24 lg:py-32">
          <header className="mb-16 max-w-2xl lg:mb-[4.25rem]">
            <p className="section-label">Engineering</p>
            <h2 className="mt-5 font-display text-[1.65rem] font-medium tracking-[-0.02em] text-[var(--color-ink)] sm:text-3xl lg:text-[2.125rem]">
              Selected work
            </h2>
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-[var(--color-ink-muted)] sm:text-base">
              {site.homeSectionEngineering}
            </p>
          </header>
          <div className="grid gap-9 lg:grid-cols-3 lg:gap-8">
            {featuredProjects.map((p) => (
              <article key={p.id} className="premium-card group flex flex-col p-7 sm:p-8">
                <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
                  {projectCategories.find((c) => c.id === p.category)?.label ?? p.category}
                </p>
                <h3 className="mt-5 font-display text-lg font-medium leading-snug text-[var(--color-ink)] lg:text-[1.125rem]">
                  {p.name}
                </h3>
                <p className="mt-3.5 flex-1 text-sm leading-relaxed text-[var(--color-body)]">{p.summary}</p>
                <p className="mt-7 font-mono text-[0.75rem] text-[var(--color-ink-muted)]">
                  {p.stack.slice(0, 4).join(" · ")}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-16">
            <Link
              to="/projects"
              className="motion-link text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-[6px] transition-colors hover:decoration-[var(--color-accent)]/70"
            >
              Full project archive
            </Link>
          </p>
        </div>
      </section>

      <section className="home-section relative overflow-hidden pb-4">
        <div
          className="parallax-layer pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 85% 65% at 78% 18%, rgba(52, 62, 118, 0.09), transparent 52%)",
            transform: parallaxOn ? `translate3d(0, ${pWrite}px, 0)` : undefined,
          }}
        />
        <div className="relative article-shell max-w-6xl py-20 sm:py-24 lg:py-32">
          <header className="mb-16 max-w-2xl lg:mb-[4.25rem]">
            <p className="section-label">Writing</p>
            <h2 className="mt-5 font-display text-[1.65rem] font-medium tracking-[-0.02em] text-[var(--color-ink)] sm:text-3xl lg:text-[2.125rem]">
              Essays & notes
            </h2>
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-[var(--color-ink-muted)] sm:text-base">
              {site.homeSectionWriting}
            </p>
          </header>
          <ul className="premium-panel divide-y divide-[var(--color-border)] overflow-hidden rounded-sm shadow-[0_0_0_1px_rgba(212,184,150,0.05)]">
            {writingPreview.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/writing/${post.slug}`}
                  className="home-writing-row group block px-6 py-8 sm:px-8 sm:py-9"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                    <h3 className="max-w-2xl font-display text-lg font-medium leading-snug text-[var(--color-ink)] motion-safe:transition-colors motion-safe:duration-500 group-hover:text-[var(--color-accent)]">
                      {post.title}
                    </h3>
                    <time
                      className="shrink-0 font-mono text-xs text-[var(--color-ink-muted)]"
                      dateTime={post.date}
                    >
                      {post.date}
                    </time>
                  </div>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[var(--color-body)]">
                    {post.description}
                  </p>
                  <p className="mt-3.5 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                    {post.readingMinutes} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-14">
            <Link
              to="/writing"
              className="motion-link text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-[6px] transition-colors hover:decoration-[var(--color-accent)]/70"
            >
              Browse all writing
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
