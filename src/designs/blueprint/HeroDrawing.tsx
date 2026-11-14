import { useEffect, useRef } from "react";
import { ORBITS, SERVICES, type ServiceId } from "@/components/hero/topology";
import "../design-art.css";

type Props = {
  hovered: ServiceId | null;
  failed: ServiceId | null;
  reducedMotion: boolean;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
};

const W = 150;
const H = 56;
/** One row per orbit, in the topology's own grouping: ingestion, processing, persistence. */
const BOX: Record<ServiceId, [number, number]> = {
  gateway: [40, 70],
  policy: [325, 70],
  ingest: [610, 70],
  orchestrator: [325, 240],
  inference: [610, 240],
  observability: [40, 410],
  storage: [325, 410],
};
const ROW_Y = { ingestion: 70, processing: 240, persistence: 410 } as const;
const ROW_X = { ingestion: 40, processing: 325, persistence: 40 } as const;

/** Orthogonal routes for the drawn edges, keyed `from>to` like the topology's primary path. */
const REQUEST: { key: string; d: string; label: string; lx: number; ly: number }[] = [
  { key: "gateway>policy", d: "M190 98 H325", label: "AUTHORIZE", lx: 257, ly: 92 },
  { key: "policy>ingest", d: "M475 98 H610", label: "ADMIT", lx: 542, ly: 92 },
  { key: "ingest>orchestrator", d: "M685 126 V180 H430 V240", label: "CONSUME", lx: 600, ly: 174 },
  { key: "orchestrator>inference", d: "M475 260 H610", label: "MODEL CALL", lx: 542, ly: 254 },
  { key: "orchestrator>storage", d: "M400 296 V410", label: "PERSIST", lx: 408, ly: 360 },
];
const RESPONSE: { key: string; d: string }[] = [
  { key: "inference>orchestrator", d: "M610 280 H475" },
  { key: "orchestrator>gateway", d: "M325 268 H115 V126" },
];
const TELEMETRY = [
  "M70 126 V410",
  "M350 296 V355 H140 V410",
  "M325 438 H190",
  "M760 268 H786 V505 H115 V466",
];
/** The healthy request travelling the drawing, one leg after another. */
const TRIP = [
  "gateway>policy",
  "policy>ingest",
  "ingest>orchestrator",
  "orchestrator>inference",
  "inference>orchestrator",
  "orchestrator>storage",
  "orchestrator>gateway",
];
const LEG = 0.85;
/** Monospace advance per character (glyph plus letter-spacing) at each text size used below. */
const ADVANCE = { name: 7.8, meta: 4.65, sheet: 6.5 };
/** Squeeze a label into `room` only when its estimated width would overflow it. */
const fit = (text: string, advance: number, room: number) =>
  text.length * advance > room
    ? { textLength: room, lengthAdjust: "spacingAndGlyphs" as const }
    : {};

const routeFor = (key: string) =>
  REQUEST.find((edge) => edge.key === key)?.d ?? RESPONSE.find((edge) => edge.key === key)?.d ?? "";

/**
 * Blueprint's hero: the hero's real topology drawn as a technical sheet, with a title block,
 * a dimension line, ink that draws itself in once, and a single request packet walking the
 * primary path. SMIL packets pause while the drawing is off screen; reduced motion shows none.
 */
export function HeroDrawing({ hovered, failed, reducedMotion, onHover, onSelect }: Props) {
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const element = svg.current;
    if (!element || reducedMotion || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) element.unpauseAnimations();
      else element.pauseAnimations();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const total = TRIP.length * LEG;
  return (
    <div className="bp-hero" data-testid="design-hero" data-design-hero="blueprint">
      <svg
        ref={svg}
        className="bp-hero__sheet"
        viewBox="0 0 800 530"
        role="group"
        aria-label="Reference architecture of the AI request pipeline, drawn as a technical sheet"
      >
        <defs>
          <marker
            id="bp-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L8 4 L0 8 z" className="bp-hero__arrowhead" />
          </marker>
          <pattern
            id="bp-hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" className="bp-hero__hatch" />
          </pattern>
        </defs>

        <rect
          className="bp-hero__frame bp-draw"
          x="6"
          y="6"
          width="788"
          height="518"
          pathLength={1}
        />

        <g className="bp-hero__dimension">
          <path
            className="bp-draw"
            d="M40 34 H760"
            pathLength={1}
            markerStart="url(#bp-arrow)"
            markerEnd="url(#bp-arrow)"
          />
          <path d="M40 26 V44 M760 26 V44" />
          <text x="400" y="29" textAnchor="middle" className="bp-hero__dim-label">
            REQUEST PATH · {SERVICES.length} SERVICES
          </text>
        </g>

        {ORBITS.map((orbit, index) => (
          <text
            key={orbit.id}
            className="bp-hero__row-label"
            x={ROW_X[orbit.id]}
            y={ROW_Y[orbit.id] - 10}
          >
            {String(index + 1).padStart(2, "0")} · {orbit.label.toUpperCase()}
          </text>
        ))}

        <g className="bp-hero__telemetry">
          {TELEMETRY.map((d) => (
            <path key={d} d={d} markerEnd="url(#bp-arrow)" />
          ))}
        </g>
        <g className="bp-hero__responses">
          {RESPONSE.map((edge) => (
            <path key={edge.key} d={edge.d} markerEnd="url(#bp-arrow)" />
          ))}
        </g>
        <g className="bp-hero__requests">
          {REQUEST.map((edge) => (
            <g key={edge.key}>
              <path className="bp-draw" d={edge.d} pathLength={1} markerEnd="url(#bp-arrow)" />
              <text
                x={edge.lx}
                y={edge.ly}
                textAnchor={edge.key === "orchestrator>storage" ? "start" : "middle"}
              >
                {edge.label}
              </text>
            </g>
          ))}
        </g>

        {SERVICES.map((service) => {
          const [x, y] = BOX[service.id];
          const state =
            failed === service.id ? "failed" : hovered === service.id ? "hover" : "idle";
          return (
            <g
              key={service.id}
              className="bp-hero__node"
              data-state={state}
              data-service={service.id}
              transform={`translate(${x} ${y})`}
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${service.name}`}
              onPointerEnter={() => onHover(service.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(service.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(service.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(service.id);
                }
              }}
            >
              <rect className="bp-hero__box bp-draw" width={W} height={H} pathLength={1} />
              <rect className="bp-hero__box-fill" x="3" y="3" width={W - 6} height={H - 6} />
              <path
                className="bp-hero__ticks"
                d={`M-5 0 H5 M0 -5 V5 M${W - 5} ${H} H${W + 5} M${W} ${H - 5} V${H + 5}`}
              />
              <text
                className="bp-hero__node-name"
                x="12"
                y="24"
                {...fit(service.name, ADVANCE.name, W - 24)}
              >
                {service.name}
              </text>
              <text
                className="bp-hero__node-meta"
                x="12"
                y="42"
                {...fit(service.concept.name, ADVANCE.meta, W - 24)}
              >
                {service.concept.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        <g className="bp-hero__title-block" transform="translate(560 404)">
          <rect className="bp-draw" width="220" height="92" pathLength={1} />
          <path d="M0 30 H220 M0 61 H220 M120 61 V92" />
          <text x="10" y="20" className="bp-hero__tb-strong">
            AI REQUEST PIPELINE
          </text>
          <text x="10" y="50" {...fit("ILLUSTRATIVE REFERENCE ARCHITECTURE", ADVANCE.sheet, 200)}>
            ILLUSTRATIVE REFERENCE ARCHITECTURE
          </text>
          <text x="10" y="81">
            SHEET 01 / 01
          </text>
          <text x="130" y="81">
            SCALE NTS
          </text>
        </g>

        {!reducedMotion &&
          TRIP.map((key, index) => {
            const start = (index * LEG) / total;
            const end = ((index + 1) * LEG) / total;
            return (
              <circle key={key} r="4.5" className="bp-hero__packet" opacity="0">
                <animateMotion
                  dur={`${total}s`}
                  repeatCount="indefinite"
                  path={routeFor(key)}
                  keyPoints="0;0;1;1"
                  keyTimes={`0;${start.toFixed(4)};${end.toFixed(4)};1`}
                  calcMode="linear"
                  begin="1.4s"
                />
                <animate
                  attributeName="opacity"
                  dur={`${total}s`}
                  repeatCount="indefinite"
                  values="0;0;1;1;0;0"
                  keyTimes={`0;${start.toFixed(4)};${(start + 0.004).toFixed(4)};${(end - 0.004).toFixed(4)};${end.toFixed(4)};1`}
                  begin="1.4s"
                />
              </circle>
            );
          })}
      </svg>
    </div>
  );
}
