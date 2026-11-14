import { useEffect, useRef } from "react";
import type { PlateTreatment } from "./registry";
import { clamp01, cutRibbons, paintRibbons, smooth } from "./broadsheet/engraving";
import { chapterScene, contours, type Chapter, type Spot } from "./chapterScenes";
import "./design-art.css";

type Props = {
  /** Which chapter's picture to draw; each has its own procedural scene. */
  chapter: Chapter;
  treatment: PlateTreatment;
  theme: "dark" | "light";
  className?: string;
};

const SIZE = { width: 1672, height: 941 };
const ASPECT = SIZE.width / SIZE.height;
const LEVELS = [0.2, 0.35, 0.5, 0.65, 0.8];
const GRID = { cols: 420, rows: 236 };

function paintSpot(context: CanvasRenderingContext2D, spot: Spot, color: string) {
  const { x, y, size } = spot;
  context.fillStyle = color;
  context.beginPath();
  if (spot.shape === "disc") {
    context.arc(x, y, size, 0, Math.PI * 2);
  } else if (spot.shape === "flag") {
    context.moveTo(x, y);
    context.lineTo(x + size * 1.6, y + size * 0.45);
    context.lineTo(x, y + size * 0.9);
  } else {
    context.moveTo(x - size * 0.3, y);
    context.lineTo(x + size * 0.3, y);
    context.lineTo(x + size * 0.3, y + size * 1.6);
    context.lineTo(x, y + size * 1.25);
    context.lineTo(x - size * 0.3, y + size * 1.6);
  }
  context.closePath();
  context.fill();
}

/** Broadsheet: the scene cut as a wood engraving, with the spot colour printed on top. */
function drawEngraving(context: CanvasRenderingContext2D, chapter: Chapter, colors: Colors) {
  const scene = chapterScene(chapter, ASPECT);
  // The faintest tones print as clean paper, and the cut feathers out at its edges, so the
  // picture sits in the column like a printed cut rather than a grey block.
  const edge = (x: number, y: number) =>
    smooth(0, 0.07, Math.min(x, ASPECT - x)) * smooth(0, 0.07, Math.min(y, 1 - y));
  const print = {
    ...scene,
    tone: (x: number, y: number) => clamp01((scene.tone(x, y) - 0.18) / 0.82) * edge(x, y),
  };
  // Dark mode prints the same cut in light ink: lines still follow the picture's shadows.
  const lines = cutRibbons(print, { spacing: 0.0085, step: 0.0025 });
  paintRibbons(context, lines, colors.ink);
  for (const spot of scene.spots) paintSpot(context, spot, colors.accent);
}

/** Blueprint: the same scene surveyed as contour lines on a drafting sheet. */
function drawContours(context: CanvasRenderingContext2D, chapter: Chapter, colors: Colors) {
  const scene = chapterScene(chapter, ASPECT, 0.3);
  // Survey a slightly softened field, so features thinner than a grid cell (wires, masts)
  // still close into outlines instead of breaking into dashes.
  const r = 0.4 / GRID.rows;
  const survey = {
    aspect: ASPECT,
    tone: (x: number, y: number) =>
      (scene.tone(x, y) * 2 +
        scene.tone(x - r, y) +
        scene.tone(x + r, y) +
        scene.tone(x, y - r) +
        scene.tone(x, y + r)) /
      6,
  };
  context.lineCap = "round";
  context.strokeStyle = colors.accent;
  LEVELS.forEach((level, index) => {
    context.lineWidth = index === 2 ? 0.0022 : 0.0012;
    context.globalAlpha = index === 2 ? 0.95 : 0.6;
    context.beginPath();
    for (const [x1, y1, x2, y2] of contours(survey, level, GRID.cols, GRID.rows)) {
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
    }
    context.stroke();
  });
  context.globalAlpha = 1;
  context.lineWidth = 0.0015;
  for (const spot of scene.spots) {
    context.beginPath();
    context.arc(spot.x, spot.y, spot.size * 1.6, 0, Math.PI * 2);
    context.moveTo(spot.x - spot.size * 2.4, spot.y);
    context.lineTo(spot.x + spot.size * 2.4, spot.y);
    context.moveTo(spot.x, spot.y - spot.size * 2.4);
    context.lineTo(spot.x, spot.y + spot.size * 2.4);
    context.stroke();
  }
}

type Colors = { ink: string; accent: string };

/**
 * A chapter plate drawn in the active design's medium (its registry `plate` treatment): a wood
 * engraving or a contour survey of the chapter's own procedural scene. Rendered once per
 * chapter, design and theme; no loop.
 */
export function DesignPlate({ chapter, treatment, theme, className = "" }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    element.dataset.ready = "false";
    try {
      const styles = getComputedStyle(document.documentElement);
      const colors: Colors = {
        accent: styles.getPropertyValue("--color-accent").trim() || "#46c8ea",
        ink: styles.getPropertyValue("--color-ink").trim() || "#161412",
      };
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, element.width, element.height);
      context.setTransform(element.height, 0, 0, element.height, 0, 0);
      if (treatment === "engraving") drawEngraving(context, chapter, colors);
      else drawContours(context, chapter, colors);
      element.dataset.ready = "true";
    } catch (error: unknown) {
      console.error("[design-plate]", error);
      element.dataset.ready = "failed";
    }
  }, [chapter, treatment, theme]);

  return (
    <canvas
      ref={canvas}
      className={`design-plate design-plate--${treatment} ${className}`}
      width={SIZE.width}
      height={SIZE.height}
      aria-hidden="true"
      data-ready="false"
      data-chapter={chapter}
    />
  );
}
