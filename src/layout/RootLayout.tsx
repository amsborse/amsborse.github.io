import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { InteractiveParticles } from "@/components/InteractiveParticles";
import Lenis from "lenis";
import { useStore } from "@/store/useStore";
import { useMouseVelocity } from "@/hooks/useMouseVelocity";

export function RootLayout() {
  const location = useLocation();
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  useMouseVelocity();

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenis.on('scroll', (e: any) => {
      setScrollProgress(e.progress);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [setScrollProgress]);

  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden" style={{ background: 'transparent' }}>
      <InteractiveParticles intensity="intense" />
      {isHome && (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[#050505]" aria-hidden />
      )}
      <a
        href="#main"
        className="absolute left-[-9999px] top-4 z-[100] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-ink)] shadow-sm focus:left-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1 relative z-10" tabIndex={-1}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
