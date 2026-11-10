import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import "./chapter-rail.css";

export type RailChapter = { id: string; label: string };

/** Past this many stops the rail compresses so every stop fits the viewport. */
const DENSE_AFTER = 10;

/**
 * The current, as navigation: a thin line of lantern light on the right edge that fills as
 * the page (or one element of it) is read, with one stop per chapter. Every stop is a plain
 * in-page link, so any chapter is one click away without watching anything.
 *
 * - `activeId` lets a page that already tracks its sections drive the highlight; without it
 *   the rail marks whichever chapter crosses the middle of the viewport.
 * - `progressTargetId` ties the fill to one element (an article body) instead of the page.
 */
export function ChapterRail({
  chapters,
  label = "Chapters on this page",
  activeId,
  progressTargetId,
  className,
}: {
  chapters: readonly RailChapter[];
  label?: string;
  activeId?: string;
  progressTargetId?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const target = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    target.current = progressTargetId ? document.getElementById(progressTargetId) : null;
  }, [progressTargetId]);
  const { scrollYProgress } = useScroll(
    progressTargetId ? { target, offset: ["start 25%", "end 75%"] } : undefined
  );
  const eased = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const [observed, setObserved] = useState(chapters[0]?.id);
  const tracksItself = activeId === undefined;

  useEffect(() => {
    if (!tracksItself || typeof IntersectionObserver === "undefined") return;
    const sections = chapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;
    // A chapter is current while it crosses the middle band of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setObserved(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [chapters, tracksItself]);

  const active = tracksItself ? observed : activeId;
  const dense = chapters.length > DENSE_AFTER;

  return (
    <nav
      className={className ? `chapter-rail ${className}` : "chapter-rail"}
      aria-label={label}
      data-dense={dense || undefined}
      style={{ "--rail-count": chapters.length } as CSSProperties}
    >
      <span className="chapter-rail__track" aria-hidden="true">
        <motion.span
          className="chapter-rail__current"
          style={{ scaleY: reduce ? scrollYProgress : eased }}
        />
      </span>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              className="chapter-rail__stop"
              aria-current={active === chapter.id ? "location" : undefined}
              title={dense ? chapter.label : undefined}
            >
              <span className="chapter-rail__label">{chapter.label}</span>
              <span className="chapter-rail__dot" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
