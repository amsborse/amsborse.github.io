import { useEffect, useRef, useState } from "react";
import { SERVICES } from "@/components/hero/topology";
import type { DesignHeroProps } from "../registry";
import {
  RESTING_BEAM,
  aimBeam,
  beamCone,
  createScene,
  engrave,
  paintDetails,
  paintRibbons,
  type Beam,
  type EngravingInk,
} from "./engraving";
import "../design-art.css";

const dateline = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** How long the plate takes to print itself in, line by line. */
const PRINT_MS = 1400;
const MAX_DPR = 1.5;

function readInk(element: Element): EngravingInk {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--color-ink", "#1a1714"),
    paper: read("--color-bg", "#f4efe6"),
    spot: read("--color-accent", "#d9442b"),
  };
}

/**
 * Broadsheet's hero: a wood engraving of a lighthouse holding its light over a storm, printed
 * in on arrival. The beam follows the pointer out to sea and lifts the storm where it falls.
 * The caption's service names open the same inspector as the island does.
 */
export function HeroFrontPage({
  theme,
  hovered,
  reducedMotion,
  onHover,
  onSelect,
}: DesignHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let base: HTMLCanvasElement | null = null;
    let lit: HTMLCanvasElement | null = null;
    let scene = createScene(1.4);
    let ink = readInk(canvas);
    let cssHeight = 1;
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let printStart = -1;
    let progress = reducedMotion ? 1 : 0;
    let angle = RESTING_BEAM.angle;
    let target = RESTING_BEAM.angle;
    let velocity = 0;

    const layer = (width: number, height: number, lift: number) => {
      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const g = off.getContext("2d");
      if (!g) return off;
      g.setTransform(dpr * cssHeight, 0, 0, dpr * cssHeight, 0, 0);
      g.fillStyle = ink.paper;
      g.fillRect(0, 0, scene.aspect, 1);
      const spacing = Math.max(0.0065, 3.2 / cssHeight);
      paintRibbons(
        g,
        engrave(scene, { spacing, step: spacing / 2, lift, invert: theme === "dark" }),
        ink.ink
      );
      return off;
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return false;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      cssHeight = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      scene = createScene(rect.width / rect.height);
      ink = readInk(canvas);
      base = layer(canvas.width, canvas.height, 0);
      lit = layer(canvas.width, canvas.height, theme === "dark" ? 0.7 : 0.3);
      return true;
    };

    const draw = (printed: number) => {
      if (!base || !lit) return;
      const beam: Beam = { ...RESTING_BEAM, angle };
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = ink.paper;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.beginPath();
      context.rect(0, 0, canvas.width, canvas.height * printed);
      context.clip();
      context.drawImage(base, 0, 0);
      // The beam: the lit print shows through a cone, washed with the spot colour.
      const scale = dpr * cssHeight;
      const cone = beamCone(scene, beam);
      context.beginPath();
      context.moveTo(cone[0].x * scale, cone[0].y * scale);
      context.lineTo(cone[1].x * scale, cone[1].y * scale);
      context.lineTo(cone[2].x * scale, cone[2].y * scale);
      context.closePath();
      context.clip();
      context.drawImage(lit, 0, 0);
      context.globalAlpha = theme === "dark" ? 0.1 : 0.05;
      context.fillStyle = ink.spot;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();
      if (printed >= 1) {
        context.setTransform(scale, 0, 0, scale, 0, 0);
        paintDetails(context, scene, ink);
      }
    };

    const tick = (now: number) => {
      frame = 0;
      if (printStart < 0) printStart = now;
      const printed = reducedMotion ? 1 : Math.min(1, (now - printStart) / PRINT_MS);
      progress = printed;
      // A damped spring towards the pointer's angle; it stops scheduling once settled.
      const force = (target - angle) * 0.06 - velocity * 0.32;
      velocity += force;
      angle += velocity;
      const settled = Math.abs(target - angle) < 1e-4 && Math.abs(velocity) < 1e-4;
      if (settled) angle = target;
      draw(printed);
      if ((printed < 1 || !settled) && visible && !reducedMotion)
        frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frame && visible) frame = requestAnimationFrame(tick);
    };

    if (build()) {
      if (reducedMotion) draw(1);
      else schedule();
      setReady(true);
    }

    const resize = new ResizeObserver(() => {
      if (!build()) return;
      setReady(true);
      draw(progress);
      if (progress < 1 && !reducedMotion) schedule();
    });
    resize.observe(canvas);

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    intersection.observe(canvas);

    const onPointer = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: (event.clientX - rect.left) / rect.height,
        y: (event.clientY - rect.top) / rect.height,
      };
      target = aimBeam(scene, point).angle;
      schedule();
    };
    const onLeave = () => {
      target = RESTING_BEAM.angle;
      schedule();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [theme, reducedMotion]);

  return (
    <figure className="bs-hero" data-testid="design-hero" data-design-hero="broadsheet">
      <p className="bs-hero__dateline">
        <span>{dateline.format(new Date())}</span>
        <span>Systems edition</span>
      </p>
      <div className="bs-hero__photo">
        <canvas
          ref={canvasRef}
          className="bs-hero__plate bs-hero__engraving"
          data-ready={ready ? "true" : undefined}
          role="img"
          aria-label="Wood engraving of a lighthouse keeping its beam steady over a storm at sea"
        />
      </div>
      <figcaption className="bs-hero__caption">
        <strong>Fig. 1</strong> A light that holds under load.{" "}
        <span className="bs-hero__parts">
          Inspect a part:{" "}
          {SERVICES.map((service, index) => (
            <span key={service.id}>
              <button
                type="button"
                className="bs-hero__part"
                data-active={hovered === service.id ? "true" : undefined}
                onPointerEnter={() => onHover(service.id)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(service.id)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(service.id)}
              >
                {service.name}
              </button>
              {index < SERVICES.length - 1 ? ", " : "."}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
