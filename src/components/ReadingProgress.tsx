import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/useParallax";

/**
 * Subtle reading progress — hidden entirely when `prefers-reduced-motion: reduce`
 * so scroll-linked UI does not run for those users.
 */
export function ReadingProgress() {
  const reducedMotion = usePrefersReducedMotion();
  const [p, setP] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    const el = document.getElementById("article-body");
    const onScroll = () => {
      const scrollTop = el ? el.scrollTop : window.scrollY;
      const height = el
        ? el.scrollHeight - el.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const next = height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0;
      setP(next);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    el?.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      el?.removeEventListener("scroll", onScroll);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-px bg-[var(--color-border)]/60"
      aria-hidden
    >
      <div
        className="reading-progress-fill h-full bg-[var(--color-accent)]/30"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}
