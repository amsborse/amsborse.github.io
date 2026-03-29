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

  const pHeroA = sy * 0.038;
  const pHeroB = sy * 0.019;
  const pBand = sy * 0.011;
  const pWrite = sy * 0.007;

  return (
    <>
      <Seo title={site.title} description={site.description} path="/" />

      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="parallax-layer absolute -left-[25%] top-[-35%] h-[85%] w-[85%] rounded-full opacity-[0.09]"
            style={{
              background: "radial-gradient(circle, rgba(110, 75, 145, 0.55) 0%, transparent 68%)",
              transform: parallaxOn ? `translate3d(0, ${pHeroA}px, 0)` : undefined,
            }}
          />
          <div
            className="parallax-layer absolute -right-[20%] top-[10%] h-[60%] w-[60%] rounded-full opacity-[0.07]"
            style={{
              background: "radial-gradient(circle, rgba(55, 65, 130, 0.5) 0%, transparent 70%)",
              transform: parallaxOn ? `translate3d(0, ${pHeroB}px, 0)` : undefined,
            }}
          />
        </div>
        <div className="relative article-shell max-w-6xl py-20 sm:py-24 lg:py-32">
          <p className="section-label">{site.heroRoleLabel}</p>
          <h1 className="mt-8 max-w-[18ch] font-display text-[2.35rem] font-medium leading-[1.08] tracking-[-0.03em] text-[var(--color-ink)] sm:text-5xl sm:leading-[1.06] lg:text-[3.15rem]">
            {site.name}
          </h1>
          <p className="mt-8 max-w-xl text-base leading-[1.68] text-[var(--color-body)] sm:text-lg sm:leading-[1.72]">
            {site.tagline}
          </p>
          <div className="mt-12 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-12 sm:gap-y-2">
            <Button to="/projects">View projects</Button>
            <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
              <Link
                to="/writing"
                className="motion-link text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
              >
                Writing
              </Link>
              <Link
                to="/experience"
                className="motion-link text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
              >
                Experience
              </Link>
              <Link
                to="/resume"
                className="motion-link text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
              >
                Résumé
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--color-border)]">
        <div
          className="parallax-layer pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(88, 60, 120, 0.08), transparent 55%)",
            transform: parallaxOn ? `translate3d(0, ${pBand}px, 0)` : undefined,
          }}
        />
        <div className="relative article-shell max-w-6xl py-16 sm:py-20 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="premium-panel lg:col-span-4 rounded-sm p-8 sm:p-9">
              <p className="section-label">Credibility</p>
              <p className="mt-6 font-display text-[2.75rem] font-medium tabular-nums leading-none tracking-tight text-[var(--color-ink)] sm:text-[3.25rem]">
                {site.highlights.yearsExperience}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Years building and operating production systems.
              </p>
              <ul className="mt-10 space-y-3.5 text-sm leading-relaxed text-[var(--color-body)]">
                {site.highlights.focusAreas.map((item) => (
                  <li key={item} className="border-l border-[var(--color-border-strong)] pl-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="premium-panel lg:col-span-8 rounded-sm p-8 sm:p-10 lg:border-l lg:border-[var(--color-border)] lg:pl-12 xl:pl-16">
              <p className="section-label">Positioning</p>
              <p className="mt-6 text-[1.0625rem] leading-[1.8] text-[var(--color-body)]">
                {site.homeCredibility}
              </p>
              <p className="mt-9 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                <span className="text-[var(--color-ink-muted)]">Currently interested in: </span>
                {site.highlights.currentInterests.join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="article-shell max-w-6xl py-16 sm:py-20 lg:py-28">
          <header className="mb-14 max-w-2xl lg:mb-16">
            <p className="section-label">Engineering</p>
            <h2 className="mt-4 font-display text-2xl font-medium tracking-tight text-[var(--color-ink)] sm:text-3xl">
              Selected work
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[0.9375rem]">
              {site.homeSectionEngineering}
            </p>
          </header>
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-7">
            {featuredProjects.map((p) => (
              <article
                key={p.id}
                className="premium-card group flex flex-col p-6 sm:p-7"
              >
                <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
                  {projectCategories.find((c) => c.id === p.category)?.label ?? p.category}
                </p>
                <h3 className="mt-4 font-display text-lg font-medium leading-snug text-[var(--color-ink)]">
                  {p.name}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-body)]">{p.summary}</p>
                <p className="mt-6 font-mono text-[0.75rem] text-[var(--color-ink-muted)]">
                  {p.stack.slice(0, 4).join(" · ")}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-14">
            <Link
              to="/projects"
              className="motion-link text-sm text-[var(--color-accent)] underline decoration-[var(--color-accent)]/25 underline-offset-[5px] hover:decoration-[var(--color-accent)]/55"
            >
              Full project archive
            </Link>
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[var(--color-border)]">
        <div
          className="parallax-layer pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 80% 20%, rgba(42, 52, 108, 0.07), transparent 50%)",
            transform: parallaxOn ? `translate3d(0, ${pWrite}px, 0)` : undefined,
          }}
        />
        <div className="relative article-shell max-w-6xl py-16 sm:py-20 lg:py-28">
          <header className="mb-14 max-w-2xl lg:mb-16">
            <p className="section-label">Writing</p>
            <h2 className="mt-4 font-display text-2xl font-medium tracking-tight text-[var(--color-ink)] sm:text-3xl">
              Essays & notes
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[0.9375rem]">
              {site.homeSectionWriting}
            </p>
          </header>
          <ul className="premium-panel divide-y divide-[var(--color-border)] overflow-hidden rounded-sm">
            {writingPreview.map((post) => (
              <li key={post.slug}>
                <Link
                  to={`/writing/${post.slug}`}
                  className="group block px-6 py-7 transition-colors duration-500 sm:px-8 sm:py-8"
                  style={{ transitionTimingFunction: "var(--ease-out-luxe)" }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                    <h3 className="max-w-2xl font-display text-lg font-medium leading-snug text-[var(--color-ink)] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
                      {post.title}
                    </h3>
                    <time
                      className="shrink-0 font-mono text-xs text-[var(--color-ink-muted)]"
                      dateTime={post.date}
                    >
                      {post.date}
                    </time>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-body)]">
                    {post.description}
                  </p>
                  <p className="mt-3 font-mono text-[0.6875rem] text-[var(--color-ink-muted)]">
                    {post.readingMinutes} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-12">
            <Link
              to="/writing"
              className="motion-link text-sm text-[var(--color-accent)] underline decoration-[var(--color-accent)]/25 underline-offset-[5px] hover:decoration-[var(--color-accent)]/55"
            >
              Browse all writing
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
