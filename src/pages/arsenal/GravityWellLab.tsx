import { lazy, Suspense, useState } from "react";
import {
  ArsenalSceneShell,
  AutoColorToggle,
  ColorThemePicker,
  RangeControl,
} from "@/components/arsenal/ArsenalSceneShell";

const GravityWell = lazy(() => import("@/components/canvas/GravityWell"));

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
    </div>
  );
}

export default function GravityWellLab() {
  const [autoColor, setAutoColor] = useState(false);
  const [gravityParticles, setGravityParticles] = useState(2200);
  const [diskSpeed, setDiskSpeed] = useState(1.0);
  const [gravityColor, setGravityColor] = useState<"indigo" | "amber" | "emerald">("indigo");

  return (
    <ArsenalSceneShell
      seo={{
        title: "Gravity Well — Arsenal",
        description:
          "Accretion-disk particle field with vortex speed, density, and color theme controls.",
        path: "/arsenal/gravity-well",
      }}
      backLink={{ to: "/arsenal", label: "← Arsenal" }}
      eyebrow="Arsenal // Gravity Well"
      title="Gravity Well"
      subtitle="Tune an orbital particle disk — density, vortex speed, and spectrum."
      viewport={
        <Suspense fallback={<SceneFallback />}>
          <GravityWell
            particleCount={gravityParticles}
            diskSpeed={diskSpeed}
            colorTheme={gravityColor}
            autoColor={autoColor}
          />
        </Suspense>
      }
      controls={
        <>
          <AutoColorToggle enabled={autoColor} onToggle={() => setAutoColor((v) => !v)} />
          <span className="mb-2 block border-t border-white/5 pt-4 font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
            Configuration Panel
          </span>
          <div className="space-y-6">
            {!autoColor && (
              <ColorThemePicker
                label="Accretion Disk Color"
                value={gravityColor}
                options={["indigo", "amber", "emerald"] as const}
                activeClass="border-cyan-500 bg-cyan-500/10 text-cyan-300"
                onChange={setGravityColor}
              />
            )}
            <RangeControl
              label="Vortex speed"
              value={diskSpeed}
              display={`${diskSpeed.toFixed(2)}x`}
              min={0.2}
              max={3.0}
              step={0.1}
              accentClass="accent-cyan-500"
              onChange={setDiskSpeed}
            />
            <RangeControl
              label="Particle density"
              value={gravityParticles}
              display={`${gravityParticles}`}
              min={500}
              max={4000}
              step={100}
              accentClass="accent-cyan-500"
              onChange={(v) => setGravityParticles(Math.round(v))}
            />
          </div>
        </>
      }
    />
  );
}
