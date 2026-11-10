import { lazy, Suspense, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import "./page-stage.css";

/** Motifs the earlier line-art stage knows how to draw. */
export type PageMotif = "about" | "experience" | "writing" | "learning" | "contact";
/** Every chapter that opens with a plate from the island world. */
export type StageMotif = PageMotif | "projects";

const ClassicPageStage = lazy(() =>
  import("./ClassicPageStage").then((module) => ({ default: module.ClassicPageStage }))
);

/** Generated art plates, one scene per chapter, each lit separately for night and dawn. */
const plates: Record<StageMotif, string> = {
  about: "about",
  experience: "experience",
  projects: "projects",
  writing: "writing",
  learning: "learning",
  contact: "contact",
};

type Theme = "dark" | "light";

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const readTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

/** The site theme, read from the document so the stage also works outside the theme provider. */
export function useDocumentTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, readTheme, () => "dark");
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
/** The reader's reduced-motion setting, kept current while the page is open. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false
  );
}

const wantsClassicStage = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("stage") === "classic";

type StageProps = {
  motif: StageMotif;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
  count?: number;
};

export function PageStage(props: StageProps) {
  if (wantsClassicStage()) {
    const motif: PageMotif = props.motif === "projects" ? "learning" : props.motif;
    return (
      <Suspense fallback={<PlateStage {...props} />}>
        <ClassicPageStage {...props} motif={motif} />
      </Suspense>
    );
  }
  return <PlateStage {...props} />;
}

function PlateStage({ motif, eyebrow, title, lede, children, count = 0 }: StageProps) {
  const stage = useRef<HTMLElement>(null);
  const theme = useDocumentTheme();
  // Follows the system setting live, so turning reduced motion on mid-visit stills the stage.
  const still = usePrefersReducedMotion();
  useStageLife(stage, still);
  const base = `${import.meta.env.BASE_URL}assets/cinematic/${plates[motif]}/${plates[motif]}-${theme}`;
  return (
    <section
      ref={stage}
      className={`page-stage page-stage--${motif}`}
      data-renderer="static"
      data-gate-count={motif === "experience" ? count : undefined}
    >
      <div className="page-stage__static" aria-hidden="true">
        <div className="page-stage__plate">
          <picture key={theme}>
            <source media="(max-width: 720px)" srcSet={`${base}-960.webp`} />
            <img
              className="page-stage__art"
              src={`${base}.webp`}
              alt=""
              width={1672}
              height={941}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <span className="page-stage__glow" />
        </div>
        <span className="page-stage__mist" />
      </div>
      <div className="page-stage__copy">
        <p className="page-stage__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede ? <div className="page-stage__lede">{lede}</div> : null}
        {children ? <div className="page-stage__links">{children}</div> : null}
      </div>
    </section>
  );
}

/**
 * Runs the stage's live layers only while it is on screen, and lets the plate lean a few pixels
 * toward the pointer. Reduced motion and touch devices keep the plate still.
 */
function useStageLife(stage: React.RefObject<HTMLElement | null>, still: boolean) {
  useEffect(() => {
    const element = stage.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (still) return;

    let onScreen = false;
    const sync = () => {
      element.dataset.live = String(onScreen && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    const step = () => {
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      element.style.setProperty("--lean-x", x.toFixed(4));
      element.style.setProperty("--lean-y", y.toFixed(4));
      frame =
        Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const onPointer = (event: PointerEvent) => {
      if (!onScreen) return;
      targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      targetY = (event.clientY / window.innerHeight - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(step);
    };
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(frame);
      delete element.dataset.live;
      element.style.removeProperty("--lean-x");
      element.style.removeProperty("--lean-y");
    };
  }, [stage, still]);
}
