import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { homeChapters } from "./chapters";

/**
 * The current, as navigation: a thin line of lantern light on the right edge that
 * fills as the page is read, with one stop per chapter. Every stop is a plain
 * in-page link, so any chapter is one click away without watching anything.
 */
export function ChapterRail() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const eased = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const [active, setActive] = useState(homeChapters[0].id);

  useEffect(() => {
    const sections = homeChapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;
    // A chapter is current while it crosses the middle band of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="chapter-rail" aria-label="Chapters on this page">
      <span className="chapter-rail__track" aria-hidden="true">
        <motion.span
          className="chapter-rail__current"
          style={{ scaleY: reduce ? scrollYProgress : eased }}
        />
      </span>
      <ol>
        {homeChapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              className="chapter-rail__stop"
              aria-current={active === chapter.id ? "location" : undefined}
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
