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

  const pHero = sy * 0.018;
  const pBand = sy * 0.01;

  return (
    <>
      <Seo title={site.title} description={site.description} path="/" />

      <section className="home-section relative overflow-hidden pt-8 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="parallax-layer absolute -right-[15%] top-[-20%] h-[70%] w-[70%] rounded-full opacity-[0.5]"
            style={{
              background: "radial-gradient(circle, rgba(26, 77, 110, 0.06) 0%, transparent 65%)",
              transform: parallaxOn ? `translate3d(0, ${pHero}px, 0)` : undefined,
            }}
          />
        </div>
        <div className="relative article-shell max-w-6xl pb-28 pt-12 sm:pb-32 sm:pt-16 lg:pb-40 lg:pt-20">
          <p className="section-label">{site.heroRoleLabel}</p>
          <h1 className="mt-10 max-w-[18ch] font-display text-[2.65rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--color-ink)] sm:text-[3.1rem] sm:leading-[1.04] lg:mt-12 lg:text-[3.65rem] lg:leading-[1.02]">
            {site.name}
          </h1>
          <p className="mt-10 max-w-xl text-[1.125rem] leading-[1.72] text-[var(--color-body)] sm:text-[1.1875rem] sm:leading-[1.75] lg:mt-12 lg:max-w-[36rem]">
            {site.tagline}
          </p>
          <div className="mt-14 flex flex-col gap-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-14 sm:gap-y-3 lg:mt-16">
            <Button to="/projects">View projects</Button>
            <div className="flex flex-wrap gap-x-10 gap-y-2 text-[0.9375rem]">
              <Link
                to="/writing"
                className="motion-link font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                Writing
              </Link>
              <Link
                to="/experience"
                className="motion-link font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                Experience
              </Link>
              <Link
                to="/resume"
                className="motion-link font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
              >
                Résumé
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-section--alt relative overflow-hidden">
        <div
          className="parallax-layer pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(26, 77, 110, 0.04), transparent 55%)",
            transform: parallaxOn ? `translate3d(0, ${pBand}px, 0)` : undefined,
          }}
        />
        <div className="relative article-shell max-w-6xl py-24 sm:py-28 lg:py-36">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="premium-panel premium-panel--lift lg:col-span-4 rounded-lg p-8 sm:p-10">
              <p className="section-label">Credibility</p>
              <p className="mt-8 font-display text-[3.25rem] font-semibold tabular-nums leading-none tracking-tight text-[var(--color-ink)] sm:text-[3.5rem]">
                {site.highlights.yearsExperience}
              </p>
              <p className="mt-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Years building and operating production systems.
              </p>
              <ul className="mt-11 space-y-4 text-sm leading-relaxed text-[var(--color-body)]">
                {site.highlights.focusAreas.map((item) => (
                  <li
                    key={item}
                    className="border-l-2 border-[var(--color-accent)]/25 pl-4 transition-colors hover:border-[var(--color-accent)]/45"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="premium-panel premium-panel--lift lg:col-span-8 rounded-lg p-8 sm:p-10 lg:border-l lg:border-[var(--color-border)] lg:pl-12 xl:pl-16">
              <p className="section-label">Positioning</p>
              <p className="mt-8 text-[1.0625rem] leading-[1.82] text-[var(--color-body)] sm:text-[1.075rem]">
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
        <div className="article-shell max-w-6xl py-24 sm:py-28 lg:py-36">
          <header className="mb-16 max-w-2xl lg:mb-20">
            <p className="section-label">Engineering</p>
            <h2 className="mt-5 font-display text-[1.75rem] font-semibold tracking-[-0.025em] text-[var(--color-ink)] sm:text-[2rem] lg:text-[2.25rem]">
              Selected work
            </h2>
            <p className="mt-6 text-base leading-relaxed text-[var(--color-ink-muted)]">
              {site.homeSectionEngineering}
            </p>
          </header>
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-7">
            {featuredProjects.map((p) => (
              <article key={p.id} className="premium-card group flex flex-col p-7 sm:p-8">
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                  {projectCategories.find((c) => c.id === p.category)?.label ?? p.category}
                </p>
                <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-[var(--color-ink)] lg:text-[1.125rem]">
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
              className="motion-link text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-[6px] hover:decoration-[var(--color-accent)]/60"
            >
              Full project archive
            </Link>
          </p>
        </div>
      </section>

      <section className="home-section home-section--alt relative overflow-hidden pb-6">
        <div className="relative article-shell max-w-6xl py-24 sm:py-28 lg:py-36">
          <header className="mb-16 max-w-2xl lg:mb-20">
            <p className="section-label">Writing</p>
            <h2 className="mt-5 font-display text-[1.75rem] font-semibold tracking-[-0.025em] text-[var(--color-ink)] sm:text-[2rem] lg:text-[2.25rem]">
              Essays & notes
            </h2>
            <p className="mt-6 text-base leading-relaxed text-[var(--color-ink-muted)]">
              {site.homeSectionWriting}
            </p>
          </header>
          <ul className="premium-panel divide-y divide-[var(--color-border)] overflow-hidden rounded-lg shadow-sm">
            {writingPreview.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/writing/${post.slug}`}
                  className="home-writing-row group block px-6 py-8 sm:px-8 sm:py-9"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                    <h3 className="max-w-2xl font-display text-lg font-semibold leading-snug text-[var(--color-ink)] motion-safe:transition-colors motion-safe:duration-300 group-hover:text-[var(--color-accent)]">
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
              className="motion-link text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-[6px] hover:decoration-[var(--color-accent)]/60"
            >
              Browse all writing
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
