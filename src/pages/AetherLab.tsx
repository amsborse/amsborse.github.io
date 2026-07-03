import { useState } from 'react';
import { Seo } from '@/components/Seo';
import AnomalyMatrix from '@/components/canvas/AnomalyMatrix';
import QuantumMesh from '@/components/canvas/QuantumMesh';
import GravityWell from '@/components/canvas/GravityWell';
import { motion } from 'framer-motion';

type SceneType = 'anomaly' | 'gravity' | 'neural';

export default function AetherLab() {
  const [activeScene, setActiveScene] = useState<SceneType>('anomaly');
  const [autoColor, setAutoColor] = useState(false);

  // Parameters for Anomaly Matrix
  const [sphereSpeed, setSphereSpeed] = useState(1.0);
  const [sphereScale, setSphereScale] = useState(1.0);
  const [anomalyColor, setAnomalyColor] = useState<'indigo' | 'amber' | 'emerald'>('indigo');
  const [anomalyParticles, setAnomalyParticles] = useState(1500);
  const [anomalySpeed, setAnomalySpeed] = useState(1.0);

  // Parameters for Gravity Well Accretion Disk
  const [gravityParticles, setGravityParticles] = useState(2200);
  const [diskSpeed, setDiskSpeed] = useState(1.0);
  const [gravityColor, setGravityColor] = useState<'indigo' | 'amber' | 'emerald'>('indigo');

  // Parameters for Quantum Neural Mesh
  const [nodeCount, setNodeCount] = useState(140);
  const [linkDistance, setLinkDistance] = useState(120);
  const [meshColor, setMeshColor] = useState<'purple' | 'blue' | 'green'>('purple');
  const [meshSpeed, setMeshSpeed] = useState(1.0);

  // Resolve color strings
  const getMeshColors = () => {
    switch (meshColor) {
      case 'blue':
        return { node: 'rgba(59, 130, 246, 0.8)', line: 'rgba(59, 130, 246, 0.15)' };
      case 'green':
        return { node: 'rgba(16, 185, 129, 0.8)', line: 'rgba(16, 185, 129, 0.15)' };
      default:
        return { node: 'rgba(147, 51, 234, 0.8)', line: 'rgba(147, 51, 234, 0.15)' };
    }
  };

  return (
    <>
      <Seo
        title="Aether Lab — Akshay Borse"
        description="Interact and configure high-fidelity 3D and particle simulation layers in real-time."
        path="/aether-lab"
      />

      <div className="min-h-screen text-[#f1f3f7] relative overflow-hidden pb-20 pt-24 bg-[#050505]">
        {/* Decorative elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Header */}
          <header className="mb-12">
            <span className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-indigo-400 block mb-2">
              Visual Laboratory // Cosmic Systems Showcase
            </span>
            <h1 className="text-3xl sm:text-5xl font-display font-semibold tracking-tight">
              Aether Lab
            </h1>
            <p className="mt-3 text-sm text-slate-400 max-w-2xl leading-relaxed">
              Explore and configure the generative mechanics that power our cosmic aesthetic. Adjust speed, particle density, and physics models in real-time.
            </p>
          </header>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4 mb-8">
            {[
              { id: 'anomaly', label: 'Anomaly Matrix (3D)' },
              { id: 'gravity', label: 'Gravity Well (3D)' },
              { id: 'neural', label: 'Quantum Neural Mesh' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveScene(tab.id as SceneType)}
                className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-300 ${
                  activeScene === tab.id
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Viewport Container */}
            <div className="lg:col-span-8 h-[450px] sm:h-[550px] relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black/40">
              {activeScene === 'anomaly' && (
                <AnomalyMatrix
                  sphereSpeed={sphereSpeed}
                  sphereScale={sphereScale}
                  colorTheme={anomalyColor}
                  particleCount={anomalyParticles}
                  particleSpeed={anomalySpeed}
                  autoColor={autoColor}
                />
              )}
              {activeScene === 'gravity' && (
                <GravityWell
                  particleCount={gravityParticles}
                  diskSpeed={diskSpeed}
                  colorTheme={gravityColor}
                  autoColor={autoColor}
                />
              )}
              {activeScene === 'neural' && (
                <QuantumMesh
                  nodeCount={nodeCount}
                  linkDistance={linkDistance}
                  nodeColor={getMeshColors().node}
                  lineColor={getMeshColors().line}
                  speed={meshSpeed}
                  autoColor={autoColor}
                />
              )}
            </div>

            {/* Customizer controls */}
            <div className="lg:col-span-4 bg-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-6">
              <div>
                <span className="text-[0.625rem] font-mono uppercase text-slate-500 tracking-wider block mb-4">
                  Global Modifiers
                </span>
                
                {/* Auto Spectrum Shift Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white/90">Spectrum Cycling</span>
                    <span className="text-[9px] font-mono text-slate-500">Auto-shift hues</span>
                  </div>
                  <button
                    onClick={() => setAutoColor(!autoColor)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                      autoColor ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-white/10'
                    }`}
                    aria-label="Toggle Auto Color Shift"
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-300 ${
                        autoColor ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <span className="text-[0.625rem] font-mono uppercase text-slate-500 tracking-wider block mb-2 border-t border-white/5 pt-4">
                Configuration Panel
              </span>

              {/* Anomaly Matrix Controls */}
              {activeScene === 'anomaly' && (
                <div className="space-y-6">
                  {!autoColor && (
                    <div>
                      <label className="text-xs text-slate-400 font-mono block mb-2">Color Theme</label>
                      <div className="flex gap-2">
                        {(['indigo', 'amber', 'emerald'] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setAnomalyColor(color)}
                            className={`flex-1 py-1.5 rounded border text-[10px] uppercase font-mono transition-all ${
                              anomalyColor === color
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                                : 'border-white/5 hover:border-white/10 text-slate-400'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
                      <span>Particle density</span>
                      <span>{anomalyParticles}</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="3000"
                      step="100"
                      value={anomalyParticles}
                      onChange={(e) => setAnomalyParticles(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
                      <span>Orbit speed</span>
                      <span>{anomalySpeed.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.5"
                      step="0.1"
                      value={anomalySpeed}
                      onChange={(e) => setAnomalySpeed(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Gravity Well Controls */}
              {activeScene === 'gravity' && (
                <div className="space-y-6">
                  {!autoColor && (
                    <div>
                      <label className="text-xs text-slate-400 font-mono block mb-2">Accretion Disk Color</label>
                      <div className="flex gap-2">
                        {(['indigo', 'amber', 'emerald'] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setGravityColor(color)}
                            className={`flex-1 py-1.5 rounded border text-[10px] uppercase font-mono transition-all ${
                              gravityColor === color
                                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                                : 'border-white/5 hover:border-white/10 text-slate-400'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Quantum Neural Mesh Controls */}
              {activeScene === 'neural' && (
                <div className="space-y-6">
                  {!autoColor && (
                    <div>
                      <label className="text-xs text-slate-400 font-mono block mb-2">Link Color</label>
                      <div className="flex gap-2">
                        {(['purple', 'blue', 'green'] as const).map((color) => (
                          <button
                            key={color}
                            onClick={() => setMeshColor(color)}
                            className={`flex-1 py-1.5 rounded border text-[10px] uppercase font-mono transition-all ${
                              meshColor === color
                                ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                                : 'border-white/5 hover:border-white/10 text-slate-400'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-450 mb-1">
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
                      className="w-full accent-purple-500 cursor-pointer"
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
