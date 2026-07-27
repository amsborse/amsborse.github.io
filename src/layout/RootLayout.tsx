import { lazy, Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Lenis from "lenis";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { isImmersiveSandbox, shouldDisableGlobalEffects } from "@/layout/immersiveRoutes";
import { readFlashcardAnimationPriority } from "@/lib/flashcardAnimationPriority";

const LazyInteractiveParticles = lazy(() =>
  import("@/components/InteractiveParticles").then((mod) => ({
    default: mod.InteractiveParticles,
  }))
);

function PageSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        <span className="font-mono text-sm tracking-wider text-[var(--color-ink-muted)]">
          Loading…
        </span>
      </div>
    </div>
  );
}

export function RootLayout() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const isHome = location.pathname === "/";
  const isImmersive = isImmersiveSandbox(location.pathname);
  const disableGlobalEffects = shouldDisableGlobalEffects(location.pathname);

  useEffect(() => {
    if (disableGlobalEffects || prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
    });

    let rafId = 0;
    let paused = document.hidden;

    const onVisibility = () => {
      paused = document.hidden;
    };

    document.addEventListener("visibilitychange", onVisibility);

    function raf(time: number) {
      const { motion: flashcardMotion } = readFlashcardAnimationPriority();
      if (!paused && !flashcardMotion) lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [disableGlobalEffects, prefersReducedMotion, location.pathname]);

  return (
    <div
      className={`relative flex flex-col ${isImmersive ? "h-dvh overflow-hidden" : "min-h-screen overflow-hidden"}`}
      style={{ background: "transparent" }}
    >
      {!disableGlobalEffects ? (
        <Suspense fallback={null}>
          <LazyInteractiveParticles intensity="intense" />
        </Suspense>
      ) : null}
      {isHome ? (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[var(--color-bg)]" aria-hidden />
      ) : null}
      <a
        href="#main"
        className="absolute left-[-9999px] top-4 z-[100] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-ink)] shadow-sm focus:left-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main"
        className={`relative z-10 ${isImmersive ? "min-h-0 flex-1 overflow-hidden" : "flex-1"}`}
        tabIndex={-1}
      >
        <motion.div
          key={location.pathname}
          className={isImmersive ? "flex h-full min-h-0 flex-col" : undefined}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReducedMotion ? { duration: 0 } : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>
      {!isImmersive && <Footer />}
    </div>
  );
}
