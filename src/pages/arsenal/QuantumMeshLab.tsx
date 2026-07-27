import { lazy, Suspense, useState } from "react";
import {
  ArsenalSceneShell,
  AutoColorToggle,
  ColorThemePicker,
  RangeControl,
} from "@/components/arsenal/ArsenalSceneShell";

const QuantumMesh = lazy(() => import("@/components/canvas/QuantumMesh"));

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
    </div>
  );
}

function meshColors(meshColor: "purple" | "blue" | "green") {
  switch (meshColor) {
    case "blue":
      return { node: "rgba(59, 130, 246, 0.8)", line: "rgba(59, 130, 246, 0.15)" };
    case "green":
      return { node: "rgba(16, 185, 129, 0.8)", line: "rgba(16, 185, 129, 0.15)" };
    default:
      return { node: "rgba(147, 51, 234, 0.8)", line: "rgba(147, 51, 234, 0.15)" };
  }
}

export default function QuantumMeshLab() {
  const [autoColor, setAutoColor] = useState(false);
  const [nodeCount, setNodeCount] = useState(140);
  const [linkDistance, setLinkDistance] = useState(120);
  const [meshColor, setMeshColor] = useState<"purple" | "blue" | "green">("purple");
  const [meshSpeed, setMeshSpeed] = useState(1.0);
  const colors = meshColors(meshColor);

  return (
    <ArsenalSceneShell
      seo={{
        title: "Quantum Mesh — Arsenal",
        description:
          "Node-link neural field with adjustable node count, link reach, drift, and palette.",
        path: "/arsenal/quantum-mesh",
      }}
      backLink={{ to: "/arsenal", label: "← Arsenal" }}
      eyebrow="Arsenal // Quantum Neural Mesh"
      title="Quantum Mesh"
      subtitle="Shape a drifting neural graph — nodes, link reach, and velocity."
      viewport={
        <Suspense fallback={<SceneFallback />}>
          <QuantumMesh
            nodeCount={nodeCount}
            linkDistance={linkDistance}
            nodeColor={colors.node}
            lineColor={colors.line}
            speed={meshSpeed}
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
                label="Link Color"
                value={meshColor}
                options={["purple", "blue", "green"] as const}
                activeClass="border-purple-500 bg-purple-500/10 text-purple-300"
                onChange={setMeshColor}
              />
            )}
            <RangeControl
              label="Node count"
              value={nodeCount}
              display={`${nodeCount}`}
              min={40}
              max={300}
              step={5}
              accentClass="accent-purple-500"
              onChange={(v) => setNodeCount(Math.round(v))}
            />
            <RangeControl
              label="Link reach distance"
              value={linkDistance}
              display={`${linkDistance}px`}
              min={40}
              max={220}
              step={5}
              accentClass="accent-purple-500"
              onChange={(v) => setLinkDistance(Math.round(v))}
            />
            <RangeControl
              label="Drift velocity"
              value={meshSpeed}
              display={`${meshSpeed.toFixed(2)}x`}
              min={0.2}
              max={2.5}
              step={0.1}
              accentClass="accent-purple-500"
              onChange={setMeshSpeed}
            />
          </div>
        </>
      }
    />
  );
}
