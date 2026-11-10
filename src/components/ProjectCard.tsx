import { projectCategories, type Project } from "@/data";
import "@/components/projects/projects.css";

/** A compact project index entry that opens into its existing case-file details. */
export function ProjectCard({ project }: { project: Project }) {
  const category =
    projectCategories.find((item) => item.id === project.category)?.label ?? project.category;

  return (
    <details className="project-case">
      <summary className="project-case__summary">
        <span className="project-case__copy">
          <span className="project-case__heading">
            <span className="project-case__title" role="heading" aria-level={3}>
              {project.title}
            </span>
            <span className="project-case__category">{category}</span>
          </span>
          <span className="project-case__one-line">{project.summary}</span>
        </span>
        <span className="project-case__toggle" aria-hidden="true">
          <span className="project-case__toggle-label">Case file</span>
          <span className="project-case__chevron" />
        </span>
      </summary>

      <div className="project-case__body">
        <div className="project-case__details">
          <section>
            <h4>Problem</h4>
            <p>{project.problem}</p>
          </section>
          <section>
            <h4>Impact</h4>
            <p>{project.impact}</p>
          </section>
          <section>
            <h4>Stack</h4>
            <ul className="project-architecture">
              {project.stack.map((part) => (
                <li className="project-architecture__node" key={part}>
                  {part}
                </li>
              ))}
            </ul>
          </section>
        </div>
        {project.links.length > 0 ? (
          <div className="project-case__links" aria-label={`${project.title} links`}>
            {project.links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label} <span aria-hidden="true">→</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}
