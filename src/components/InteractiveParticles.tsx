import { useEffect, useRef } from "react";

interface Particle {
  x: number;          // relative baseline x coordinate
  y: number;          // relative baseline y coordinate
  vx: number;
  vy: number;
  radius: number;
  color: string;
  depth: number;      // 3D layer depth: background (0.3), midground (0.7), foreground (1.2)
  angle: number;      // angle for horizontal sine wobble
  angleSpeed: number; // speed of horizontal wobble
  wobbleIntensity: number;
  offsetX: number;    // mouse attraction offset x
  offsetY: number;    // mouse attraction offset y
}

interface InteractiveParticlesProps {
  intensity?: "normal" | "intense";
}

export function InteractiveParticles({ intensity = "normal" }: InteractiveParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false, isClicked: false, clickTime: 0 });
  const scrollRef = useRef({ lastScrollY: 0, velocity: 0 });

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
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    // Neon Cosmic Theme colors (Cyan, Purple, Gold)
    const colors = {
      bg: [
        "rgba(56, 189, 248, 0.16)",   // Neon Cyan faint
        "rgba(168, 85, 247, 0.14)",   // Neon Purple faint
      ],
      mid: [
        "rgba(56, 189, 248, 0.35)",   // Neon Cyan medium
        "rgba(245, 158, 11, 0.3)",    // Cosmic Gold medium
        "rgba(168, 85, 247, 0.28)",   // Purple medium
      ],
      fg: [
        "rgba(56, 189, 248, 0.72)",   // Neon Cyan bright
        "rgba(245, 158, 11, 0.65)",   // Cosmic Gold bright
        "rgba(236, 72, 153, 0.65)",   // Nebula Pink bright
      ],
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    const initParticles = () => {
      const isIntense = intensity === "intense";
      const baseCount = isIntense ? Math.floor(width * 0.18) : Math.floor(width * 0.09);
      const count = Math.min(baseCount, isIntense ? 240 : 110);
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
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - scrollRef.current.lastScrollY;
      scrollRef.current.lastScrollY = currentScrollY;
      
      scrollRef.current.velocity = scrollRef.current.velocity * 0.92 + scrollDiff * 0.08;
      const velocityImpact = Math.min(Math.max(scrollRef.current.velocity * 0.22, -15), 15);

      // Calculate gradual buildup gravity physics (starts extremely slow to avoid distraction on random clicks)
      const holdDuration = mouseRef.current.isClicked ? Date.now() - mouseRef.current.clickTime : 0;
      const rawFactor = Math.min(1, holdDuration / 1500); // 1.5s to reach full strength
      const easeFactor = Math.pow(rawFactor, 4); // Quartic ease-in curve (extremely slow start, fast finish)
      const attractionStrength = easeFactor * 0.22; // starts at 0.0, reaches 0.22

      const renderedParticles = particles.map((p) => {
        if (!isReducedMotion) {
          const activeVy = p.vy - (velocityImpact * p.depth * 0.08);
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
        const visualY = p.y - (currentScrollY * p.depth * 0.12);

        let wrappedVisualY = visualY;
        const padding = 150;
        const wrapHeight = height + padding * 2;
        wrappedVisualY = ((visualY + padding) % wrapHeight + wrapHeight) % wrapHeight - padding;

        // Apply magnetic mouse attraction when clicked, or gentle repulsion when not clicked
        if (mouseRef.current.active && !isReducedMotion) {
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

            // Apply standard gentle repulsion
            const currentX = p.x + p.offsetX;
            const currentY = wrappedVisualY + p.offsetY;
            const dx = mouseRef.current.x - currentX;
            const dy = mouseRef.current.y - currentY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 140;

            if (dist < maxDist) {
              const force = (maxDist - dist) / maxDist;
              // Push outwards slightly
              p.offsetX -= (dx / dist) * force * 4.5 * p.depth;
              p.offsetY -= (dy / dist) * force * 4.5 * p.depth;
            }
          }
        } else {
          // No mouse active, decay offsets back to 0
          p.offsetX += (0 - p.offsetX) * 0.075;
          p.offsetY += (0 - p.offsetY) * 0.075;
        }

        return {
          ...p,
          visualX: p.x + p.offsetX,
          visualY: wrappedVisualY + p.offsetY,
        };
      });

      // Draw Particles
      renderedParticles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.visualX, p.visualY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        if (p.depth > 0.6) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
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
          const baseMaxDist = p1.depth > 0.8 ? 120 : 85;
          const maxLinkDist = isIntense ? baseMaxDist * 1.35 : baseMaxDist;

          if (dist < maxLinkDist) {
            const alpha = ((maxLinkDist - dist) / maxLinkDist) * (p1.depth > 0.8 ? (isIntense ? 0.75 : 0.55) : (isIntense ? 0.55 : 0.35));
            
            ctx.strokeStyle = p1.depth > 0.8 
              ? `rgba(56, 189, 248, ${alpha})`
              : `rgba(245, 158, 11, ${alpha})`;
            
            ctx.beginPath();
            ctx.moveTo(p1.visualX, p1.visualY);
            ctx.lineTo(p2.visualX, p2.visualY);
            ctx.stroke();
          }
        }

        // Draw connections to mouse cursor
        const isIntense = intensity === "intense";
        const maxMouseDist = isIntense ? 200 : 140;
        if (mouseRef.current.active && p1.depth > 0.6) {
          const mdx = mouseRef.current.x - p1.visualX;
          const mdy = mouseRef.current.y - p1.visualY;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);

          if (mdist < maxMouseDist) {
            const alpha = ((maxMouseDist - mdist) / maxMouseDist) * (isIntense ? 0.8 : 0.58) * p1.depth;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = isIntense ? 1.25 : 0.85;
            ctx.beginPath();
            ctx.moveTo(p1.visualX, p1.visualY);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.stroke();
          }
        }
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

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { capture: true, passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { capture: true });
    window.addEventListener("mousedown", handleMouseDown, { capture: true, passive: true });
    window.addEventListener("mouseup", handleMouseUp, { capture: true, passive: true });
    
    // Touch listeners
    window.addEventListener("touchstart", handleTouchStart, { capture: true, passive: true });
    window.addEventListener("touchmove", handleTouchMove, { capture: true, passive: true });
    window.addEventListener("touchend", handleTouchEnd, { capture: true, passive: true });

    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
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
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: "screen", opacity: intensity === "intense" ? 0.95 : 0.85 }}
    />
  );
}
