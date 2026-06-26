import { useState, useEffect, useRef } from "react";
import { Seo } from "@/components/Seo";
import { MorphingSphere } from "@/components/MorphingSphere";

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

export default function MotionLab() {
  const [igniteCount, setIgniteCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

  // Spark burst animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const resize = () => {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.22; // gravity
        s.alpha -= s.decay;

        // Boundary collision detection (walls & floor bounce with energy loss)
        if (s.x - s.size < 0) {
          s.x = s.size;
          s.vx = -s.vx * 0.55;
        } else if (s.x + s.size > width) {
          s.x = width - s.size;
          s.vx = -s.vx * 0.55;
        }

        if (s.y - s.size < 0) {
          s.y = s.size;
          s.vy = -s.vy * 0.55;
        } else if (s.y + s.size > height) {
          s.y = height - s.size;
          s.vy = -s.vy * 0.55;
          s.vx *= 0.75; // ground friction
        }

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        // Draw Faux Glow (underneath spark)
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * 0.22;
        ctx.fill();

        // Draw main spark circle
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleIgnite = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIgniteCount((c) => c + 1);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const colors = ["#38bdf8", "#ffd700", "#ec4899", "#a855f7", "#10b981", "#f59e0b"];
    const newSparks: Spark[] = [];

    // Emit 45 dynamic particles
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 3;
      newSparks.push({
        id: Date.now() + i + Math.random(),
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3, // slightly upward bias
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
      });
    }

    sparksRef.current.push(...newSparks);
  };

  return (
    <>
      <Seo
        title="Motion Lab — Akshay Borse"
        description="Interactive motion and particle dynamics playground featuring 3D morphing coordinates and kinetic emitters."
        path="/motion"
      />

      <div className="min-h-screen text-[#f1f3f7] relative overflow-hidden pb-32 pt-20">
        {/* Futuristic grids */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(24,58,111,0.04)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(24,58,111,0.04)_1.5px,transparent_1.5px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-[var(--color-gold)]/8 to-transparent blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Header */}
          <header className="text-center mb-16">
            <p className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-3">
              Kinetic Playground // Interactive Systems
            </p>
            <h1 className="text-[2.25rem] sm:text-[3.25rem] font-display font-semibold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8]">
              Motion Lab
            </h1>
            <p className="mt-4 text-sm max-w-lg mx-auto text-slate-400 leading-relaxed font-sans">
              Interact with the physical laws of our system. Ignite the particle core below, or rotate and morph the celestial grid structure.
            </p>
          </header>

          <div className="grid md:grid-cols-12 gap-8 items-stretch">
            {/* Click Reward Emitter Section */}
            <div className="md:col-span-5 bg-[#0b0c13]/55 border border-white/5 rounded-2xl p-6 flex flex-col justify-between relative min-h-[380px] overflow-hidden">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
              />
              
              <div className="relative z-10">
                <span className="text-[0.6rem] font-mono uppercase text-slate-500 tracking-wider block mb-2">
                  System Parameter // Emitter
                </span>
                <h3 className="text-lg font-semibold text-white">Dynamic Particle Core</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Click the button below to release energy waves. The particle system simulates gravity, velocity vectors, and exponential fading decay.
                </p>
              </div>

              <div className="relative z-10 flex flex-col items-center gap-4 mt-8">
                <button
                  onClick={handleIgnite}
                  className="px-6 py-3 bg-gradient-to-r from-[var(--color-accent)] to-[#4f46e5] hover:brightness-110 active:scale-95 text-white rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(56,189,248,0.25)] border border-white/10"
                >
                  🔥 Ignite Particle Core
                </button>
                <div className="text-[0.625rem] font-mono text-slate-500">
                  TOTAL RELEASES: <span className="text-[var(--color-gold)]">{igniteCount}</span>
                </div>
              </div>
            </div>

            {/* 3D Morphing Sphere Section */}
            <div className="md:col-span-7 bg-[#0b0c13]/55 border border-white/5 rounded-2xl p-6 flex flex-col justify-between relative min-h-[380px]">
              <div className="mb-4">
                <span className="text-[0.6rem] font-mono uppercase text-slate-500 tracking-wider block mb-2">
                  3D Node Mesh // Projection
                </span>
                <h3 className="text-lg font-semibold text-white">Celestial Grid Structure</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Hover and drag to rotate the matrix coordinates. Toggle states below to morph the structure between sphere, torus, and wave coordinate maps.
                </p>
              </div>

              <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
                <MorphingSphere />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
