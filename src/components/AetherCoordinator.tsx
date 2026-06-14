import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

export function AetherCoordinator() {
  const location = useLocation();

  // Features Toggles
  const [singularity, setSingularity] = useState(false);
  const [chronometer, setChronometer] = useState(true);
  const [zenSand, setZenSand] = useState(false);
  const [soundscape, setSoundscape] = useState(false);
  const [scaleParallax, setScaleParallax] = useState(false);

  // UI States
  const [menuOpen, setMenuOpen] = useState(false);
  const [singularityState, setSingularityState] = useState<"idle" | "contracting" | "expanding">("idle");
  const [lastPathname, setLastPathname] = useState(location.pathname);

  // Canvas Ref for Zen Sand
  const sandCanvasRef = useRef<HTMLCanvasElement>(null);
  const sandParticles = useRef<SandParticle[]>([]);

  // Web Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // 1. Cosmic Singularity Transition (Bypassed by default to prevent flashes)
  useEffect(() => {
    if (location.pathname === lastPathname) return;
    
    if (singularity) {
      setSingularityState("contracting");
      
      setTimeout(() => {
        setLastPathname(location.pathname);
        setSingularityState("expanding");
        
        setTimeout(() => {
          setSingularityState("idle");
        }, 350);
      }, 300);
    } else {
      setLastPathname(location.pathname);
    }
  }, [location.pathname, lastPathname, singularity]);

  // 2. Scale Parallax Scroll listener (Bypassed to keep natural scroll flow)
  useEffect(() => {
    const mainEl = document.getElementById("main");
    if (mainEl) {
      mainEl.style.transform = "none";
    }
  }, [scaleParallax]);

  // 3. Web Audio Synth setup
  useEffect(() => {
    if (!soundscape) {
      cleanupAudio();
      return;
    }

    const initAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const delay = ctx.createDelay();
        const feedback = ctx.createGain();

        // Soft celestial sine/triangle wave blend
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3

        // Keep it soft & luxurious
        gain.gain.setValueAtTime(0.0, ctx.currentTime);
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        // Feedback Delay line
        delay.delayTime.setValueAtTime(0.35, ctx.currentTime);
        feedback.gain.setValueAtTime(0.4, ctx.currentTime);

        // Connections
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        // Connect delay feedback
        gain.connect(delay);
        delay.connect(feedback);
        feedback.connect(gain);

        osc.start();
        oscRef.current = osc;
        gainRef.current = gain;

        // Fade synth in
        gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.2);
      } catch (err) {
        console.warn("Audio Context block:", err);
      }
    };

    initAudio();
    return () => cleanupAudio();
  }, [soundscape]);

  const cleanupAudio = () => {
    try {
      if (oscRef.current) oscRef.current.stop();
      if (audioCtxRef.current) audioCtxRef.current.close();
    } catch (_) {}
    oscRef.current = null;
    gainRef.current = null;
    audioCtxRef.current = null;
  };

  // Track cursor for Soundscape and Zen Sand
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Audio frequency update
      if (soundscape && oscRef.current && gainRef.current && audioCtxRef.current) {
        const normX = e.clientX / window.innerWidth;
        const normY = e.clientY / window.innerHeight;
        
        // Map X to low frequency scale (110Hz to 330Hz)
        const targetFreq = 110 + normX * 220;
        // Map Y to filter frequency (lowpass cutoff)
        oscRef.current.frequency.setTargetAtTime(targetFreq, audioCtxRef.current.currentTime, 0.15);
        gainRef.current.gain.setTargetAtTime(0.02 + (1 - normY) * 0.035, audioCtxRef.current.currentTime, 0.1);
      }

      // Zen Sand particle spawn
      if (zenSand && sandCanvasRef.current) {
        const rect = sandCanvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Spawn a packet of sand grain trails
        for (let i = 0; i < 3; i++) {
          sandParticles.current.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 0.8 + 0.4, // drift down
            alpha: 0.65,
            size: Math.random() * 2 + 1,
          });
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [soundscape, zenSand]);

  // 4. Zen Sand Particle Drawing Loop
  useEffect(() => {
    if (!zenSand) return;

    const canvas = sandCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width;
      canvas.height = height;
    };

    const draw = () => {
      // Clear with soft trails to show gravel rakes
      ctx.fillStyle = "rgba(7, 8, 13, 0.15)";
      ctx.fillRect(0, 0, width, height);

      const pArr = sandParticles.current;
      for (let i = pArr.length - 1; i >= 0; i--) {
        const p = pArr[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.009;

        if (p.alpha <= 0) {
          pArr.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        // Sand gold/gray color
        ctx.fillStyle = `rgba(245, 158, 11, ${p.alpha})`;
        ctx.fill();
      }

      animFrame = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrame);
    };
  }, [zenSand]);

  // Astronomical clock details
  const [astTime, setAstTime] = useState("");
  useEffect(() => {
    if (!chronometer) return;
    const timer = setInterval(() => {
      const now = new Date();
      setAstTime(
        `RA ${now.getHours()}h ${now.getMinutes()}m · DEC +${(now.getSeconds() * 1.5).toFixed(1)}°`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [chronometer]);

  return (
    <>
      {/* 2. Zen Sand Canvas overlay (non-blocking) */}
      {zenSand && (
        <canvas
          ref={sandCanvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-10 mix-blend-screen opacity-55"
        />
      )}

      {/* 3. Astronomical Chronometer Astrolabe */}
      {chronometer && (
        <div className="fixed top-20 right-6 z-30 pointer-events-none hidden lg:flex flex-col items-end gap-2 bg-[#0c0e17]/45 border border-white/5 p-3 rounded-lg backdrop-blur-md">
          <svg className="w-16 h-16 animate-[spin_320s_linear_infinite]" viewBox="0 0 100 100">
            {/* Celestial grid rings */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(245,158,11,0.22)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(56,189,248,0.18)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            {/* Moon crescent */}
            <path
              d="M 50 24 A 12 12 0 0 1 50 48 A 10 12 0 0 0 50 24 Z"
              fill="rgba(245, 158, 11, 0.65)"
              transform="rotate(32 50 50)"
            />
          </svg>
          <div className="text-[0.58rem] font-mono text-slate-500 tracking-wider">
            {astTime || "AETHER // CALC"}
          </div>
        </div>
      )}

      {/* 1. Singularity route overlay handler */}
      <AnimatePresence>
        {singularityState === "contracting" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center pointer-events-none"
          >
            {/* Glowing Singularity Point */}
            <motion.div
              initial={{ scale: 200, borderRadius: "0%" }}
              animate={{ scale: 0.05, borderRadius: "50%" }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="w-12 h-12 bg-white shadow-[0_0_35px_rgba(56,189,248,0.95),0_0_60px_#fff]"
            />
          </motion.div>
        )}
        {singularityState === "expanding" && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed inset-0 bg-transparent z-[9999] flex items-center justify-center pointer-events-none"
          >
            {/* Big Bang shockwave expansion */}
            <motion.div
              initial={{ scale: 0, opacity: 1, borderWidth: "8px" }}
              animate={{ scale: 80, opacity: 0, borderWidth: "0.2px" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-10 h-10 border border-[var(--color-accent)] rounded-full shadow-[0_0_30px_rgba(56,189,248,0.6)]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Control Menu */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className="bg-[#0b0c13]/85 backdrop-blur-xl border border-white/8 p-4 rounded-xl shadow-2xl w-64 text-slate-300"
            >
              <h4 className="text-xs font-mono text-[var(--color-gold)] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                Aether Coordinates Menu
              </h4>
              
              <ul className="space-y-3.5 text-xs font-sans">
                <li className="flex justify-between items-center">
                  <span>1. Cosmic Singularity</span>
                  <input
                    type="checkbox"
                    checked={singularity}
                    onChange={(e) => setSingularity(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </li>
                <li className="flex justify-between items-center">
                  <span>2. Astronomy Clock</span>
                  <input
                    type="checkbox"
                    checked={chronometer}
                    onChange={(e) => setChronometer(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </li>
                <li className="flex justify-between items-center">
                  <span>3. Zen Sand Engine</span>
                  <input
                    type="checkbox"
                    checked={zenSand}
                    onChange={(e) => setZenSand(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </li>
                <li className="flex justify-between items-center">
                  <span>4. Aether Synthesizer</span>
                  <input
                    type="checkbox"
                    checked={soundscape}
                    onChange={(e) => setSoundscape(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </li>
                <li className="flex justify-between items-center">
                  <span>5. Scroll Scale Zoom</span>
                  <input
                    type="checkbox"
                    checked={scaleParallax}
                    onChange={(e) => setScaleParallax(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </li>
              </ul>
              <div className="mt-3 pt-2 border-t border-white/5 text-[0.6rem] font-mono text-slate-500">
                Concepts: Akshay Timeless Showcase
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-11 h-11 bg-[var(--color-surface)] hover:bg-[var(--color-accent-soft)] border border-white/10 rounded-full shadow-lg flex items-center justify-center text-[var(--color-accent)] transition-all duration-300 active:scale-95"
          aria-label="Aether Control Panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={menuOpen ? "rotate-45 transition-transform duration-300" : "transition-transform duration-300"}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
          </svg>
        </button>
      </div>
    </>
  );
}
