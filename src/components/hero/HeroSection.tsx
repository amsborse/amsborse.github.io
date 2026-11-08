import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { profile } from "@/data/profile";
import { heroReducer, describeState, sampleRoute, type RouteSample } from "./simulation";
import { serviceById, type ServiceId } from "./topology";
import { parseHeroUrl } from "./heroUrlState";
import { qualityForViewport } from "./heroQuality";
import { HeroPlate, type PlateRendererKind } from "./HeroPlate";
import { HeroConsole } from "./HeroConsole";
import "./hero.css";

const HeroCanvas = lazy(() =>
  import("./HeroCanvas").then((module) => ({ default: module.HeroCanvas }))
);

export interface HeroProofPoint {
  value: string;
  label: string;
}

function HeroProofMark({ index }: { index: number }) {
  if (index === 0) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        aria-hidden="true"
      >
        <path d="m3 8 9-5 9 5-9 5-9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </svg>
    );
  }
  if (index === 1) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        aria-hidden="true"
      >
        <path d="m12 6-6 10m6-10 6 10M6 16h12" />
        <circle cx="12" cy="5" r="2.4" />
        <circle cx="5" cy="17" r="2.4" />
        <circle cx="19" cy="17" r="2.4" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      aria-hidden="true"
    >
      <path d="m12 2.8 9 5.1v8.2l-9 5.1-9-5.1V7.9l9-5.1Z" />
      <path d="M3.2 8 12 13l8.8-5M12 13v8.8" />
    </svg>
  );
}

export function HeroSection({ proofPoints }: { proofPoints: HeroProofPoint[] }) {
  const urlState = useMemo(
    () => parseHeroUrl(window.location.search, window.performance.now() / 1000),
    []
  );
  const [state, dispatch] = useReducer(heroReducer, urlState.state);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [canvasRequested, setCanvasRequested] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [renderer, setRenderer] = useState<"plate" | "webgl" | "static">("static");
  const [ready, setReady] = useState(false);
  const [lightMode, setLightMode] = useState(document.documentElement.dataset.theme === "light");
  const [reducedMotion, setReducedMotion] = useState(
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [quality, setQuality] = useState(qualityForViewport(window.innerWidth));
  const routeSample = useRef<RouteSample | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const inspectButtonRef = useRef<HTMLButtonElement>(null);
  const closePanelButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const currentTime = useCallback(
    () => urlState.fixedTime ?? window.performance.now() / 1000,
    [urlState.fixedTime]
  );
  const selectedService = state.selected ? serviceById(state.selected) : null;
  const headline = profile.heroStatement
    .split("—")[0]
    .trim()
    .replace(/[.!?]+$/, "");
  const words = headline.split(/\s+/);

  const plateMode = urlState.scene === "plate";
  const plateWebGL = useMemo(
    () => new URLSearchParams(window.location.search).get("heroWebGL") !== "off",
    []
  );

  useEffect(() => {
    if (plateMode) return;
    const timer = window.setTimeout(() => {
      if (new URLSearchParams(window.location.search).get("heroWebGL") === "off") {
        setCanvasFailed(true);
        setReady(true);
        return;
      }
      const supportCanvas = document.createElement("canvas");
      let supported = false;
      let context: WebGLRenderingContext | WebGL2RenderingContext | null = null;
      try {
        context = supportCanvas.getContext("webgl2") || supportCanvas.getContext("webgl");
        supported = Boolean(context);
      } catch {
        supported = false;
      }
      context?.getExtension("WEBGL_lose_context")?.loseContext();
      if (supported) {
        setReady(false);
        setCanvasRequested(true);
      } else {
        setCanvasFailed(true);
        setReady(true);
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [plateMode]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", updateMotion);
    const themeObserver = new MutationObserver(() => {
      setLightMode(document.documentElement.dataset.theme === "light");
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      motion.removeEventListener("change", updateMotion);
      themeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    rootRef.current?.setAttribute("data-hero-renderer", renderer);
    rootRef.current?.setAttribute("data-hero-ready", String(ready));
  }, [ready, renderer]);

  useEffect(() => {
    if (state.mode !== "request" && state.mode !== "recovering") {
      routeSample.current = null;
      return;
    }
    const update = () => {
      const now = currentTime();
      if (state.mode === "request" && state.route && state.startedAt !== null) {
        routeSample.current = sampleRoute(state.route, now - state.startedAt);
      } else {
        routeSample.current = null;
      }
      if (urlState.fixedTime === null) dispatch({ type: "tick", now });
    };
    update();
    if (urlState.fixedTime !== null) return;
    const timer = window.setInterval(update, 33);
    return () => window.clearInterval(timer);
  }, [currentTime, state.mode, state.route, state.startedAt, urlState.fixedTime]);

  useEffect(() => {
    if (!state.selected) return;
    window.requestAnimationFrame(() => closePanelButtonRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dispatch({ type: "select", id: null });
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [state.selected]);

  const openService = useCallback((id: ServiceId) => {
    const active = document.activeElement;
    returnFocusRef.current =
      active instanceof HTMLElement && active !== document.body ? active : inspectButtonRef.current;
    dispatch({ type: "select", id });
  }, []);

  const onCanvasReady = useCallback(() => {
    setRenderer("webgl");
    setReady(true);
    setCanvasFailed(false);
  }, []);
  const onCanvasFailure = useCallback(() => {
    setRenderer("static");
    setCanvasFailed(true);
    setCanvasRequested(false);
    setReady(true);
  }, []);
  const onCanvasContextLost = useCallback(() => {
    setRenderer("static");
    setReady(true);
  }, []);
  const onPlateStatus = useCallback(
    (kind: PlateRendererKind, isReady: boolean) => {
      setRenderer(kind);
      setCanvasFailed(kind === "static" && plateWebGL);
      if (isReady) setReady(true);
    },
    [plateWebGL]
  );
  const onHover = useCallback((id: ServiceId | null) => dispatch({ type: "hover", id }), []);
  const onStats = useCallback((calls: number, triangles: number) => {
    rootRef.current?.setAttribute("data-hero-drawcalls", String(calls));
    rootRef.current?.setAttribute("data-hero-triangles", String(triangles));
  }, []);
  const now = currentTime;

  return (
    <section
      ref={rootRef}
      className="hero-section"
      aria-labelledby="hero-heading"
      data-hero-renderer={renderer}
      data-hero-ready={String(ready)}
      data-hero-quality={quality}
      data-hero-fixed={String(urlState.fixedTime !== null)}
      data-hero-drawcalls="0"
      data-hero-triangles="0"
    >
      {plateMode && (
        <HeroPlate
          state={state}
          sampleRef={routeSample}
          lightMode={lightMode}
          reducedMotion={reducedMotion}
          fixedTime={urlState.fixedTime}
          webgl={plateWebGL}
          onHover={onHover}
          onSelect={openService}
          onStatus={onPlateStatus}
          onStats={onStats}
        />
      )}
      {!plateMode && (
        <div
          className={`hero-scene-backdrop ${renderer === "webgl" ? "hero-scene-backdrop-hidden" : ""}`}
          aria-hidden="true"
        >
          <img
            className="hero-static-art"
            src="/hero/hero-fallback.png"
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </div>
      )}
      {canvasRequested && !canvasFailed && (
        <Suspense fallback={null}>
          <HeroCanvas
            urlState={urlState}
            state={state}
            sampleRef={routeSample}
            lightMode={lightMode}
            reducedMotion={reducedMotion}
            onHover={onHover}
            onSelect={openService}
            onReady={onCanvasReady}
            onFailure={onCanvasFailure}
            onContextLost={onCanvasContextLost}
            onQualityChange={(low) =>
              setQuality(qualityForViewport(window.innerWidth, low ? 20 : 60))
            }
            onStats={onStats}
          />
        </Suspense>
      )}

      {!ready && (
        <div className="hero-loading" aria-live="polite">
          <span className="hero-loading-orbit" aria-hidden="true" />
          <span>Loading the system scene…</span>
          <span className="hero-loading-track">
            <span />
          </span>
        </div>
      )}

      <div className="hero-copy">
        <p className="hero-eyebrow">
          Engineer&nbsp;&nbsp;/&nbsp;&nbsp;Builder&nbsp;&nbsp;/&nbsp;&nbsp;Writer
        </p>
        <h1 id="hero-heading" className="hero-heading">
          <span className="hero-heading-line">{words[0]}</span>{" "}
          <span className="hero-heading-line">
            {words.slice(1).join(" ")}
            <span className="hero-period">.</span>
          </span>
        </h1>
        <p className="hero-body">
          At Microsoft I build AI governance and risk-detection systems at enterprise scale. On my
          own time I make calm, crafted software — and stay a student of how people think.
        </p>
        <div className="hero-actions">
          <a className="hero-primary-cta" href="#work">
            View work <span aria-hidden="true">→</span>
          </a>
          <Link to="/experience" className="hero-secondary-link">
            Experience
          </Link>
          <Link to="/resume" className="hero-secondary-link">
            Resume
          </Link>
        </div>

        <HeroConsole
          open={consoleOpen}
          onOpenChange={setConsoleOpen}
          failed={Boolean(state.failed)}
          caption={describeState(state)}
          inspectButtonRef={inspectButtonRef}
          onSend={() => dispatch({ type: "sendRequest", now: now() })}
          onInspect={openService}
          onFail={(id) => dispatch({ type: "fail", id, now: now() })}
          onRecover={() => dispatch({ type: "recover", now: now() })}
        />
      </div>

      <ul className="hero-proof-strip" aria-label="Engineering impact">
        {proofPoints.map((point, index) => (
          <li key={point.label}>
            <span className="hero-proof-mark">
              <HeroProofMark index={index} />
            </span>
            <span className="hero-proof-value">{point.value}</span>
            <span className="hero-proof-label">{point.label}</span>
          </li>
        ))}
      </ul>

      <a className="hero-scroll-cue" href="#work" aria-label="Scroll to selected work">
        <span aria-hidden="true" />
      </a>

      {selectedService && (
        <aside
          className="hero-info-panel"
          role="dialog"
          aria-labelledby="hero-info-title"
          data-testid="hero-info-panel"
        >
          <button
            ref={closePanelButtonRef}
            className="hero-info-close"
            type="button"
            aria-label="Close service details"
            onClick={() => {
              dispatch({ type: "select", id: null });
              window.requestAnimationFrame(() => returnFocusRef.current?.focus());
            }}
          >
            ×
          </button>
          <p className="hero-panel-eyebrow">Service · {selectedService.orbit}</p>
          <h2 id="hero-info-title">{selectedService.name}</h2>
          <p>{selectedService.responsibility}</p>
          <dl>
            <dt>Inputs</dt>
            <dd>{selectedService.inputs.join(" · ")}</dd>
            <dt>Outputs</dt>
            <dd>{selectedService.outputs.join(" · ")}</dd>
            <dt>Engineering concept</dt>
            <dd>
              <strong>{selectedService.concept.name}</strong> — {selectedService.concept.detail}
            </dd>
            <dt>On failure</dt>
            <dd>{selectedService.onFailure}</dd>
          </dl>
        </aside>
      )}

      {renderer === "static" && canvasFailed && (
        <p className="sr-only" role="status">
          WebGL is unavailable. Showing the static hero artwork.
        </p>
      )}
      <output className="sr-only" data-hero-quality-state={quality}>
        {quality === "low"
          ? "Reduced detail"
          : quality === "medium"
            ? "Balanced detail"
            : "Full detail"}
      </output>
    </section>
  );
}
