import { motion, useScroll, useTransform } from 'framer-motion';
import { Seo } from '@/components/Seo';
import { useStore } from '@/store/useStore';
import { ConfigPanel } from '@/components/ConfigPanel';

export default function Home() {
  const scrollProgress = useStore((state) => state.scrollProgress);

  return (
    <>
      <Seo title="Akshay | Cosmic Intelligence" description="Cinematic God-Tier Portfolio" path="/" />

      <ConfigPanel />

      <div className="relative w-full text-white selection:bg-white/20">
        
        {/* Scene 1 — Genesis / Consciousness (0 - 50vh) */}
        <section className="h-[200vh] relative flex flex-col items-center justify-center pointer-events-none">
          <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              className="text-center mix-blend-difference"
            >
              <h1 className="text-6xl sm:text-8xl md:text-9xl font-display font-bold tracking-tighter uppercase leading-[0.85] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                Akshay Borse
              </h1>
              <motion.p 
                className="mt-6 text-sm sm:text-lg md:text-xl font-mono text-white/60 tracking-[0.2em] uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 1 }}
              >
                Intelligence Becoming Visible
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Scene 3 — Systems (200vh - 400vh) */}
        <section className="h-[200vh] relative">
          <div className="sticky top-0 h-screen w-full flex items-center p-8 md:p-24">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-display font-semibold mb-6">
                LIVING SYSTEMS
              </h2>
              <p className="text-lg text-white/50 leading-relaxed font-sans">
                The world is not a collection of static pages. It is a reactive simulation, an evolving architecture of thoughts and logic mapped into interactive structures.
              </p>
              <div className="mt-12 flex flex-col gap-4">
                {['Architect', 'Developer', 'Creator'].map((item, i) => (
                  <div key={item} className="flex items-center gap-4 group cursor-pointer pointer-events-auto">
                    <div className="h-[1px] w-12 bg-white/20 group-hover:w-24 group-hover:bg-white transition-all duration-500 ease-out" />
                    <span className="font-mono uppercase tracking-widest text-sm text-white/40 group-hover:text-white transition-colors">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Padding for further scroll */}
        <div className="h-[100vh]" />

      </div>
    </>
  );
}
