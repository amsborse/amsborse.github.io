import { Link } from "react-router-dom";
import { ExperienceTimeline } from "@/components/experience/ExperienceTimeline";
import { Seo } from "@/components/Seo";
import { PageStage } from "@/components/stage/PageStage";
import { experience } from "@/data";

export default function ExperiencePage() {
  return (
    <>
      <Seo
        title="Experience"
        description="Work history, roles, and selected achievements — Akshay Borse."
        path="/experience"
      />

      <div className="article-shell max-w-6xl page-top pb-16 sm:pb-20 lg:pb-24">
        <PageStage
          motif="experience"
          eyebrow="Experience"
          title="Work history"
          count={experience.length}
          lede={
            <>
              Roles and selected achievements. The full résumé is available as a{" "}
              <Link
                to="/resume"
                className="text-[var(--color-ink)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                PDF and interactive view
              </Link>
              .
            </>
          }
        />
        <ExperienceTimeline entries={experience} />
      </div>
    </>
  );
}
