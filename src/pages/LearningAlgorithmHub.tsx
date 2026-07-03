import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { ALGORITHM_CATEGORIES } from "@/data/algorithmCategories";

export default function LearningAlgorithmHub() {
  return (
    <>
      <Seo
        title="Algorithm Sandboxes — Learning Lab"
        description="Interactive visualizations for sorting, search, graphs, dynamic programming, greedy methods, and tree structures."
        path="/learning/algorithm"
      />

      <div className="min-h-screen relative overflow-x-hidden pb-32 pt-20 bg-transparent text-[#f1f3f7] font-sans">
        <div className="absolute top-[-10%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-bl from-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <Link
            to="/learning"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors mb-10"
          >
            ← Learning Lab
          </Link>

          <header className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-3"
            >
              CS Fundamentals // Visualized
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-[2rem] sm:text-[2.75rem] font-display font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8]"
            >
              Algorithm Visualizer Hub
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-sm max-w-xl mx-auto text-slate-400 leading-relaxed"
            >
              Pick a category to launch an interactive sandbox. Sorting opens the full multi-theme
              visualizer; each other card runs a focused simulation you can step through.
            </motion.p>
          </header>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {ALGORITHM_CATEGORIES.map((topic, index) => (
              <LearningInteractiveCard key={topic.id} topic={topic} index={index} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
