import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import {
  IDENTITY_POSE,
  cameraTarget,
  poseSettled,
  springStep,
  stageTransform,
  type CameraPose,
} from "./plateCamera";
import { createPlateRenderer, MODULE_COUNT, type PlateFrame, type PlateRenderer } from "./plateGL";
import {
  edgeCurve,
  fitPlate,
  PLATE_H,
  PLATE_MODULES,
  PLATE_W,
  platePercent,
  type PlatePoint,
} from "./plateMap";
import { dimmedEdges, type HeroState, type RouteSample } from "./simulation";
import { EDGES, SERVICES, dependenciesOf, edgeById, type ServiceId } from "./topology";

export type PlateRendererKind = "plate" | "static";

interface HeroPlateProps {
  state: HeroState;
  sampleRef: MutableRefObject<RouteSample | null>;
  lightMode: boolean;
  reducedMotion: boolean;
  fixedTime: number | null;
  webgl: boolean;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
  onStatus: (renderer: PlateRendererKind, ready: boolean) => void;
  onStats: (calls: number, triangles: number) => void;
}

/** Callout anchors in plate px; `side` says which way the label extends from the anchor. */
const CALLOUTS: Record<ServiceId, PlatePoint & { side: "left" | "right" }> = {
  gateway: { x: 868, y: 178, side: "left" },
  policy: { x: 1378, y: 146, side: "right" },
  ingest: { x: 900, y: 600, side: "left" },
  orchestrator: { x: 860, y: 470, side: "left" },
  inference: { x: 1446, y: 350, side: "right" },
  storage: { x: 1300, y: 660, side: "right" },
  observability: { x: 1400, y: 556, side: "right" },
};
const IDLE_CALLOUTS: readonly ServiceId[] = ["gateway", "policy", "inference", "observability"];

/** Small line icons for the callouts, drawn in the same stroke style as the proof strip. */
function CalloutIcon({ id }: { id: ServiceId }) {
  const paths: Record<ServiceId, string> = {
    gateway: "m3 8 9-5 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
    policy:
      "m12 6-6 10m6-10 6 10M6 16h12M14.4 5a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0ZM7.4 17a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0ZM21.4 17a2.4 2.4 0 1 1-4.8 0 2.4 2.4 0 0 1 4.8 0Z",
    ingest: "M4 6h16M4 12h10M4 18h6M17 14l3 3-3 3",
    orchestrator: "M12 3v4M12 17v4M3 12h4M17 12h4M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    inference: "M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z",
    storage:
      "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
    observability: "M4 20V12M9 20V6M14 20v-9M19 20V9M3 20h18",
  };
  return (
    <svg
      className="hero-plate-callout-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[id]} />
    </svg>
  );
}

function curvePoint(edgeId: string, t: number, out: Float32Array) {
  const edge = edgeById(edgeId);
  const { a, b, c } = edgeCurve(edge.from, edge.to);
  const u = 1 - t;
  out[0] = u * u * a.x + 2 * u * t * c.x + t * t * b.x;
  out[1] = u * u * a.y + 2 * u * t * c.y + t * t * b.y;
}

const curvePath = (from: ServiceId, to: ServiceId) => {
  const { a, b, c } = edgeCurve(from, to);
  return `M${a.x} ${a.y}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x} ${b.y}`;
};

type RouteKind = "route" | "blocked" | "dimmed" | "fallback" | "dependency" | "recovery";

/** Which paths to draw for the current state. Changes only on state changes, never per frame. */
function routesFor(state: HeroState): { id: string; d: string; kind: RouteKind }[] {
  const out = new Map<string, { id: string; d: string; kind: RouteKind }>();
  const add = (edgeId: string, kind: RouteKind) => {
    if (out.has(edgeId)) return;
    const edge = edgeById(edgeId);
    out.set(edgeId, { id: edgeId, d: curvePath(edge.from, edge.to), kind });
  };
  if (state.mode === "request" && state.route) {
    for (const hop of state.route.hops)
      add(hop.edgeId, hop.status === "blocked" ? "blocked" : "route");
  }
  if (state.failed) {
    for (const edgeId of dimmedEdges(state.failed)) add(edgeId, "dimmed");
    for (const edge of EDGES) if (edge.replaces === state.failed) add(edge.id, "fallback");
  }
  if (state.mode === "recovering" && state.recovering) {
    for (const edge of EDGES) {
      if (edge.kind === "fallback") continue;
      if (edge.from === state.recovering || edge.to === state.recovering) add(edge.id, "recovery");
    }
  }
  const focus = state.hovered ?? (state.mode === "idle" ? state.selected : null);
  if (focus) {
    const { upstream, downstream } = dependenciesOf(focus);
    for (const edge of EDGES) {
      if (edge.kind === "fallback" || edge.kind === "telemetry") continue;
      const touches =
        (edge.to === focus && upstream.includes(edge.from)) ||
        (edge.from === focus && downstream.includes(edge.to));
      if (touches) add(edge.id, "dependency");
    }
  }
  return [...out.values()];
}

const MAX_CANVAS_WIDTH = 2400;

export function HeroPlate({
  state,
  sampleRef,
  lightMode,
  reducedMotion,
  fixedTime,
  webgl,
  onHover,
  onSelect,
  onStatus,
  onStats,
}: HeroPlateProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PlateRenderer | null>(null);
  const drawRef = useRef<(now: number) => void>(() => {});
  const fitRef = useRef<{ fit: ReturnType<typeof fitPlate>; width: number; height: number } | null>(
    null
  );
  const poseRef = useRef<CameraPose>({ ...IDENTITY_POSE });
  const applyCameraRef = useRef<() => void>(() => {});
  const kickCameraRef = useRef<() => void>(() => {});
  const live = useRef({ state, lightMode, reducedMotion, fixedTime });
  live.current = { state, lightMode, reducedMotion, fixedTime };
  const theme = lightMode ? "light" : "dark";
  const routes = useMemo(() => routesFor(state), [state]);
  const callouts = useMemo(() => {
    // The info panel already names the selected service and sits over the right of the plate.
    if (state.selected) return [];
    const ids = new Set<ServiceId>(state.mode === "idle" ? IDLE_CALLOUTS : []);
    if (state.hovered) ids.add(state.hovered);
    if (state.failed) ids.add(state.failed);
    if (state.recovering) ids.add(state.recovering);
    return [...ids];
  }, [state.selected, state.mode, state.hovered, state.failed, state.recovering]);

  // Fit the stage to the frame: cover, anchored on the sculpture. Runs on resize only.
  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;
    const layout = () => {
      const { width, height } = frame.getBoundingClientRect();
      const fit = fitPlate(width, height);
      stage.style.width = `${PLATE_W * fit.scale}px`;
      stage.style.height = `${PLATE_H * fit.scale}px`;
      fitRef.current = { fit, width, height };
      applyCameraRef.current();
      stage.style.setProperty("--plate-s", fit.scale.toFixed(4));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.min(Math.round(PLATE_W * fit.scale * dpr), MAX_CANVAS_WIDTH);
      const ch = Math.round((cw * PLATE_H) / PLATE_W);
      rendererRef.current?.resize(cw, ch);
      drawRef.current(performance.now());
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // WebGL: one renderer for the component's life, texture swapped on theme change.
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    if (!webgl) {
      onStatus("static", image.complete);
      return;
    }
    let renderer: PlateRenderer;
    try {
      renderer = createPlateRenderer(canvas);
    } catch (error) {
      console.error(error);
      onStatus("static", true);
      return;
    }
    rendererRef.current = renderer;
    onStats(1, 1);

    const frame: PlateFrame = {
      time: 0,
      light: false,
      outage: 0,
      modules: new Float32Array(MODULE_COUNT * 4),
      recovery: new Float32Array(MODULE_COUNT),
      packet: new Float32Array(4),
    };
    SERVICES.forEach((service, i) => {
      frame.modules[i * 4] = PLATE_MODULES[service.id].x;
      frame.modules[i * 4 + 1] = PLATE_MODULES[service.id].y;
    });
    let last = performance.now();
    const ease = (current: number, target: number, dt: number, snap: boolean) =>
      snap ? target : current + (target - current) * Math.min(1, dt * 6);

    drawRef.current = (now: number) => {
      const { state: s, lightMode: light, reducedMotion: still, fixedTime: fixed } = live.current;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const snap = still || fixed !== null;
      frame.time = fixed ?? (still ? 12 : now / 1000);
      frame.light = light;
      frame.outage = ease(frame.outage, s.failed ? 1 : 0, dt, snap);
      SERVICES.forEach((service, i) => {
        const focus = s.hovered === service.id || s.selected === service.id ? 1 : 0;
        frame.modules[i * 4 + 2] = ease(frame.modules[i * 4 + 2], focus, dt, snap);
        frame.modules[i * 4 + 3] = ease(
          frame.modules[i * 4 + 3],
          s.failed === service.id ? 1 : 0,
          dt,
          snap
        );
        frame.recovery[i] = ease(frame.recovery[i], s.recovering === service.id ? 1 : 0, dt, snap);
      });
      const sample = sampleRef.current;
      if (sample) {
        curvePoint(sample.edgeId, sample.progress, frame.packet);
        frame.packet[2] = sample.status === "blocked" ? 1 - sample.progress : 1;
        frame.packet[3] = sample.status === "blocked" ? 1 : 0;
      } else {
        frame.packet[2] = 0;
      }
      renderer.render(frame);
    };

    let uploaded = false;
    const upload = () => {
      if (!image.complete || image.naturalWidth === 0) return;
      try {
        renderer.setImage(image);
      } catch (error) {
        console.error("Hero plate: texture upload failed", error);
        onStatus("static", true);
        return;
      }
      uploaded = true;
      canvas.dataset.ready = "true";
      drawRef.current(performance.now());
      onStatus("plate", true);
    };
    image.addEventListener("load", upload);
    upload();

    const onLost = (event: Event) => {
      event.preventDefault();
      canvas.dataset.ready = "false";
      console.error("Hero plate: WebGL context lost, showing the static plate");
      onStatus("static", true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    // Animate only while visible and allowed; otherwise draw on demand.
    let raf = 0;
    let visible = true;
    const animating = () => {
      const { reducedMotion: still, fixedTime: fixed, state: s } = live.current;
      const ambient = !still && fixed === null;
      return uploaded && visible && !document.hidden && (ambient || s.mode === "request");
    };
    const tick = (now: number) => {
      raf = 0;
      drawRef.current(now);
      if (animating()) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", kick);
    (canvas as HTMLCanvasElement & { __kick?: () => void }).__kick = kick;

    return () => {
      cancelAnimationFrame(raf);
      intersection.disconnect();
      document.removeEventListener("visibilitychange", kick);
      image.removeEventListener("load", upload);
      canvas.removeEventListener("webglcontextlost", onLost);
      drawRef.current = () => {};
      rendererRef.current = null;
      renderer.dispose();
    };
    // Renderer lifetime is the component's; live values flow through `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webgl]);

  // Camera: springs the stage toward the pointer, the framed module, the live request and the
  // scroll position. Independent of WebGL so the static plate moves the same way. Reduced
  // motion and pinned screenshot time hold the fitted composition exactly.
  useEffect(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!frame || !stage) return;
    const pose = poseRef.current;
    const velocity: CameraPose = { x: 0, y: 0, scale: 0 };
    const pointer = { x: 0, y: 0 };
    const packet = new Float32Array(2);
    const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;
    let scroll = 0;
    let visible = true;
    let raf = 0;
    let last = 0;

    const still = () => live.current.reducedMotion || live.current.fixedTime !== null;
    const apply = () => {
      const placed = fitRef.current;
      if (!placed) return;
      const t = stageTransform(placed.fit, placed, still() ? IDENTITY_POSE : pose);
      stage.style.transform = `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0) scale(${t.scale.toFixed(4)})`;
      stage.dataset.camera = still() ? "still" : "live";
    };
    applyCameraRef.current = apply;

    const target = (): CameraPose => {
      const placed = fitRef.current;
      const s = live.current.state;
      const focusId = s.failed ?? s.selected;
      const sample = s.mode === "request" ? sampleRef.current : null;
      if (sample) curvePoint(sample.edgeId, sample.progress, packet);
      return cameraTarget(
        {
          pointer,
          focus: focusId ? PLATE_MODULES[focusId] : null,
          packet: sample ? { x: packet[0], y: packet[1] } : null,
          scroll,
        },
        { scale: placed?.fit.scale ?? 1 }
      );
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const goal = target();
      const omega = 5.5;
      [pose.x, velocity.x] = springStep(pose.x, velocity.x, goal.x, omega, dt);
      [pose.y, velocity.y] = springStep(pose.y, velocity.y, goal.y, omega, dt);
      [pose.scale, velocity.scale] = springStep(pose.scale, velocity.scale, goal.scale, omega, dt);
      apply();
      const busy = live.current.state.mode === "request" || !poseSettled(pose, goal, velocity);
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      if (still()) {
        Object.assign(pose, IDENTITY_POSE);
        Object.assign(velocity, { x: 0, y: 0, scale: 0 });
        apply();
        return;
      }
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    kickCameraRef.current = kick;

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = frame.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      kick();
    };
    const onScroll = () => {
      const rect = frame.getBoundingClientRect();
      scroll = rect.height > 0 ? Math.min(1, Math.max(0, -rect.top / rect.height)) : 0;
      kick();
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    intersection.observe(frame);
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", kick);
    apply();
    onScroll();

    return () => {
      cancelAnimationFrame(raf);
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", kick);
      applyCameraRef.current = () => {};
      kickCameraRef.current = () => {};
    };
    // Lifetime is the component's; live values flow through `live`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any state, theme or motion change: draw (and resume the loop if it should run).
  useEffect(() => {
    const canvas = canvasRef.current as (HTMLCanvasElement & { __kick?: () => void }) | null;
    canvas?.__kick?.();
    kickCameraRef.current();
  }, [state, lightMode, reducedMotion, fixedTime]);

  const failedId = state.failed;

  return (
    <div ref={frameRef} className="hero-plate">
      <div ref={stageRef} className="hero-plate-stage">
        <img
          ref={imageRef}
          className="hero-plate-art"
          src={`/hero/plate-${theme}.webp`}
          srcSet={`/hero/plate-${theme}-960.webp 960w, /hero/plate-${theme}.webp 1672w`}
          sizes="(max-width: 900px) 165vw, 112vw"
          alt=""
          width={PLATE_W}
          height={PLATE_H}
          decoding="async"
          fetchPriority="high"
          onLoad={() => {
            if (!webgl) onStatus("static", true);
          }}
          onError={() => {
            console.error(`Hero plate image failed to load (${theme})`);
            onStatus("static", true);
          }}
        />
        <canvas ref={canvasRef} className="hero-plate-canvas" aria-hidden="true" />
        <svg
          className="hero-plate-routes"
          viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {callouts.map((id) => {
            const from = PLATE_MODULES[id];
            const to = CALLOUTS[id];
            return (
              <polyline
                key={`leader-${id}`}
                className={`hero-plate-leader${id === failedId ? " is-failed" : ""}`}
                points={`${from.x},${from.y} ${to.x + (to.side === "left" ? 34 : -34)},${to.y} ${to.x},${to.y}`}
              />
            );
          })}
          {routes.map((route) => (
            <path key={route.id} d={route.d} className={`hero-plate-route is-${route.kind}`} />
          ))}
        </svg>
        {callouts.map((id) => {
          const anchor = CALLOUTS[id];
          const service = SERVICES.find((s) => s.id === id)!;
          const status =
            id === failedId
              ? "Down"
              : id === state.recovering
                ? "Recovering"
                : service.concept.name;
          return (
            <div
              key={`callout-${id}`}
              className={`hero-callout hero-plate-callout is-${anchor.side}${
                id === failedId ? " is-failed" : ""
              }`}
              style={{
                ...platePercent(anchor),
                // Room between the anchor and the plate edge, so long captions wrap instead of clipping.
                maxWidth: `min(13rem, calc(${(
                  ((anchor.side === "right" ? PLATE_W - anchor.x : anchor.x) / PLATE_W) *
                  100
                ).toFixed(2)}% - 1.25rem))`,
              }}
              aria-hidden="true"
            >
              <CalloutIcon id={id} />
              <span className="hero-plate-callout-text">
                <strong>{service.name}</strong>
                <span>{status}</span>
              </span>
            </div>
          );
        })}
        {SERVICES.map((service) => (
          <button
            key={service.id}
            type="button"
            className={`hero-plate-hotspot${service.id === failedId ? " is-failed" : ""}${
              service.id === state.hovered || service.id === state.selected ? " is-active" : ""
            }`}
            style={platePercent(PLATE_MODULES[service.id])}
            data-service={service.id}
            aria-label={`${service.name} details`}
            title={service.name}
            onPointerEnter={() => onHover(service.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(service.id)}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(service.id)}
          />
        ))}
      </div>
      <div className="hero-plate-veil" aria-hidden="true" />
    </div>
  );
}
