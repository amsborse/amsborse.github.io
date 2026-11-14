import { useEffect, useRef } from "react";
import type { PlateTreatment } from "./registry";
import { drawHalftone, drawLinework, loadImage } from "./plateArt";
import "./design-art.css";

type Props = {
  /** The plate image to interpret (the full-size one keeps Blueprint's lines crisp). */
  src: string;
  treatment: PlateTreatment;
  theme: "dark" | "light";
  className?: string;
};

const SIZE = { width: 1672, height: 941 };

/**
 * A chapter plate redrawn in the active design's medium (its registry `plate` treatment): a
 * newsprint halftone or an ink line drawing. Rendered once per image, design and theme; no loop.
 */
export function DesignPlate({ src, treatment, theme, className = "" }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    element.dataset.ready = "false";
    loadImage(src)
      .then((image) => {
        if (cancelled) return;
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue("--color-accent").trim() || "#46c8ea";
        const ink = styles.getPropertyValue("--color-ink").trim() || "#161412";
        if (treatment === "halftone") {
          drawHalftone(element, image, { ink, spot: accent, dark: theme === "dark" });
        } else {
          drawLinework(element, image, accent);
        }
        element.dataset.ready = "true";
      })
      .catch((error: unknown) => {
        console.error("[design-plate]", error);
        element.dataset.ready = "failed";
      });
    return () => {
      cancelled = true;
    };
  }, [src, treatment, theme]);

  return (
    <canvas
      ref={canvas}
      className={`design-plate design-plate--${treatment} ${className}`}
      width={SIZE.width}
      height={SIZE.height}
      aria-hidden="true"
      data-ready="false"
    />
  );
}
