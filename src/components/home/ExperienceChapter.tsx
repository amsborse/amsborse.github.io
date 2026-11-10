import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { experience } from "@/data";
import { ChapterHeading } from "./ChapterHeading";
import { splitExperienceSummary } from "@/components/experience/experience-summary";

const majorIds = ["microsoft", "amazon"];
const stops = experience.filter((entry) => majorIds.includes(entry.id));
const earlier = experience.length - stops.length;

/** The two major stops on the path, in the site's own words, with the full timeline one link away. */
export function ExperienceChapter() {
  const reduce = useReducedMotion();

  return (
    <section id="experience" aria-labelledby="experience-title" className="chapter article-shell">
      <ChapterHeading id="experience-title" eyebrow="Experience" title="The path so far.">
        AI governance and risk detection at Microsoft, after six years building large-scale services
        at Amazon.
      </ChapterHeading>

      <ol className="path">
        {stops.map((entry, index) => {
          const { description: lead, technologies: tech } = splitExperienceSummary(entry.summary);
          return (
            <motion.li
              key={entry.id}
              className="path__stop"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="path__lantern" aria-hidden="true" />
              <p className="path__dates">
                {entry.start} to {entry.end}
                <span aria-hidden="true"> · </span>
                {entry.location}
              </p>
              <h3 className="path__role">
                {entry.title}, <span className="path__company">{entry.company}</span>
              </h3>
              <p className="path__lead">{lead}.</p>
              {entry.achievements[0] ? (
                <p className="path__outcome">{entry.achievements[0]}</p>
              ) : null}
              {tech.length > 0 ? <p className="path__tech">{tech.join(" · ")}</p> : null}
            </motion.li>
          );
        })}
      </ol>

      <p className="chapter-more">
        <Link to="/experience" className="chapter-link">
          Read the full timeline
          <span aria-hidden="true">→</span>
        </Link>
        <span className="chapter-more__note">
          {stops.reduce((sum, entry) => sum + entry.achievements.length, 0)} outcomes across these
          two roles
          {earlier > 0 ? `, and ${earlier} earlier ${earlier === 1 ? "role" : "roles"}` : ""}.
        </span>
      </p>
    </section>
  );
}
