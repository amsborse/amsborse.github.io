import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useDocumentTheme } from "@/components/stage/PageStage";
import {
  createSimulation,
  leavePointer,
  MAX_DT,
  movePointer,
  resizeSimulation,
  stepSimulation,
  type CreatureSimulation,
} from "./creatures";

const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const readMotion = () => window.matchMedia(motionQuery).matches;
let reportedContextError = false;
function reportContextError() {
  if (reportedContextError) return;
  reportedContextError = true;
  console.error("AmbientCreatures: Canvas 2D context unavailable.");
}

export function AmbientCreatures() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<CreatureSimulation | null>(null);
  const theme = useDocumentTheme();
  const themeRef = useRef(theme);
  const reduced = useSyncExternalStore(subscribeMotion, readMotion, () => true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed) return;
    const ctx = canvas.getContext("2d");
    const glow = document.createElement("canvas");
    const glowCtx = glow.getContext("2d");
    if (!ctx || !glowCtx) {
      reportContextError();
      setFailed(true);
      return;
    }

    const palette = getComputedStyle(document.documentElement);
    const gold = palette.getPropertyValue("--color-gold").trim();
    const bright = palette.getPropertyValue("--color-accent-bright").trim();
    // A single feathered sprite, reused at each depth; never shadowBlur in the hot loop.
    glow.width = glow.height = 64;
    const gradient = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, bright);
    gradient.addColorStop(0.07, gold);
    gradient.addColorStop(0.28, `color-mix(in srgb, ${gold} 28%, transparent)`);
    gradient.addColorStop(1, "transparent");
    glowCtx.fillStyle = gradient;
    glowCtx.fillRect(0, 0, 64, 64);

    const sim =
      simulationRef.current ?? createSimulation(window.innerWidth, window.innerHeight, 20);
    simulationRef.current = sim;
    leavePointer(sim);
    let width = 0;
    let height = 0;
    let small = false;
    let frame = 0;
    let previous = 0;
    let accumulated = 0;
    let sinceDraw = 0;
    let fade = themeRef.current === "light" ? 1 : 0;
    let constrained = false;
    let slowSeconds = 0;
    let ink = palette.getPropertyValue("--color-accent-dim").trim();
    let lastTheme = themeRef.current;
    let lastSettled = -1;
    let lastApproaching = -1;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      let settled = 0;
      let approaching = 0;
      const butterflies = Math.ceil((small ? 5 : 10) / (constrained ? 2 : 1));
      const fireflies = Math.ceil((small ? 10 : 20) / (constrained ? 2 : 1));
      const count = Math.max(fireflies, butterflies);
      for (let i = 0; i < count; i++) {
        const c = sim.creatures[i];
        if (c.settled) settled++;
        else if (c.slot >= 0) approaching++;
        const inCopy = c.x > width * 0.23 && c.x < width * 0.72;
        const quiet = inCopy && c.slot < 0 ? 0.38 : 1;
        const pulse =
          0.2 +
          0.8 * Math.pow(0.5 + 0.5 * Math.sin(sim.time * (0.75 + c.depth * 0.4) + c.phase), 2);
        if (fade < 1 && i < fireflies) {
          const size = 12 + c.depth * 15;
          ctx.globalAlpha = (1 - fade) * quiet * pulse * (0.5 + c.depth * 0.4);
          ctx.drawImage(glow, c.x - size / 2, c.y - size / 2, size, size);
        }
        if (fade > 0 && i < butterflies) {
          ctx.save();
          ctx.globalAlpha = fade * quiet * (0.36 + c.depth * 0.3);
          ctx.translate(c.x, c.y);
          ctx.rotate(c.angle + Math.PI / 2);
          const flap = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(c.wingPhase));
          ctx.scale((0.65 + c.depth * 0.4) * flap, 0.65 + c.depth * 0.4);
          ctx.fillStyle = ink;
          ctx.beginPath();
          // Forewings taper toward the body; two smaller hindwings round out the silhouette.
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-3, -9, -10, -9, -8, -2);
          ctx.bezierCurveTo(-8, 1, -3, 2, 0, 0);
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(3, -9, 10, -9, 8, -2);
          ctx.bezierCurveTo(8, 1, 3, 2, 0, 0);
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-9, -1, -6, 9, -2, 5);
          ctx.quadraticCurveTo(0, 3, 0, 0);
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(9, -1, 6, 9, 2, 5);
          ctx.quadraticCurveTo(0, 3, 0, 0);
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = fade * quiet * 0.6;
          ctx.translate(c.x, c.y);
          ctx.rotate(c.angle + Math.PI / 2);
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.ellipse(0, -0.5, 0.65, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      // Small, inspectable state for browser verification; no React renders per frame.
      if (settled !== lastSettled) {
        canvas.dataset.settled = String(settled);
        lastSettled = settled;
      }
      if (approaching !== lastApproaching) {
        canvas.dataset.approaching = String(approaching);
        lastApproaching = approaching;
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      small = width <= 720;
      const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resizeSimulation(sim, width, height);
      if (reduced) draw();
    };
    const tick = (now: number) => {
      frame = 0;
      if (document.hidden || reduced) return;
      const frameDelta = previous ? (now - previous) / 1000 : 1 / 60;
      previous = now;
      accumulated += frameDelta;
      sinceDraw += frameDelta;
      if (accumulated >= 1 / 60) {
        const elapsed = sinceDraw;
        sinceDraw = 0;
        accumulated %= 1 / 60;
        // Sustained missed frames reduce both renderer and simulation work, once per visit.
        slowSeconds =
          elapsed > 0.027
            ? slowSeconds + Math.min(elapsed, 0.1)
            : Math.max(0, slowSeconds - elapsed);
        if (slowSeconds > 2) constrained = true;
        const target = themeRef.current === "light" ? 1 : 0;
        const dt = Math.min(MAX_DT, elapsed);
        fade += Math.max(-dt / 0.6, Math.min(dt / 0.6, target - fade));
        if (lastTheme !== themeRef.current) {
          lastTheme = themeRef.current;
          ink = getComputedStyle(document.documentElement)
            .getPropertyValue("--color-accent-dim")
            .trim();
        }
        const lightOnly = fade === 1;
        sim.count = Math.ceil(
          (small ? (lightOnly ? 5 : 10) : lightOnly ? 10 : 20) / (constrained ? 2 : 1)
        );
        // Hidden members of the smaller light field cannot occupy one of the landing slots.
        for (let i = sim.count; i < sim.creatures.length; i++) {
          sim.creatures[i].slot = -1;
          sim.creatures[i].settled = false;
        }
        stepSimulation(sim, elapsed);
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      accumulated = 0;
      sinceDraw = 0;
      leavePointer(sim);
      if (!document.hidden && !reduced) frame = requestAnimationFrame(tick);
    };
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !finePointer.matches || reduced) return;
      movePointer(sim, event.clientX, event.clientY);
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !reduced)
        movePointer(sim, event.clientX, event.clientY, false);
    };
    const leave = () => leavePointer(sim);
    const pointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) leave();
    };
    resize();
    draw();
    if (!document.hidden && !reduced) frame = requestAnimationFrame(tick);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerout", pointerOut, { passive: true });
    window.addEventListener("blur", leave, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerout", pointerOut);
      window.removeEventListener("blur", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [reduced, failed]);

  if (failed || reduced) return null;
  // Above the page art (main is z-10) so a creature perched on the cursor is never hidden
  // behind a plate; below the fixed header (z-50). Over body copy the draw loop dims them.
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ambient-creatures=""
      className="pointer-events-none fixed inset-0 z-20 h-full w-full"
    />
  );
}
