import { Link } from "react-router-dom";
import { ContentInteractiveCard } from "@/components/InteractiveCard";
import { ProjectChapterReveal } from "@/components/projects/ProjectChapterReveal";
import { SutraHero } from "@/components/sutra/SutraHero";
import { showcase } from "@/data";
import "@/components/projects/projects.css";

// Two quiet strokes per project: an ink structure and an amber thread.
const emblems: Record<string, { ink: string; thread: string }> = {
  sutra: {
    ink: "M20 32a4 4 0 1 0-8 0 4 4 0 1 0 8 0 M52 32a4 4 0 1 0-8 0 4 4 0 1 0 8 0 M84 32a4 4 0 1 0-8 0 4 4 0 1 0 8 0",
    thread: "M4 40C22 40 22 16 34 20S42 44 56 40 70 24 92 24",
  },
  "invisible-loops": {
    ink: "M56 14H76L86 24V52H56V14 M76 14V24H86 M64 33H78 M64 41H74",
    thread: "M56 38C44 54 16 52 14 34S40 12 42 28 26 44 26 32 44 26 56 20",
  },
  "thought-loop-explorer": {
    ink: "M48 50V34 M22 25V34H74V25 M48 34V15 M18 21a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M70 21a4 4 0 1 0 8 0 4 4 0 1 0-8 0",
    thread: "M44 11a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M38 53H58",
  },
  "ambient-tv-home": {
    ink: "M10 46H86 M22 53H74",
    thread: "M57 10A15 15 0 1 0 64 35 17 17 0 0 1 57 10Z",
  },
  "karma-simulator": {
    ink: "M24 20L46 30 72 16 M46 30L66 48 M46 30L20 48 M24 20L20 48 M72 16L66 48 M20 48H66",
    thread:
      "M20 20a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M42 30a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M68 16a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M16 48a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M62 48a4 4 0 1 0 8 0 4 4 0 1 0-8 0",
  },
  careeros: {
    ink: "M15 43C2 30 29 10 55 12S94 29 77 43 44 58 30 50",
    thread:
      "M12 45C32 45 31 25 48 25S65 35 84 15 M9 45a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M45 25a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M81 15a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  },
};

function ProjectEmblem({ id }: { id: string }) {
  const emblem = emblems[id];
  if (!emblem) return null;
  return (
    <svg
      className="showcase-emblem"
      viewBox="0 0 96 64"
      width="96"
      height="64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={emblem.ink} />
      <path className="showcase-emblem__thread" d={emblem.thread} pathLength="1" />
    </svg>
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

function ShowcaseCard({ project, index }: { project: (typeof showcase)[number]; index: number }) {
  return (
    <ProjectChapterReveal className="showcase-grid__item">
      <ContentInteractiveCard className="showcase-card" index={index}>
        <article className="showcase-card__body" aria-labelledby={`showcase-${project.id}`}>
          <div className="showcase-card__signature">
            <ProjectEmblem id={project.id} />
            {project.status ? <p className="showcase-card__status">{project.status}</p> : null}
          </div>
          <h3 id={`showcase-${project.id}`}>{project.title}</h3>
          <p className="showcase-card__summary">{project.summary}</p>
          <ul className="showcase-card__stack" aria-label={`${project.title} technologies`}>
            {project.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
          <ProjectLinks links={project.links} />
        </article>
      </ContentInteractiveCard>
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

      <ProjectChapterReveal className="selected-work__feature">
        <SutraHero />
      </ProjectChapterReveal>

      <div className="showcase-grid">
        {showcase.map((project, index) => (
          <ShowcaseCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
