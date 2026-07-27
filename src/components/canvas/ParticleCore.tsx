import { useEffect, useRef, useState, type MouseEvent } from "react";

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

const SPARK_COLORS = ["#38bdf8", "#ffd700", "#ec4899", "#a855f7", "#10b981", "#f59e0b"];

export function ParticleCore() {
  const [igniteCount, setIgniteCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);

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
        s.vy += 0.22;
        s.alpha -= s.decay;

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
          s.vx *= 0.75;
        }

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha * 0.22;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleIgnite = (e: MouseEvent<HTMLButtonElement>) => {
    setIgniteCount((c) => c + 1);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newSparks: Spark[] = [];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 3;
      newSparks.push({
        id: Date.now() + i + Math.random(),
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 3 + 2,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
      });
    }

    sparksRef.current.push(...newSparks);
  };

  return (
    <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-[#0b0c13]/55 p-6">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

      <div className="relative z-10">
        <span className="mb-2 block font-mono text-[0.6rem] uppercase tracking-wider text-slate-500">
          System Parameter // Emitter
        </span>
        <h3 className="text-lg font-semibold text-white">Dynamic Particle Core</h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Click the button below to release energy waves. The particle system simulates gravity,
          velocity vectors, and exponential fading decay.
        </p>
      </div>

      <div className="relative z-10 mt-8 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleIgnite}
          className="rounded-lg border border-white/10 bg-gradient-to-r from-[var(--color-accent)] to-[#4f46e5] px-6 py-3 font-mono text-xs uppercase tracking-wider text-white shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all duration-200 hover:brightness-110 active:scale-95"
        >
          Ignite Particle Core
        </button>
        <div className="font-mono text-[0.625rem] text-slate-500">
          TOTAL RELEASES: <span className="text-[var(--color-gold)]">{igniteCount}</span>
        </div>
      </div>
    </div>
  );
}

export default ParticleCore;
