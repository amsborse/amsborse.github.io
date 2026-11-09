import { useCallback, useRef, type ReactNode } from "react";
import { useGpuScene } from "@/components/sutra/useGpuScene";
import type { GpuScene } from "@/components/sutra/useGpuScene";
import "./classic-page-stage.css";

import type { PageMotif } from "./PageStage";
const loadScene = (canvas: HTMLCanvasElement, small: boolean, motif: PageMotif, count: number) =>
  import("./page-gpu.ts").then(({ createPageScene }) =>
    createPageScene(canvas, { small, motif, count })
  );

/** The earlier line-art stage, kept as an option: open any page with `?stage=classic`. */
export function ClassicPageStage({
  motif,
  eyebrow,
  title,
  lede,
  children,
  count = 0,
}: {
  motif: PageMotif;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
  count?: number;
}) {
  const stage = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const create = useCallback(
    (element: HTMLCanvasElement, small: boolean): Promise<GpuScene> =>
      loadScene(element, small, motif, count),
    [motif, count]
  );
  const { renderer } = useGpuScene(canvas, stage, create);
  return (
    <section
      ref={stage}
      className={`page-stage page-stage--classic page-stage--${motif}`}
      data-renderer={renderer}
      data-gate-count={motif === "experience" ? count : undefined}
    >
      <canvas ref={canvas} className="page-stage__gpu" aria-hidden="true" />
      <StaticMotif motif={motif} count={count} />
      <div className="page-stage__copy">
        <p className="page-stage__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lede ? <div className="page-stage__lede">{lede}</div> : null}
        {children ? <div className="page-stage__links">{children}</div> : null}
      </div>
    </section>
  );
}

function StaticMotif({ motif, count }: { motif: PageMotif; count: number }) {
  const gates = Math.max(0, Math.min(count, 20));
  const id = `stage-${motif}`;
  return (
    <svg
      className="page-stage__static"
      viewBox="0 0 720 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#38a99d" stopOpacity=".13" />
          <stop offset=".6" stopColor="#76d7c7" stopOpacity=".86" />
          <stop offset="1" stopColor="#f1ca83" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#d5ad69" stopOpacity=".28" />
          <stop offset=".4" stopColor="#408f83" stopOpacity=".16" />
          <stop offset="1" stopColor="#071011" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-field`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#071012" />
          <stop offset=".55" stopColor="#081314" />
          <stop offset="1" stopColor="#050a0d" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-haze`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>
      <rect width="720" height="420" fill={`url(#${id}-field)`} />
      <ellipse cx="520" cy="220" rx="260" ry="180" fill={`url(#${id}-glow)`} />
      <ellipse
        cx="520"
        cy="225"
        rx="155"
        ry="85"
        fill="#4d8d77"
        opacity=".08"
        filter={`url(#${id}-haze)`}
      />
      <path d="M280 348 Q500 338 720 348" fill="none" stroke="#4d776e" opacity=".18" />
      <g fill="#9ac8b9" opacity=".36">
        {[0, 1, 2].map((layer) =>
          Array.from({ length: 28 }, (_, i) => {
            const x = 300 + ((i * 137 + layer * 83) % 410);
            const y = 35 + ((i * 71 + layer * 47) % 340);
            const r = i % 9 === 0 ? 1.5 : 0.65;
            return (
              <circle key={`${layer}-${i}`} cx={x} cy={y} r={r} opacity={0.35 + layer * 0.15} />
            );
          })
        )}
      </g>
      {motif === "about" ? (
        <g fill="none" strokeLinecap="round" filter={`url(#${id}-soft)`}>
          <path
            d="M305 130 C390 95 420 250 505 216 S610 196 705 202"
            stroke="#58bdb1"
            strokeWidth="2.4"
            opacity=".82"
          />
          <path
            d="M305 177 C392 155 438 247 505 216 S610 196 705 202"
            stroke="#65cbbd"
            strokeWidth="2"
            opacity=".62"
          />
          <path
            d="M305 258 C392 270 438 185 505 216 S610 196 705 202"
            stroke="#55a89e"
            strokeWidth="1.8"
            opacity=".51"
          />
          <path
            d="M305 300 C390 325 420 180 505 216 S610 196 705 202"
            stroke="#438b84"
            strokeWidth="1.8"
            opacity=".38"
          />
          <path d="M505 216 C575 206 628 202 705 202" stroke="#f0c579" strokeWidth="2.2" />
          <circle cx="505" cy="216" r="6" fill="#f3d495" stroke="none" />
          <circle cx="505" cy="216" r="15" fill="#e8bd78" opacity=".18" stroke="none" />
        </g>
      ) : null}
      {motif === "experience" ? (
        <g fill="none" strokeLinecap="round" filter={`url(#${id}-soft)`}>
          <path
            d="M300 230 C400 223 530 241 720 204"
            stroke={`url(#${id}-line)`}
            strokeWidth="5"
            opacity=".75"
          />
          <path d="M300 230 C400 223 530 241 720 204" stroke="#71d4c8" strokeWidth="1.2" />
          {Array.from({ length: gates }, (_, i) => {
            const f = gates === 1 ? 0.5 : i / Math.max(1, gates - 1);
            const x = 350 + f * 325;
            const y = 226 - f * 19;
            const rx = 8 + f * 12;
            const ry = 31 + f * 17;
            return (
              <g key={i} opacity={i === gates - 1 ? 1 : 0.45 + f * 0.2}>
                <ellipse
                  cx={x}
                  cy={y}
                  rx={rx}
                  ry={ry}
                  transform={`rotate(14 ${x} ${y})`}
                  stroke="#e7bd75"
                  strokeWidth={i === gates - 1 ? 2.5 : 1.6}
                />
                <ellipse
                  cx={x}
                  cy={y}
                  rx={rx * 0.78}
                  ry={ry * 0.84}
                  transform={`rotate(14 ${x} ${y})`}
                  stroke="#62cbbd"
                  strokeWidth="1"
                />
                <ellipse
                  cx={x}
                  cy={y}
                  rx={rx + 5}
                  ry={ry + 4}
                  transform={`rotate(14 ${x} ${y})`}
                  stroke="#d9ab5f"
                  opacity=".17"
                />
              </g>
            );
          })}
          <circle cx="622" cy="215" r="4.5" fill="#fff0c4" stroke="none" />
        </g>
      ) : null}
      {motif === "writing" ? (
        <g fill="none" strokeLinecap="round">
          <path
            d="M330 105 L692 125 L675 330 L322 304 Z"
            fill="#0b1717"
            fillOpacity=".34"
            stroke="#62958b"
            strokeOpacity=".12"
          />
          <path
            d="M340 141 L688 159 M337 174 L685 192 M334 207 L682 225 M331 240 L679 258 M328 273 L676 291"
            stroke="#6db5a9"
            strokeWidth=".65"
            opacity=".11"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M348 ${137 + i * 29} C392 ${127 + i * 29} 418 ${146 + i * 29} 456 ${137 + i * 29} S516 ${127 + i * 29} 547 ${137 + i * 29} C575 ${145 + i * 29} 601 ${130 + i * 29} 650 ${137 + i * 29} S672 ${143 + i * 29} 680 ${138 + i * 29}`}
              stroke={i === 5 ? "#d4b278" : `url(#${id}-line)`}
              strokeWidth={i === 0 ? 1.5 : 1.15}
              opacity={0.66 - i * 0.065}
            />
          ))}
          <circle cx="480" cy="137" r="3.3" fill="#f1d092" stroke="none" />
        </g>
      ) : null}
      {motif === "learning" ? (
        <g fill="none" strokeLinecap="round" filter={`url(#${id}-soft)`}>
          <path
            d="M492 370 C492 312 488 266 493 223 C480 195 449 166 414 133 M493 223 C516 191 545 163 584 127 M488 268 C452 246 419 219 383 184 M495 267 C529 244 563 219 610 186 M414 133 C398 110 380 92 360 70 M414 133 C436 111 454 91 468 63 M584 127 C576 101 563 82 548 62 M584 127 C616 111 645 93 674 72"
            stroke={`url(#${id}-line)`}
            strokeWidth="1.8"
          />
          {[
            [492, 370],
            [493, 223],
            [414, 133],
            [584, 127],
            [383, 184],
            [610, 186],
            [360, 70],
            [468, 63],
            [548, 62],
            [674, 72],
          ].map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i < 2 ? 4.5 : 3}
              fill={i < 2 ? "#efd093" : "#76d7c7"}
              stroke="none"
              opacity={i < 2 ? 0.95 : 0.78}
            />
          ))}
        </g>
      ) : null}
      {motif === "contact" ? (
        <g fill="none" strokeLinecap="round" filter={`url(#${id}-soft)`}>
          <ellipse cx="420" cy="292" rx="57" ry="17" fill="#c48b4c" opacity=".12" stroke="none" />
          <path
            d="M408 210 C468 126 558 135 695 166"
            stroke="#54b8ad"
            strokeWidth="4"
            opacity=".28"
          />
          <path
            d="M408 210 C468 126 558 135 695 166"
            stroke={`url(#${id}-line)`}
            strokeWidth="1.5"
          />
          <path
            d="M408 210 C468 294 558 287 695 247"
            stroke="#39867e"
            strokeWidth="1.2"
            opacity=".55"
          />
          <path
            d="M408 210 C505 174 605 158 696 166"
            stroke="#e5bb78"
            strokeWidth="1.1"
            strokeDasharray="3 13"
            opacity=".76"
          />
          <circle cx="408" cy="210" r="20" fill={`url(#${id}-glow)`} stroke="none" />
          <circle cx="408" cy="210" r="7" fill="#f4d18b" stroke="none" />
          <path d="M385 210 H431 M408 188 V232" stroke="#ffe3a8" strokeWidth="1" opacity=".18" />
        </g>
      ) : null}
    </svg>
  );
}
