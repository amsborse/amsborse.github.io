import { useId, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion, useScroll } from "framer-motion";
import type { ExperienceEntry } from "@/data";
import { splitExperienceSummary } from "./experience-summary";
import "./experience-timeline.css";

type ExperienceTimelineProps = { entries: ExperienceEntry[] };

export function ExperienceTimeline({ entries }: ExperienceTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 70%", "end 70%"],
  });
  const reducedMotion = useReducedMotion();

  return (
    <section className="experience-timeline" aria-labelledby="experience-timeline-heading">
      <h2 id="experience-timeline-heading" className="sr-only">
        Timeline of roles
      </h2>
      <div ref={timelineRef} className="experience-timeline__track">
        <span className="experience-timeline__rail" aria-hidden="true" />
        <motion.span
          className="experience-timeline__current"
          aria-hidden="true"
          style={{ scaleY: reducedMotion ? 1 : scrollYProgress, originY: 0 }}
        />
        <ol className="experience-timeline__list">
          {entries.map((entry) => (
            <TimelineStop key={entry.id} entry={entry} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function TimelineStop({ entry }: { entry: ExperienceEntry }) {
  const stopRef = useRef<HTMLLIElement>(null);
  const lit = useInView(stopRef, { once: true, amount: 0.18 });
  const major = entry.id === "microsoft" || entry.id === "amazon";
  const { description, technologies } = splitExperienceSummary(entry.summary);

  return (
    <li
      ref={stopRef}
      className={`experience-stop${major ? " experience-stop--major" : ""}${lit ? " is-lit" : ""}`}
    >
      <div className="experience-stop__date" aria-label={`${entry.start} to ${entry.end}`}>
        <span>{entry.start}</span>
        <span aria-hidden="true">—</span>
        <span>{entry.end}</span>
      </div>
      <span className="experience-stop__lantern" aria-hidden="true">
        <span />
      </span>
      <article className="experience-stop__content">
        <header className="experience-stop__header">
          <div>
            <h3 className="experience-stop__title">{entry.title}</h3>
            <p className="experience-stop__company">{entry.company}</p>
          </div>
          <p className="experience-stop__location">{entry.location}</p>
        </header>

        <p className="experience-stop__summary">{description}</p>
        {technologies.length > 0 ? (
          <ul className="experience-stop__technologies" aria-label="Technologies">
            {technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        ) : null}

        {major ? <SystemSketch entry={entry} /> : null}
        <Outcomes entry={entry} />
      </article>
    </li>
  );
}

function Outcomes({ entry }: { entry: ExperienceEntry }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const visible = entry.achievements.slice(0, 3);
  const additional = entry.achievements.slice(3);

  return (
    <div className="experience-outcomes">
      <h4 className="experience-outcomes__label">Outcomes</h4>
      <ul className="experience-outcomes__list">
        {visible.map((achievement) => (
          <li key={achievement}>{emphasizeFigure(achievement)}</li>
        ))}
      </ul>
      {additional.length > 0 ? (
        <>
          <button
            type="button"
            className="experience-outcomes__toggle"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? "Show fewer outcomes"
              : `Show ${additional.length} more ${additional.length === 1 ? "outcome" : "outcomes"}`}
          </button>
          <div
            id={id}
            role="region"
            aria-labelledby={`${id}-label`}
            aria-hidden={!expanded}
            className={`experience-outcomes__disclosure${expanded ? " is-open" : ""}`}
          >
            <div className="experience-outcomes__disclosure-inner">
              <h5 id={`${id}-label`} className="sr-only">
                Additional outcomes for {entry.company}
              </h5>
              <ul className="experience-outcomes__list">
                {additional.map((achievement) => (
                  <li key={achievement}>{emphasizeFigure(achievement)}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

type Sketch = {
  /** Index of the single achievement this sketch restates; nothing else is drawn. */
  achievement: number;
  source: { value: string; label: string };
  service: { value: string; label: string };
  lanes: { count: number; label: string };
  result?: { value: string; label: string };
};

/** Each sketch pictures one sentence from the role's outcomes, in that sentence's own terms. */
const sketches: Record<string, Sketch> = {
  microsoft: {
    achievement: 3,
    source: { value: "135K+", label: "security signals a day" },
    service: { value: "AI-agent ingestion", label: "event-driven pipeline" },
    lanes: { count: 28, label: "Azure regions, regionally isolated" },
  },
  amazon: {
    achievement: 2,
    source: { value: "200K+", label: "order events a day" },
    service: { value: "AWS Step Functions", label: "stateful replay service" },
    lanes: { count: 3, label: "regions" },
    result: { value: "13%", label: "more restocked-item sales" },
  },
};

function SystemSketch({ entry }: { entry: ExperienceEntry }) {
  const sketchRef = useRef<HTMLElement>(null);
  const onScreen = useInView(sketchRef, { once: false, amount: 0.35 });
  const sketch = sketches[entry.id];
  const sentence = sketch ? entry.achievements[sketch.achievement] : undefined;
  if (!sketch || !sentence) return null;

  return (
    <figure
      ref={sketchRef}
      className={`experience-sketch${onScreen ? " is-moving" : ""}`}
      role="img"
      aria-label={`Diagram of one outcome: ${sentence}`}
    >
      <div className="experience-sketch__flow" aria-hidden="true">
        <div className="experience-sketch__node">
          <span className="experience-sketch__value">{sketch.source.value}</span>
          <span className="experience-sketch__label">{sketch.source.label}</span>
        </div>
        <span className="experience-sketch__edge" />
        <div className="experience-sketch__node experience-sketch__node--service">
          <span className="experience-sketch__value">{sketch.service.value}</span>
          <span className="experience-sketch__label">{sketch.service.label}</span>
        </div>
        <span className="experience-sketch__edge" />
        <div className="experience-sketch__node">
          <span className="experience-sketch__lanes">
            {Array.from({ length: sketch.lanes.count }, (_, index) => (
              <i key={index} />
            ))}
          </span>
          <span className="experience-sketch__label">
            {sketch.lanes.count > 9 ? `${sketch.lanes.count} ` : ""}
            {sketch.lanes.label}
          </span>
        </div>
        {sketch.result ? (
          <>
            <span className="experience-sketch__edge" />
            <div className="experience-sketch__node experience-sketch__node--result">
              <span className="experience-sketch__value">{sketch.result.value}</span>
              <span className="experience-sketch__label">{sketch.result.label}</span>
            </div>
          </>
        ) : null}
      </div>
    </figure>
  );
}

const figurePattern = /\$\d[\d,.]*[KMB]?\+?|\d[\d,]*(?:\.\d+)?(?:[KMB]\+?|%|\+)/g;

/** Bolds only real metrics (a currency, K/M/B, percent or "+" figure), never bare counts or versions. */
function emphasizeFigure(achievement: string) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of achievement.matchAll(figurePattern)) {
    parts.push(achievement.slice(cursor, match.index));
    parts.push(
      <strong key={match.index} className="experience-outcomes__figure">
        {match[0]}
      </strong>
    );
    cursor = match.index + match[0].length;
  }
  if (parts.length === 0) return achievement;
  parts.push(achievement.slice(cursor));
  return <>{parts}</>;
}
