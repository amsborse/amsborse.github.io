import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export function ConfigPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    showGodSphere,
    setShowGodSphere,
  } = useStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-4 w-72 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-white/80">
                Simulation Controls
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white transition-colors duration-200"
                aria-label="Close panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Toggle for God Sphere */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white/90">God Sphere</span>
                  <span className="text-[10px] font-mono text-white/45">Core anomaly geometry</span>
                </div>
                <button
                  onClick={() => setShowGodSphere(!showGodSphere)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                    showGodSphere ? 'bg-[#9333ea] shadow-[0_0_8px_rgba(147,51,234,0.5)]' : 'bg-white/10'
                  }`}
                  aria-label="Toggle God Sphere"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                      showGodSphere ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/80 shadow-lg backdrop-blur-md hover:border-white/20 hover:text-white transition-colors duration-300"
        aria-label="Open settings"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-500 ${isOpen ? 'rotate-90 text-[#3b82f6]' : ''}`}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </motion.button>
    </div>
  );
}
