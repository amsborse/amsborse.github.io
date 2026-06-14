import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { InteractiveParticles } from "@/components/InteractiveParticles";
import { AetherCoordinator } from "@/components/AetherCoordinator";

export function RootLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      <InteractiveParticles />
      <AetherCoordinator />
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
