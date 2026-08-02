import { useEffect, useRef, useState } from "react";
import { readFlashcardAnimationPriority } from "@/lib/flashcardAnimationPriority";

interface Particle {
  x: number; // relative baseline x coordinate
  y: number; // relative baseline y coordinate
  vx: number;
  vy: number;
  radius: number;
  color: string;
  depth: number; // 3D layer depth: background (0.3), midground (0.7), foreground (1.2)
  angle: number; // angle for horizontal sine wobble
  angleSpeed: number; // speed of horizontal wobble
  wobbleIntensity: number;
  offsetX: number; // mouse attraction offset x
  offsetY: number; // mouse attraction offset y
  lifePhase: number;
  pulseSpeed: number;
  influence: number;
  interactionCharge: -1 | 1;
}

interface InteractiveParticlesProps {
  intensity?: "normal" | "intense";
}

export function InteractiveParticles({ intensity = "normal" }: InteractiveParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false, isClicked: false, clickTime: 0 });
  const scrollRef = useRef({ lastScrollY: 0, velocity: 0 });
  const [mounted, setMounted] = useState(false);
  const [themeMode, setThemeMode] = useState<string>("dark");

  useEffect(() => {
    setMounted(true);
    const updateTheme = () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      setThemeMode(current);
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReducedMotion = mediaQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    let animationFrameId: number;
    let resizeFrameId = 0;
    let width = 0;
    let height = 0;
    let lastDpr = window.devicePixelRatio || 1;
    let viewportScale = 1;
    let particles: Particle[] = [];
    let elapsedFrames = 0;

    // Calibrate density against a 1920×1080 reference so the mesh stays equally rich on large displays.
    const REFERENCE_AREA = 1920 * 1080;
    const INTENSE_PARTICLES_AT_REFERENCE = 240;
    const NORMAL_PARTICLES_AT_REFERENCE = 110;

    const getViewportScale = () => {
      const area = Math.max(width * height, 1);
      return Math.sqrt(area / REFERENCE_AREA);
    };

    const getParticleCount = () => {
      const isIntense = intensity === "intense";
      const area = Math.max(width * height, 1);
      const areaScale = area / REFERENCE_AREA;
      const target = Math.round(
        (isIntense ? INTENSE_PARTICLES_AT_REFERENCE : NORMAL_PARTICLES_AT_REFERENCE) * areaScale
      );
      const min = isIntense ? 120 : 60;
      const max = isIntense ? 900 : 420;
      return Math.min(max, Math.max(min, target));
    };

    const isLightMode = document.documentElement.getAttribute("data-theme") === "light";

    // Theme-aware particle color palette
    const colors = isLightMode
      ? {
          bg: [
            "rgba(2, 132, 199, 0.28)", // Soft Sky Blue
            "rgba(194, 65, 12, 0.24)", // Warm Terracotta / Burnt Amber
          ],
          mid: [
            "rgba(2, 132, 199, 0.52)", // Azure Blue
            "rgba(180, 83, 9, 0.50)", // Warm Amber Gold
            "rgba(126, 34, 206, 0.44)", // Warm Violet
          ],
          fg: [
            "rgba(3, 105, 161, 0.85)", // Deep Cyan-Blue
            "rgba(194, 65, 12, 0.82)", // Vibrant Warm Terracotta
            "rgba(180, 83, 9, 0.82)", // Rich Gold
            "rgba(15, 118, 110, 0.78)", // Emerald Teal
          ],
        }
      : {
          bg: [
            "rgba(56, 189, 248, 0.16)", // Neon Cyan faint
            "rgba(168, 85, 247, 0.14)", // Neon Purple faint
          ],
          mid: [
            "rgba(56, 189, 248, 0.35)", // Neon Cyan medium
            "rgba(245, 158, 11, 0.3)", // Cosmic Gold medium
            "rgba(168, 85, 247, 0.28)", // Purple medium
          ],
          fg: [
            "rgba(56, 189, 248, 0.72)", // Neon Cyan bright
            "rgba(245, 158, 11, 0.65)", // Cosmic Gold bright
            "rgba(236, 72, 153, 0.65)", // Nebula Pink bright
            "rgba(74, 222, 128, 0.58)", // Living green bright
          ],
        };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = rect.width;
      const nextHeight = rect.height;

      if (nextWidth < 1 || nextHeight < 1) return;

      const sizeChanged =
        Math.abs(nextWidth - width) > 0.5 || Math.abs(nextHeight - height) > 0.5 || dpr !== lastDpr;

      if (!sizeChanged && particles.length > 0) return;

      width = nextWidth;
      height = nextHeight;
      lastDpr = dpr;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewportScale = getViewportScale();
      initParticles();
    };

    const scheduleResize = () => {
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = 0;
        resize();
      });
    };

    const initParticles = () => {
      const isIntense = intensity === "intense";
      const count = getParticleCount();
      particles = [];

      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let depth = 0.7; // midground
        let radius = Math.random() * 1.0 + 1.0;
        let colorArray = colors.mid;
        let baseVy = -(Math.random() * 0.15 + 0.15); // float upwards

        if (rand < 0.4) {
          // Background
          depth = 0.35;
          radius = Math.random() * 0.5 + 0.6;
          colorArray = colors.bg;
          baseVy = -(Math.random() * 0.08 + 0.08);
        } else if (rand > (isIntense ? 0.78 : 0.88)) {
          // Foreground
          depth = 1.3;
          radius = Math.random() * (isIntense ? 1.8 : 1.2) + 2.0;
          colorArray = colors.fg;
          baseVy = -(Math.random() * 0.25 + 0.25);
        }

        particles.push({
          x: Math.random() * width,
          y: Math.random() * (height + 300) - 150,
          vx: (Math.random() - 0.5) * 0.25,
          vy: baseVy,
          radius,
          color: colorArray[Math.floor(Math.random() * colorArray.length)],
          depth,
          angle: Math.random() * Math.PI * 2,
          angleSpeed: Math.random() * 0.02 + 0.005,
          wobbleIntensity: Math.random() * 0.15 + 0.05,
          offsetX: 0,
          offsetY: 0,
          lifePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.025 + 0.01,
          influence: 0,
          interactionCharge: Math.random() > 0.48 ? 1 : -1,
        });
      }
    };

    const draw = () => {
      if (width < 1 || height < 1) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      const { motion: flashcardMotion, focused: flashcardFocused } =
        readFlashcardAnimationPriority();
      const throttleBackground = flashcardMotion || flashcardFocused;

      if (throttleBackground && elapsedFrames % 2 !== 0) {
        elapsedFrames += isReducedMotion ? 0 : 1;
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - scrollRef.current.lastScrollY;
      scrollRef.current.lastScrollY = currentScrollY;

      scrollRef.current.velocity = scrollRef.current.velocity * 0.92 + scrollDiff * 0.08;
      const velocityImpact = Math.min(Math.max(scrollRef.current.velocity * 0.22, -15), 15);
      elapsedFrames += isReducedMotion ? 0 : 1;

      // Calculate gradual buildup gravity physics (starts extremely slow to avoid distraction on random clicks)
      const holdDuration = mouseRef.current.isClicked ? Date.now() - mouseRef.current.clickTime : 0;
      const rawFactor = Math.min(1, holdDuration / 1500); // 1.5s to reach full strength
      const easeFactor = Math.pow(rawFactor, 4); // Quartic ease-in curve (extremely slow start, fast finish)
      const attractionStrength = easeFactor * 0.22; // starts at 0.0, reaches 0.22

      const skipPointerPhysics = flashcardMotion || isReducedMotion;

      const renderedParticles = particles.map((p) => {
        if (!isReducedMotion) {
          const activeVy = p.vy - velocityImpact * p.depth * 0.08;
          p.y += activeVy;
          p.x += p.vx + Math.sin(p.angle) * p.wobbleIntensity;
          p.angle += p.angleSpeed;

          // Wrap boundaries
          if (p.y < -150) {
            p.y = height + 150;
            p.x = Math.random() * width;
            p.offsetX = 0;
            p.offsetY = 0;
          } else if (p.y > height + 150) {
            p.y = -150;
            p.x = Math.random() * width;
            p.offsetX = 0;
            p.offsetY = 0;
          }

          if (p.x < -50) p.x = width + 50;
          if (p.x > width + 50) p.x = -50;
        }

        // Apply scroll-parallax vertical offset to visual coordinate
        const visualY = p.y - currentScrollY * p.depth * 0.12;

        let wrappedVisualY = visualY;
        const padding = 150;
        const wrapHeight = height + padding * 2;
        wrappedVisualY = ((((visualY + padding) % wrapHeight) + wrapHeight) % wrapHeight) - padding;

        // Click gathers the mesh; hovering only disturbs nearby life into mixed responses.
        if (mouseRef.current.active && !skipPointerPhysics) {
          if (mouseRef.current.isClicked) {
            // Target coordinate relative to pointer
            const targetOffsetX = mouseRef.current.x - p.x;
            const targetOffsetY = mouseRef.current.y - wrappedVisualY;

            // Move offset towards target with speed building up gradually over time
            p.offsetX += (targetOffsetX - p.offsetX) * attractionStrength * p.depth;
            p.offsetY += (targetOffsetY - p.offsetY) * attractionStrength * p.depth;
          } else {
            // Decay offsets back to 0 smoothly
            p.offsetX += (0 - p.offsetX) * 0.075;
            p.offsetY += (0 - p.offsetY) * 0.075;

            // Hover leaves a soft trace: some nodes lean in, others push away, then all settle.
            const currentX = p.x + p.offsetX;
            const currentY = wrappedVisualY + p.offsetY;
            const dx = mouseRef.current.x - currentX;
            const dy = mouseRef.current.y - currentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 105 * viewportScale;

            if (dist < maxDist) {
              const force = (maxDist - dist) / maxDist;
              const safeDist = Math.max(dist, 0.001);
              const direction = p.interactionCharge;
              const responseStrength = direction > 0 ? 1.65 : 3.1;
              const bend = Math.sin(p.lifePhase + elapsedFrames * p.pulseSpeed) * force * 1.35;

              p.offsetX += (dx / safeDist) * force * responseStrength * p.depth * direction;
              p.offsetY += (dy / safeDist) * force * responseStrength * p.depth * direction;
              p.offsetX += (-dy / safeDist) * bend * p.depth;
              p.offsetY += (dx / safeDist) * bend * p.depth;
              p.influence = Math.max(p.influence, force);
            }
          }
        } else {
          // No mouse active, decay offsets back to 0
          p.offsetX += (0 - p.offsetX) * 0.075;
          p.offsetY += (0 - p.offsetY) * 0.075;
        }

        p.influence *= 0.92;

        return {
          ...p,
          visualX: p.x + p.offsetX,
          visualY: wrappedVisualY + p.offsetY,
        };
      });

      // Draw Particles
      renderedParticles.forEach((p) => {
        const livingPulse = isReducedMotion
          ? 0
          : (Math.sin(p.lifePhase + elapsedFrames * p.pulseSpeed) + 1) * 0.5;
        const influenceGlow = Math.min(1, p.influence);
        const particleRadius = p.radius + livingPulse * 0.45 + influenceGlow * 1.3 * p.depth;

        ctx.beginPath();
        ctx.arc(p.visualX, p.visualY, particleRadius, 0, Math.PI * 2);
        const activeColor = isLightMode
          ? `rgba(180, 83, 9, ${0.45 + influenceGlow * 0.45})`
          : `rgba(167, 243, 208, ${0.3 + influenceGlow * 0.55})`;
        ctx.fillStyle = influenceGlow > 0.08 ? activeColor : p.color;

        if (p.depth > 0.6) {
          ctx.shadowBlur = (isLightMode ? 4 : 8) + influenceGlow * 12;
          ctx.shadowColor =
            influenceGlow > 0.08
              ? isLightMode
                ? "rgba(180, 83, 9, 0.6)"
                : "rgba(74, 222, 128, 0.75)"
              : p.color;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      });
      ctx.shadowBlur = 0; // reset

      // Draw Constellation Lines (within same depth layer to preserve parallax layers)
      ctx.lineWidth = 0.8;
      for (let i = 0; i < renderedParticles.length; i++) {
        const p1 = renderedParticles[i];
        for (let j = i + 1; j < renderedParticles.length; j++) {
          const p2 = renderedParticles[j];

          if (Math.abs(p1.depth - p2.depth) > 0.4) continue;

          const isIntense = intensity === "intense";
          const dx = p1.visualX - p2.visualX;
          const dy = p1.visualY - p2.visualY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const baseMaxDist = (p1.depth > 0.8 ? 120 : 85) * viewportScale;
          const maxLinkDist = isIntense ? baseMaxDist * 1.35 : baseMaxDist;

          if (dist < maxLinkDist) {
            const influence = Math.max(p1.influence, p2.influence);
            const alpha =
              ((maxLinkDist - dist) / maxLinkDist) *
              (p1.depth > 0.8 ? (isIntense ? 0.75 : 0.55) : isIntense ? 0.55 : 0.35) *
              (1 + influence * 0.75);

            if (isLightMode) {
              ctx.strokeStyle =
                influence > 0.08
                  ? `rgba(180, 83, 9, ${Math.min(0.9, alpha + influence * 0.35)})`
                  : p1.depth > 0.8
                    ? `rgba(2, 132, 199, ${alpha * 0.85})`
                    : `rgba(194, 65, 12, ${alpha * 0.85})`;
            } else {
              ctx.strokeStyle =
                influence > 0.08
                  ? `rgba(167, 243, 208, ${Math.min(0.9, alpha + influence * 0.35)})`
                  : p1.depth > 0.8
                    ? `rgba(56, 189, 248, ${alpha})`
                    : `rgba(245, 158, 11, ${alpha})`;
            }

            ctx.lineWidth = 0.8 + influence * 1.15;
            ctx.beginPath();
            ctx.moveTo(p1.visualX, p1.visualY);
            ctx.lineTo(p2.visualX, p2.visualY);
            ctx.stroke();
          }
        }

        // Draw connections to mouse cursor
        const isIntense = intensity === "intense";
        const maxMouseDist = (isIntense ? 200 : 140) * viewportScale;
        if (mouseRef.current.active && p1.depth > 0.6) {
          const mdx = mouseRef.current.x - p1.visualX;
          const mdy = mouseRef.current.y - p1.visualY;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < maxMouseDist) {
            const alpha =
              ((maxMouseDist - mdist) / maxMouseDist) * (isIntense ? 0.8 : 0.58) * p1.depth;
            ctx.strokeStyle = isLightMode
              ? `rgba(2, 132, 199, ${alpha * 0.95})`
              : `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = isIntense ? 1.25 : 0.85;
            ctx.beginPath();
            ctx.moveTo(p1.visualX, p1.visualY);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.stroke();
          }
        }
      }

      if (mouseRef.current.active && !isReducedMotion) {
        const rippleRadius = (36 + Math.sin(elapsedFrames * 0.06) * 9) * viewportScale;
        const gradient = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          rippleRadius
        );
        if (isLightMode) {
          gradient.addColorStop(0, "rgba(180, 83, 9, 0.22)");
          gradient.addColorStop(0.45, "rgba(2, 132, 199, 0.14)");
          gradient.addColorStop(1, "rgba(2, 132, 199, 0)");
        } else {
          gradient.addColorStop(0, "rgba(167, 243, 208, 0.2)");
          gradient.addColorStop(0.45, "rgba(56, 189, 248, 0.1)");
          gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, rippleRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.isClicked = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.isClicked = true;
      mouseRef.current.clickTime = Date.now();
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseUp = () => {
      mouseRef.current.isClicked = false;
    };

    // Mobile touch support
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      mouseRef.current.isClicked = true;
      mouseRef.current.clickTime = Date.now();
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - rect.left;
      mouseRef.current.y = e.touches[0].clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.touches[0].clientX - rect.left;
      mouseRef.current.y = e.touches[0].clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleTouchEnd = () => {
      mouseRef.current.isClicked = false;
      mouseRef.current.active = false;
    };

    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(canvas);

    window.addEventListener("resize", scheduleResize);
    window.visualViewport?.addEventListener("resize", scheduleResize);
    window.addEventListener("orientationchange", scheduleResize);
    window.addEventListener("mousemove", handleMouseMove, { capture: true, passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { capture: true });
    window.addEventListener("mousedown", handleMouseDown, { capture: true, passive: true });
    window.addEventListener("mouseup", handleMouseUp, { capture: true, passive: true });

    // Touch listeners
    window.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", handleTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", handleTouchEnd, { capture: true, passive: true });

    scheduleResize();
    draw();

    return () => {
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleResize);
      window.visualViewport?.removeEventListener("resize", scheduleResize);
      window.removeEventListener("orientationchange", scheduleResize);
      window.removeEventListener("mousemove", handleMouseMove, { capture: true });
      document.removeEventListener("mouseleave", handleMouseLeave, { capture: true });
      window.removeEventListener("mousedown", handleMouseDown, { capture: true });
      window.removeEventListener("mouseup", handleMouseUp, { capture: true });

      window.removeEventListener("touchstart", handleTouchStart, { capture: true });
      window.removeEventListener("touchmove", handleTouchMove, { capture: true });
      window.removeEventListener("touchend", handleTouchEnd, { capture: true });

      mediaQuery.removeEventListener("change", handleMotionChange);
      cancelAnimationFrame(animationFrameId);
    };
  }, [intensity, themeMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        mixBlendMode: themeMode === "light" ? "normal" : "screen",
        opacity: mounted ? (intensity === "intense" ? 0.95 : 0.85) : 0,
        transition: "opacity 2.5s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    />
  );
}
