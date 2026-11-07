import { useEffect, useRef, useState, type RefObject } from "react";
import type { HeroLayout, HeroScene } from "./hero-gpu.ts";
import { useGpuScene } from "./useGpuScene.ts";
import { Icon } from "./Icons.tsx";

const MODULES = [
  {
    id: "manthan",
    name: "Manthan",
    script: "मन्थन",
    verb: "Discovers",
    icon: "discover",
    example:
      "A new tool surfaces. Manthan checks the evidence and explains why it could matter to you.",
    y: 16,
  },
  {
    id: "smriti",
    name: "Smriti",
    script: "स्मृति",
    verb: "Remembers",
    icon: "memory",
    example: "An idea worth keeping becomes a question you revisit, just before you forget.",
    y: 50,
  },
  {
    id: "kriya",
    name: "Kriya",
    script: "क्रिया",
    verb: "Acts",
    icon: "act",
    example: "A plan becomes a concrete next step, reviewed by you before anything is carried out.",
    y: 84,
  },
] as const;
type ModuleKey = (typeof MODULES)[number]["id"];
export type ModuleState = { active: boolean; status: string; href?: string; onOpen?: () => void };

// Where the ring sits in the map, as fractions of its box. The static art uses the same numbers.
const RING_X = 0.34;
const RING_R = 0.29;
/** The scene's code is fetched only when a scene will run. */
const createScene = (canvas: HTMLCanvasElement, small: boolean): Promise<HeroScene> =>
  import("./hero-gpu.ts").then((gpu) => gpu.createHeroScene(canvas, { small }));
/** The map's height for a width of 640, as in its CSS aspect ratio. */
const HEIGHT = 290;

/**
 * Whether the scene's canvas is drawn at all. The light landing hides it (#1311): additive light
 * vanishes on paper, so the static ring shows instead and the scene is neither fetched nor run.
 * Checked again whenever the theme changes. False until measured, so nothing starts early.
 */
function useCanvasShown(canvas: RefObject<HTMLCanvasElement | null>) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const sync = () =>
      setShown(!!canvas.current && getComputedStyle(canvas.current).display !== "none");
    sync();
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      scheme.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, [canvas]);
  return shown;
}

/**
 * The SUTRA hero (#402): light gathers into a ring and leaves toward each module. Public motion
 * illustrates a vision; private light comes only from existing API results. The scene is WebGPU
 * behind accessible HTML, and a static drawing of the same composition stands in without WebGPU,
 * with reduced motion, or if the GPU is lost.
 */
export function HomeOrbit({ activity }: { activity?: Partial<Record<ModuleKey, ModuleState>> }) {
  const figure = useRef<HTMLElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<ModuleKey>("manthan");
  const [hovered, setHovered] = useState<ModuleKey | null>(null);
  const publicView = activity === undefined;
  const hasActivity = publicView || Object.values(activity).some((state) => state?.active);

  // Brightness and flow per module. A module that does not exist yet never carries light.
  const levels = MODULES.map((module): [number, number] => {
    const lit = publicView ? selected === module.id : (activity[module.id]?.active ?? false);
    const focus = hovered === module.id ? 0.7 : 0;
    return lit ? [1, 1] : [Math.max(0.3, focus), 0];
  });
  const levelKey = JSON.stringify(levels);

  const shown = useCanvasShown(canvas);
  const {
    scene,
    ready: gpuReady,
    renderer,
  } = useGpuScene(canvas, art, createScene, hasActivity, shown);

  // Measure the page so paths end at the HTML labels, at every size.
  useEffect(() => {
    const hero = figure.current?.closest(".home-hero");
    if (!gpuReady || !hero || !canvas.current || !art.current) return;
    const measure = () => {
      const current = scene.current;
      const box = canvas.current?.getBoundingClientRect();
      const map = art.current?.querySelector(".map-canvas")?.getBoundingClientRect();
      if (!current || !box || !map || box.height === 0) return;
      const unit = 2 / box.height;
      const x = (px: number) => (px - box.left - box.width / 2) * unit;
      const y = (px: number) => -(px - box.top - box.height / 2) * unit;
      const copy = hero.querySelector(".hero-copy")?.getBoundingClientRect();
      const sideBySide = !!copy && copy.right <= map.left + 8;
      const layout: HeroLayout = {
        aspect: box.width / box.height,
        px: unit,
        ring: [
          x(map.left + map.width * RING_X),
          y(map.top + map.height / 2),
          map.height * RING_R * unit,
        ],
        modules: MODULES.map((module, i) => {
          const symbol = art.current
            ?.querySelector(`.map-${module.id} .module-symbol`)
            ?.getBoundingClientRect();
          const [level, flow] = levels[i]!;
          return symbol
            ? [x(symbol.left - 4), y(symbol.top + symbol.height / 2), level, flow]
            : [0, 0, 0, 0];
        }),
        copyEdge: sideBySide ? x(copy.right) : -99,
        spread: map.height * (sideBySide ? 0.42 : 0.3) * unit,
        iconRadius:
          ((art.current?.querySelector(".module-symbol")?.getBoundingClientRect().width ?? 0) / 2) *
          unit,
      };
      current.update(layout);
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(hero);
    // The scene eases toward the pointer itself; a move only reports where it is.
    const move = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      scene.current?.pointer(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        ((event.clientY - box.top) / box.height) * 2 - 1
      );
    };
    const leave = () => scene.current?.pointer(0, 0);
    hero.addEventListener("pointermove", move as EventListener, { passive: true });
    hero.addEventListener("pointerleave", leave);
    return () => {
      resize.disconnect();
      hero.removeEventListener("pointermove", move as EventListener);
      hero.removeEventListener("pointerleave", leave);
    };
    // levelKey stands in for levels, which is a new array every render.
  }, [gpuReady, levelKey]);

  // Event-driven, bounded scroll storytelling. Selecting a module takes priority until scrolling.
  useEffect(() => {
    if (!publicView) return;
    const update = () => {
      if (document.hidden) return;
      const box = figure.current?.closest(".home-hero")?.getBoundingClientRect();
      if (!box || box.bottom < 0 || box.top > innerHeight) return;
      const progress = Math.max(0, Math.min(0.999, -box.top / Math.max(1, box.height * 0.7)));
      setSelected(MODULES[Math.floor(progress * MODULES.length)]!.id);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [publicView]);

  const example = MODULES.find((module) => module.id === selected)!;
  return (
    <figure
      ref={figure}
      className={`hero-intelligence ${publicView ? "journey-public" : "journey-private"}`}
      aria-label="SUTRA intelligence map"
      data-renderer={renderer}
    >
      <canvas ref={canvas} className="hero-gpu" aria-hidden="true" />
      <div
        ref={art}
        className="thread-art"
        data-running="false"
        data-selected={publicView ? selected : undefined}
      >
        <div className="map-canvas">
          <StaticMap levels={levels} />
          <ul className="journey-modules">
            {MODULES.map((module) => {
              const state = activity?.[module.id];
              const lit = publicView ? selected === module.id : (state?.active ?? false);
              const body = (
                <>
                  <span className="module-symbol">
                    <Icon name={module.icon} />
                  </span>
                  <span className="module-name">
                    <strong>{module.name}</strong>
                    <span lang="sa">{module.script}</span>
                  </span>
                  <small>{publicView ? module.verb : (state?.status ?? "Not available yet")}</small>
                </>
              );
              return (
                <li
                  key={module.id}
                  className={`map-${module.id}`}
                  data-active={lit}
                  style={{ top: `${module.y}%` }}
                  onPointerEnter={() => setHovered(module.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(module.id)}
                  onBlur={() => setHovered(null)}
                >
                  {publicView ? (
                    <button type="button" aria-pressed={lit} onClick={() => setSelected(module.id)}>
                      {body}
                    </button>
                  ) : state?.active && state.href ? (
                    <a href={state.href} target="_blank" rel="noreferrer noopener">
                      {body}
                    </a>
                  ) : state?.onOpen ? (
                    <button type="button" onClick={state.onOpen}>
                      {body}
                    </button>
                  ) : (
                    <div className="module-quiet">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {publicView ? (
        <figcaption className="journey-example" aria-live="polite">
          <span>{example.name} · Illustrative example</span>
          <p>{example.example}</p>
        </figcaption>
      ) : (
        <figcaption>Light marks something ready for your attention.</figcaption>
      )}
    </figure>
  );
}

/**
 * The same composition, drawn once: the ring seen at an angle, and the three threads. Shown
 * without WebGPU, with reduced motion, and if the GPU scene fails or is lost.
 */
function StaticMap({ levels }: { levels: [number, number][] }) {
  const cx = RING_X * 640;
  const cy = HEIGHT / 2;
  const r = RING_R * HEIGHT;
  const colors = ["#f3c77c", "#79e0cd", "#d8ccb0"];
  return (
    // Stretched to the map's box, which is a little taller on phones; strokes keep their width.
    <svg
      className="map-static"
      viewBox={`0 0 640 ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="sutra-ring-glow">
          <stop offset="0.55" style={{ stopColor: "var(--ring-glow, #f4c47a)" }} stopOpacity="0" />
          <stop
            offset="0.8"
            style={{ stopColor: "var(--ring-glow, #f4c47a)" }}
            stopOpacity="0.22"
          />
          <stop offset="1" style={{ stopColor: "var(--ring-glow, #f4c47a)" }} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" style={{ stroke: "var(--ring-floor, #e2bd7f)" }}>
        {[1.5, 2.15, 2.95].map((k, i) => (
          <ellipse
            key={k}
            cx={cx + 10}
            cy={cy + r * 1.5}
            rx={r * k}
            ry={r * k * 0.24}
            opacity={0.2 - i * 0.06}
          />
        ))}
      </g>
      {MODULES.map((module, i) => {
        const [level, flow] = levels[i]!;
        const y = (module.y / 100) * HEIGHT;
        const sx = cx + r * 0.52;
        const sy = cy - (1 - i) * r * 0.55;
        return (
          <path
            key={module.id}
            className="module-thread"
            d={`M${sx} ${sy} C${sx + 90} ${sy}, ${452 - 110} ${y}, 452 ${y}`}
            fill="none"
            style={{ stroke: `var(--thread-${i}, ${colors[i]})` }}
            strokeWidth={level > 0.9 ? 1.8 : 1.1}
            strokeDasharray={flow < 0 ? "2 6" : undefined}
            opacity={Math.max(0.18, level)}
          />
        );
      })}
      <g transform={`rotate(-6 ${cx} ${cy})`} fill="none">
        <ellipse
          cx={cx}
          cy={cy}
          rx={r * 0.62}
          ry={r * 1.12}
          stroke="url(#sutra-ring-glow)"
          strokeWidth="30"
        />
        <ellipse
          cx={cx - 12}
          cy={cy}
          rx={r * 0.58}
          ry={r * 1.08}
          style={{ stroke: "var(--ring-back, #caa062)" }}
          strokeWidth="1.4"
          opacity="0.7"
        />
        <ellipse
          cx={cx + 12}
          cy={cy}
          rx={r * 0.58}
          ry={r * 1.08}
          style={{ stroke: "var(--ring-front, #e2b877)" }}
          strokeWidth="1.4"
          opacity="0.85"
        />
        <ellipse
          cx={cx}
          cy={cy}
          rx={r * 0.5}
          ry={r * 0.96}
          style={{ stroke: "var(--ring-core, #fff0d2)" }}
          strokeWidth="2.4"
        />
      </g>
    </svg>
  );
}
