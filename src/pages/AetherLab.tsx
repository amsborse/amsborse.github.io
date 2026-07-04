import { lazy, Suspense, useState } from "react";
import { Seo } from "@/components/Seo";

const AnomalyMatrix = lazy(() => import("@/components/canvas/AnomalyMatrix"));
const QuantumMesh = lazy(() => import("@/components/canvas/QuantumMesh"));
const GravityWell = lazy(() => import("@/components/canvas/GravityWell"));

type SceneType = "anomaly" | "gravity" | "neural";

function SceneFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
    </div>
  );
}

export default function AetherLab() {
  const [activeScene, setActiveScene] = useState<SceneType>("anomaly");
  const [autoColor, setAutoColor] = useState(false);

  const [sphereSpeed, setSphereSpeed] = useState(1.0);
  const [sphereScale, setSphereScale] = useState(1.0);
  const [anomalyColor, setAnomalyColor] = useState<"indigo" | "amber" | "emerald">("indigo");
  const [gravityParticles, setGravityParticles] = useState(2200);
  const [diskSpeed, setDiskSpeed] = useState(1.0);
  const [gravityColor, setGravityColor] = useState<"indigo" | "amber" | "emerald">("indigo");
  const [nodeCount, setNodeCount] = useState(140);
  const [linkDistance, setLinkDistance] = useState(120);
  const [meshColor, setMeshColor] = useState<"purple" | "blue" | "green">("purple");
  const [meshSpeed, setMeshSpeed] = useState(1.0);

  const getMeshColors = () => {
    switch (meshColor) {
      case "blue":
        return { node: "rgba(59, 130, 246, 0.8)", line: "rgba(59, 130, 246, 0.15)" };
      case "green":
        return { node: "rgba(16, 185, 129, 0.8)", line: "rgba(16, 185, 129, 0.15)" };
      default:
        return { node: "rgba(147, 51, 234, 0.8)", line: "rgba(147, 51, 234, 0.15)" };
    }
  };

  return (
    <>
      <Seo
        title="Aether Lab — Akshay Borse"
        description="Interact and configure high-fidelity 3D and particle simulation layers in real-time."
        path="/aether-lab"
      />

      <div className="relative min-h-screen overflow-hidden bg-[#050505] pb-20 pt-24 text-[#f1f3f7]">
        <div className="pointer-events-none absolute right-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-indigo-900/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-purple-900/10 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <header className="mb-12">
            <span className="mb-2 block font-mono text-[0.6875rem] uppercase tracking-[0.25em] text-indigo-400">
              Visual Laboratory // Cosmic Systems Showcase
            </span>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Aether Lab
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Explore and configure the generative mechanics that power our cosmic aesthetic. Adjust
              speed, particle density, and physics models in real-time.
            </p>
          </header>

          <div className="mb-8 flex flex-wrap gap-2 border-b border-white/5 pb-4">
            {[
              { id: "anomaly", label: "Anomaly Matrix (3D)" },
              { id: "gravity", label: "Gravity Well (3D)" },
              { id: "neural", label: "Quantum Neural Mesh" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveScene(tab.id as SceneType)}
                className={`rounded-lg px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all duration-300 ${
                  activeScene === tab.id
                    ? "border border-white/15 bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-350"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="relative h-[450px] overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-2xl sm:h-[550px] lg:col-span-8">
              <Suspense fallback={<SceneFallback />}>
                {activeScene === "anomaly" && (
                  <AnomalyMatrix
                    sphereSpeed={sphereSpeed}
                    sphereScale={sphereScale}
                    colorTheme={anomalyColor}
                    autoColor={autoColor}
                  />
                )}
                {activeScene === "gravity" && (
                  <GravityWell
                    particleCount={gravityParticles}
                    diskSpeed={diskSpeed}
                    colorTheme={gravityColor}
                    autoColor={autoColor}
                  />
                )}
                {activeScene === "neural" && (
                  <QuantumMesh
                    nodeCount={nodeCount}
                    linkDistance={linkDistance}
                    nodeColor={getMeshColors().node}
                    lineColor={getMeshColors().line}
                    speed={meshSpeed}
                    autoColor={autoColor}
                  />
                )}
              </Suspense>
            </div>

            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl lg:col-span-4">
              <div>
                <span className="mb-4 block font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
                  Global Modifiers
                </span>

                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.01] p-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white/90">Spectrum Cycling</span>
                    <span className="font-mono text-[9px] text-slate-500">Auto-shift hues</span>
                  </div>
                  <button
                    onClick={() => setAutoColor(!autoColor)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                      autoColor
                        ? "bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        : "bg-white/10"
                    }`}
                    aria-label="Toggle Auto Color Shift"
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
                        autoColor ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <span className="mb-2 block border-t border-white/5 pt-4 font-mono text-[0.625rem] uppercase tracking-wider text-slate-500">
                Configuration Panel
              </span>

              {activeScene === "anomaly" && (
                <div className="space-y-6">
                  {!autoColor && (
                    <div>
                      <label className="mb-2 block font-mono text-xs text-slate-400">
                        Color Theme
                      </label>
                      <div className="flex gap-2">
                        {(["indigo", "amber", "emerald"] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setAnomalyColor(color)}
                            className={`flex-1 rounded border py-1.5 font-mono text-[10px] uppercase transition-all ${
                              anomalyColor === color
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                                : "border-white/5 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Sphere scale</span>
                      <span>{sphereScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.05"
                      value={sphereScale}
                      onChange={(e) => setSphereScale(parseFloat(e.target.value))}
                      className="w-full cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Deformation speed</span>
                      <span>{sphereSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={sphereSpeed}
                      onChange={(e) => setSphereSpeed(parseFloat(e.target.value))}
                      className="w-full cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeScene === "gravity" && (
                <div className="space-y-6">
                  {!autoColor && (
                    <div>
                      <label className="mb-2 block font-mono text-xs text-slate-400">
                        Accretion Disk Color
                      </label>
                      <div className="flex gap-2">
                        {(["indigo", "amber", "emerald"] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setGravityColor(color)}
                            className={`flex-1 rounded border py-1.5 font-mono text-[10px] uppercase transition-all ${
                              gravityColor === color
                                ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                                : "border-white/5 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Vortex speed</span>
                      <span>{diskSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={diskSpeed}
                      onChange={(e) => setDiskSpeed(parseFloat(e.target.value))}
                      className="w-full cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Particle density</span>
                      <span>{gravityParticles}</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="4000"
                      step="100"
                      value={gravityParticles}
                      onChange={(e) => setGravityParticles(parseInt(e.target.value))}
                      className="w-full cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              )}

              {activeScene === "neural" && (
                <div className="space-y-6">
                  {!autoColor && (
                    <div>
                      <label className="mb-2 block font-mono text-xs text-slate-400">
                        Link Color
                      </label>
                      <div className="flex gap-2">
                        {(["purple", "blue", "green"] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setMeshColor(color)}
                            className={`flex-1 rounded border py-1.5 font-mono text-[10px] uppercase transition-all ${
                              meshColor === color
                                ? "border-purple-500 bg-purple-500/10 text-purple-300"
                                : "border-white/5 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Node count</span>
                      <span>{nodeCount}</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="300"
                      step="5"
                      value={nodeCount}
                      onChange={(e) => setNodeCount(parseInt(e.target.value))}
                      className="w-full cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Link reach distance</span>
                      <span>{linkDistance}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="220"
                      step="5"
                      value={linkDistance}
                      onChange={(e) => setLinkDistance(parseInt(e.target.value))}
                      className="w-full cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between font-mono text-xs text-slate-450">
                      <span>Drift velocity</span>
                      <span>{meshSpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={meshSpeed}
                      onChange={(e) => setMeshSpeed(parseFloat(e.target.value))}
                      className="w-full cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
