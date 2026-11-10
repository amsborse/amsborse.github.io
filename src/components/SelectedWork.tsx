import { Link } from "react-router-dom";
import { ProjectChapterReveal } from "@/components/projects/ProjectChapterReveal";
import { SutraHero } from "@/components/sutra/SutraHero";
import { showcase } from "@/data";
import { useTheme } from "@/theme/ThemeProvider";
import "@/components/projects/projects.css";

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
      className={`showcase-image ${className}`}
      style={{ aspectRatio: `${image.width} / ${image.height}` }}
    >
      <img
        src={src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

function ProjectLinks({ links }: { links: (typeof showcase)[number]["links"] }) {
  if (links.length === 0) return null;

  return (
    <div className="showcase-links">
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
          {link.label} <span aria-hidden="true">→</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

function ShowcaseChapter({
  project,
  index,
}: {
  project: (typeof showcase)[number];
  index: number;
}) {
  const isSutra = project.id === "sutra";
  const image = project.images[0];
  const rest = project.images.slice(1);

  return (
    <ProjectChapterReveal
      className={`showcase-chapter${isSutra ? " showcase-chapter--sutra" : ""}`}
    >
      {isSutra ? (
        <div className="showcase-chapter__sutra-visual">
          <SutraHero />
          <div className="showcase-chapter__image-pair">
            {rest.map((item) => (
              <ShowcaseImage key={item.src} image={item} />
            ))}
          </div>
        </div>
      ) : (
        <div className={`showcase-chapter__visual showcase-chapter__visual--${index % 3}`}>
          <ShowcaseImage image={image} />
        </div>
      )}

      <article className="showcase-chapter__copy">
        <div className="showcase-chapter__heading">
          <h3>{project.title}</h3>
          {project.status ? <p>{project.status}</p> : null}
        </div>
        <p className="showcase-chapter__summary">{project.summary}</p>
        <ul className="showcase-chapter__stack" aria-label={`${project.title} technologies`}>
          {project.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
        <ProjectLinks links={project.links} />
      </article>
    </ProjectChapterReveal>
  );
}

export function SelectedWork({ embedded = false }: { embedded?: boolean }) {
  return (
    <section
      aria-labelledby="selected-work-title"
      className={embedded ? "selected-work" : "article-shell max-w-6xl selected-work"}
    >
      <div className="selected-work__intro">
        <div>
          <p>A few things I’ve been building</p>
          <h2 id="selected-work-title">Selected work</h2>
        </div>
        {embedded ? null : (
          <Link to="/projects">
            Project archive <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      <div className="showcase-chapters">
        {showcase.map((project, index) => (
          <ShowcaseChapter key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
