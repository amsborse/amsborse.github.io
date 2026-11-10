import { useEffect, useRef, type ReactNode } from "react";
import { writingCategories } from "@/data/writingCategories";

/** Still by default: observer support progressively enables a single entrance. */
export function ReadingReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const show = () => {
      element.dataset.reveal = "visible";
      observer?.disconnect();
    };
    if (!media.matches) {
      // Never hide content already in the reader's viewport after the initial paint.
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.dataset.reveal = "waiting";
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) show();
        },
        { threshold: 0.05 }
      );
      observer.observe(element);
    }
    const onMotionChange = () => {
      if (media.matches) show();
    };
    media.addEventListener("change", onMotionChange);
    return () => {
      observer?.disconnect();
      media.removeEventListener("change", onMotionChange);
      delete element.dataset.reveal;
    };
  }, []);
  return (
    <div className="reading-reveal" ref={ref}>
      {children}
    </div>
  );
}

const stars = [
  [22, 62],
  [75, 31],
  [123, 69],
  [169, 24],
  [217, 59],
  [267, 35],
  [307, 75],
];

export function ThemeConstellation({ selected }: { selected: string | null }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    let visible = false;
    const sync = () => {
      element.dataset.live = String(visible && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return (
    <svg ref={ref} className="reading-constellation" viewBox="0 0 330 100" aria-hidden="true">
      <g className="reading-constellation__drift">
        <path d="M22 62 75 31 123 69 169 24 217 59 267 35 307 75M75 31 169 24 267 35M123 69 217 59" />
        {writingCategories.map((category, index) => (
          <g key={category.id} data-selected={selected === category.id}>
            <circle
              className="reading-constellation__halo"
              cx={stars[index][0]}
              cy={stars[index][1]}
              r="10"
            />
            <circle
              cx={stars[index][0]}
              cy={stars[index][1]}
              r={selected === category.id ? 3.5 : 2}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
