import { useMemo, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { PageStage } from "@/components/stage/PageStage";
import { Seo } from "@/components/Seo";
import { SelectedWork } from "@/components/SelectedWork";
import { EarlierWork } from "@/components/EarlierWork";
import { projectCategories, projects, type ProjectCategory } from "@/data";
import { ARSENAL_HUB_SECTIONS } from "@/data/arsenalTopics";
import "@/components/projects/projects.css";

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectCategory | "labs" | "all">("all");

  const showProjects = filter !== "labs";
  const showLabs = filter === "all" || filter === "labs";

  const filteredProjects = useMemo(() => {
    if (filter === "all" || filter === "labs") return projects;
    return projects.filter((project) => project.category === filter);
  }, [filter]);

  const featured = filteredProjects.filter((project) => project.featured);
  const other = filteredProjects.filter((project) => !project.featured);
  const filters: { id: ProjectCategory | "labs" | "all"; label: string }[] = [
    { id: "all", label: "All" },
    ...projectCategories
      .filter((category) => projects.some((project) => project.category === category.id))
      .map((category) => ({ id: category.id, label: category.label })),
    { id: "labs", label: "Visual labs" },
  ];

  return (
    <>
      <Seo
        title="Projects & Systems Arsenal"
        description="Engineering projects, architecture builds, distributed systems tools, and interactive visual labs by Akshay Borse."
        path="/projects"
      />

      <div className="article-shell max-w-[1440px] page-top pb-16 sm:pb-20 lg:pb-24">
        <PageStage
          motif="projects"
          eyebrow="Projects"
          title="Projects & Systems Arsenal"
          lede="Software builds, product systems, interactive labs, and algorithm visualizers."
        />

        <div className="mb-16">
          <SelectedWork embedded />
        </div>

        <nav className="project-filters" aria-label="Filter projects">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className="project-filter"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {showProjects ? (
          <>
            <section aria-labelledby="featured-projects-title" className="project-section">
              <h2 id="featured-projects-title" className="project-section__title">
                Featured projects
              </h2>
              {featured.length === 0 ? (
                <p className="project-empty-state">
                  No projects in this category. Try “All” or another filter.
                </p>
              ) : (
                <div className="project-case-list">
                  {featured.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </section>

            {other.length > 0 ? (
              <section aria-labelledby="other-projects-title" className="project-section">
                <h2 id="other-projects-title" className="project-section__title">
                  Other engineering builds
                </h2>
                <div className="project-case-list">
                  {other.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {showLabs ? (
          <section id="arsenal" aria-labelledby="arsenal-title" className="project-section">
            <h2 id="arsenal-title" className="project-section__title">
              Systems arsenal & interactive labs
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-body)]">
              Interactive WebGL visualizers, neural meshes, roadmaps, and system sandboxes.
            </p>
            <div className={`mt-8 ${HUB_CARD_GRID}`}>
              {ARSENAL_HUB_SECTIONS.map((topic, index) => (
                <LearningInteractiveCard
                  key={topic.id}
                  topic={topic}
                  index={index}
                  viewStyle="nodes"
                />
              ))}
            </div>
          </section>
        ) : null}

        {filter === "all" ? <EarlierWork /> : null}
      </div>
    </>
  );
}
