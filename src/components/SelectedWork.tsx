import { Link } from "react-router-dom";
import { Reveal } from "@/components/Reveal";
import { SutraHero } from "@/components/sutra/SutraHero";
import { showcase } from "@/data";
import { useTheme } from "@/theme/ThemeProvider";

function ShowcaseImage({
  image,
  className = "",
}: {
  image: (typeof showcase)[number]["images"][number];
  className?: string;
}) {
  const { theme } = useTheme();
  const src = theme === "light" && image.lightSrc ? image.lightSrc : image.src;

  return (
    <div
      className={`group/image aspect-auto overflow-hidden rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-card)] ${className}`}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      <img
        src={src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-luxe)] group-hover/image:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover/image:scale-100"
      />
    </div>
  );
}

function ProjectLinks({ links }: { links: (typeof showcase)[number]["links"] }) {
  if (links.length === 0) return null;

  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] hover:decoration-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          {link.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

export function SelectedWork({ embedded = false }: { embedded?: boolean }) {
  const [sutra, ...projects] = showcase;

  return (
    <section
      aria-labelledby="selected-work-title"
      className={embedded ? undefined : "article-shell max-w-6xl"}
    >
      <Reveal className="pb-9 pt-4 sm:pb-12">
        <div className="flex flex-col justify-between gap-5 border-b border-[var(--color-border)] pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="section-label">A few things I’ve been building</p>
            <h2
              id="selected-work-title"
              className="theme-heading mt-3 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-5xl"
            >
              Selected work
            </h2>
          </div>
          {embedded ? null : (
            <Link
              to="/projects"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              Project archive <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </Reveal>

      {sutra ? (
        <Reveal className="selected-work__feature">
          <div className="grid gap-4">
            <SutraHero />
            <div className="grid grid-cols-2 gap-4">
              {sutra.images.slice(1).map((image) => (
                <ShowcaseImage key={image.src} image={image} />
              ))}
            </div>
          </div>
          <div className="grid gap-5 border-b border-[var(--color-border)] py-7 sm:grid-cols-[1fr_auto] sm:items-start sm:py-9">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <h3 className="font-display text-3xl font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-4xl">
                  {sutra.title}
                </h3>
                {sutra.status ? (
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--color-gold)]">
                    {sutra.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 max-w-2xl leading-relaxed text-[var(--color-body)]">
                {sutra.summary}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Technologies">
                {sutra.tags.map((tag) => (
                  <li key={tag} className="font-mono text-[0.68rem] text-[var(--color-ink-muted)]">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      ) : null}

      <div className="divide-y divide-[var(--color-border)]">
        {projects.map((project, index) => (
          <Reveal key={project.id} className="py-9 sm:py-12 lg:py-14">
            <article className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
              <div className={`lg:col-span-7 ${index % 2 === 1 ? "lg:col-start-6" : ""}`}>
                <ShowcaseImage image={project.images[0]} />
              </div>
              <div
                className={`lg:col-span-5 ${index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.025em] text-[var(--color-ink)] sm:text-3xl">
                    {project.title}
                  </h3>
                  {project.status ? (
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[var(--color-gold)]">
                      {project.status}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 max-w-lg text-sm leading-[1.8] text-[var(--color-body)] sm:text-base">
                  {project.summary}
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Technologies">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="font-mono text-[0.68rem] text-[var(--color-ink-muted)]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
                <ProjectLinks links={project.links} />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
