import { motion } from "framer-motion";
import { Seo } from "@/components/Seo";

export default function Home() {
  return (
    <>
      <Seo
        title="Akshay | Cosmic Intelligence"
        description="Cinematic God-Tier Portfolio"
        path="/"
      />

      <div className="home-page relative w-full selection:bg-[var(--color-accent-soft)]">
        <section className="h-[200vh] relative flex flex-col pointer-events-none">
          <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="home-hero-blend text-center"
            >
              <h1 className="home-hero-title text-6xl sm:text-8xl md:text-9xl">Akshay Borse</h1>
              <motion.p
                className="mt-6 text-sm sm:text-lg md:text-xl font-mono text-[var(--color-ink-muted)] tracking-[0.2em] uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 1 }}
              >
                Creativity is a choice to see the world differently and create your own reality
              </motion.p>
            </motion.div>
          </div>
        </section>

        <section className="h-[200vh] relative">
          <div className="sticky top-0 h-screen w-full flex items-center p-8 md:p-24">
            <div className="max-w-2xl">
              <h2 className="theme-heading text-4xl md:text-6xl font-display font-semibold mb-6">
                LIVING SYSTEMS
              </h2>
              <p className="text-lg text-[var(--color-body)] leading-relaxed font-sans">
                Life is a living network. Whether we mean to or not, every move sends a signal,
                bending what touches us and quietly rewriting the world around us.
              </p>
              <div className="mt-12 flex flex-col gap-4">
                {["Architect", "Developer", "Creator"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 group cursor-pointer pointer-events-auto"
                  >
                    <div className="h-[1px] w-12 bg-[var(--color-border-strong)] group-hover:w-24 group-hover:bg-[var(--color-ink)] transition-all duration-500 ease-out" />
                    <span className="font-mono uppercase tracking-widest text-sm text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="h-[100vh]" />
      </div>
    </>
  );
}
