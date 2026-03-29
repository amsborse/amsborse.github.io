import { useEffect, useState } from "react";

/** Passive scroll position for lightweight parallax (pixels). */
export function useScrollOffset(active: boolean): number {
  const [y, setY] = useState(0);

  useEffect(() => {
    if (!active) {
      setY(0);
      return;
    }

    let raf = 0;
    const tick = () => {
      setY(window.scrollY);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [active]);

  return active ? y : 0;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return reduced;
}

/** Parallax only on md+ and when user has not requested reduced motion. */
export function useParallaxEnabled(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false,
  );
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setWide(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return wide && !reduced;
}
