import { lazy, Suspense, useState } from "react";
import {
  ArsenalSceneShell,
  AutoColorToggle,
  ColorThemePicker,
  RangeControl,
} from "@/components/arsenal/ArsenalSceneShell";

const AnomalyMatrix = lazy(() => import("@/components/canvas/AnomalyMatrix"));

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
    </div>
  );
}

export default function AnomalyMatrixLab() {
  const [autoColor, setAutoColor] = useState(false);
  const [sphereSpeed, setSphereSpeed] = useState(1.0);
  const [sphereScale, setSphereScale] = useState(1.0);
  const [anomalyColor, setAnomalyColor] = useState<"indigo" | "amber" | "emerald">("indigo");

  return (
    <ArsenalSceneShell
      seo={{
        title: "Anomaly Matrix — Arsenal",
        description: "Shader-driven 3D sphere with live scale, deformation, and spectrum controls.",
        path: "/arsenal/anomaly-matrix",
      }}
      backLink={{ to: "/arsenal", label: "← Arsenal" }}
      eyebrow="Arsenal // Anomaly Matrix"
      title="Anomaly Matrix"
      subtitle="Deform a shader sphere in real time — tune scale, speed, and color theme."
      viewport={
        <Suspense fallback={<SceneFallback />}>
          <AnomalyMatrix
            sphereSpeed={sphereSpeed}
            sphereScale={sphereScale}
            colorTheme={anomalyColor}
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
                label="Color Theme"
                value={anomalyColor}
                options={["indigo", "amber", "emerald"] as const}
                activeClass="border-indigo-500 bg-indigo-500/10 text-indigo-300"
                onChange={setAnomalyColor}
              />
            )}
            <RangeControl
              label="Sphere scale"
              value={sphereScale}
              display={`${sphereScale.toFixed(2)}x`}
              min={0.5}
              max={1.8}
              step={0.05}
              accentClass="accent-indigo-500"
              onChange={setSphereScale}
            />
            <RangeControl
              label="Deformation speed"
              value={sphereSpeed}
              display={`${sphereSpeed.toFixed(2)}x`}
              min={0.2}
              max={3.0}
              step={0.1}
              accentClass="accent-indigo-500"
              onChange={setSphereSpeed}
            />
          </div>
        </>
      }
    />
  );
}
