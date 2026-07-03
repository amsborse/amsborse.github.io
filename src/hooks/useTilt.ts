import { useEffect, useRef, type RefObject } from "react";

interface TiltOptions {
  maxRotation?: number; // max tilt degrees (default: 8)
  perspective?: number; // 3D depth perception (default: 1000)
  scale?: number; // scale up on hover (default: 1.02)
  speed?: number; // transition speed in ms (default: 400)
}

export function useTilt<T extends HTMLElement>(options: TiltOptions = {}): RefObject<T | null> {
  const elementRef = useRef<T>(null);

  const { maxRotation = 8, perspective = 1000, scale = 1.02, speed = 400 } = options;

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Check if prefers-reduced-motion is active
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let width = 0;
    let height = 0;
    let left = 0;
    let top = 0;
    let isHovering = false;
    let rafId = 0;

    const handleMouseEnter = () => {
      isHovering = true;
      el.style.transition = `transform ${speed}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      const rect = el.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      left = rect.left + window.scrollX;
      top = rect.top + window.scrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovering) return;
      cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        // Current mouse position relative to page
        const mouseX = e.pageX;
        const mouseY = e.pageY;

        // Position relative to element center
        const relX = mouseX - left - width / 2;
        const relY = mouseY - top - height / 2;

        // Normalised coordinates (-1 to 1)
        const normX = relX / (width / 2);
        const normY = relY / (height / 2);

        // Calculate rotation angles
        const tiltX = -(normY * maxRotation).toFixed(2);
        const tiltY = (normX * maxRotation).toFixed(2);

        // Apply 3D transform
        el.style.transform = `perspective(${perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      });
    };

    const handleMouseLeave = () => {
      isHovering = false;
      cancelAnimationFrame(rafId);
      el.style.transition = `transform ${speed * 1.5}ms cubic-bezier(0.25, 1, 0.5, 1)`;
      el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [maxRotation, perspective, scale, speed]);

  return elementRef;
}
