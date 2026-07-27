import type { LearningCardTopic } from "@/components/learning/LearningInteractiveCard";

/** Visual lab sandboxes under Arsenal. */
export const ARSENAL_LABS: LearningCardTopic[] = [
  {
    id: "celestial-grid",
    title: "Celestial Grid",
    description:
      "Drag to rotate a projected node mesh. Morph between sphere, torus, wave, galaxy, and more coordinate maps.",
    icon: "◎",
    path: "/arsenal/celestial-grid",
    status: "active",
    tags: ["Morphing", "Projection", "Drag Rotate"],
    color: "from-cyan-500 to-blue-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x = 100 + Math.cos(a) * 50;
          const y = 100 + Math.sin(a) * 50;
          return (
            <g key={i}>
              <line
                x1="100"
                y1="100"
                x2={x}
                y2={y}
                stroke="rgba(34, 211, 238, 0.2)"
                strokeWidth="1"
              />
              <circle cx={x} cy={y} r="3" fill="#22d3ee" opacity={0.8} />
            </g>
          );
        })}
        <circle cx="100" cy="100" r="8" fill="#67e8f9" />
      </svg>
    ),
  },
  {
    id: "particle-core",
    title: "Particle Core",
    description:
      "Ignite bursts of sparks with gravity, wall bounce, and exponential fade — a kinetic emitter sandbox.",
    icon: "✧",
    path: "/arsenal/particle-core",
    status: "active",
    tags: ["Emitter", "Gravity", "Canvas"],
    color: "from-amber-500 to-orange-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="120" r="10" fill="#f59e0b" />
        {[
          [70, 70, "#38bdf8"],
          [130, 65, "#ec4899"],
          [145, 100, "#a855f7"],
          [55, 95, "#10b981"],
          [110, 50, "#ffd700"],
        ].map(([x, y, c], i) => (
          <circle key={i} cx={x as number} cy={y as number} r={3 + (i % 2)} fill={c as string} />
        ))}
      </svg>
    ),
  },
  {
    id: "anomaly-matrix",
    title: "Anomaly Matrix",
    description:
      "Shader-driven 3D sphere with live scale, deformation speed, and spectrum cycling controls.",
    icon: "◉",
    path: "/arsenal/anomaly-matrix",
    status: "active",
    tags: ["R3F", "Shaders", "3D"],
    color: "from-indigo-500 to-violet-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="48" fill="url(#anomalyGrad)" />
        <circle cx="100" cy="100" r="48" stroke="rgba(129, 140, 248, 0.4)" strokeWidth="1.5" />
        <defs>
          <radialGradient id="anomalyGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "gravity-well",
    title: "Gravity Well",
    description:
      "Accretion-disk particle field with vortex speed, density, and color theme controls.",
    icon: "◎",
    path: "/arsenal/gravity-well",
    status: "active",
    tags: ["R3F", "Particles", "Orbit"],
    color: "from-cyan-500 to-teal-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <ellipse cx="100" cy="110" rx="60" ry="16" stroke="rgba(34, 211, 238, 0.35)" fill="none" />
        <ellipse cx="100" cy="110" rx="40" ry="10" stroke="rgba(34, 211, 238, 0.5)" fill="none" />
        <circle cx="100" cy="100" r="14" fill="#0e7490" />
        <circle cx="100" cy="100" r="6" fill="#67e8f9" />
      </svg>
    ),
  },
  {
    id: "quantum-mesh",
    title: "Quantum Mesh",
    description:
      "Node-link neural field with adjustable node count, link reach, drift velocity, and palette.",
    icon: "⬡",
    path: "/arsenal/quantum-mesh",
    status: "active",
    tags: ["Canvas", "Graph", "Network"],
    color: "from-fuchsia-500 to-purple-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        {[
          [60, 70],
          [120, 55],
          [150, 110],
          [100, 140],
          [50, 120],
          [100, 90],
        ].map(([x, y], i, arr) => (
          <g key={i}>
            {arr.slice(i + 1).map(([x2, y2], j) => (
              <line
                key={j}
                x1={x}
                y1={y}
                x2={x2}
                y2={y2}
                stroke="rgba(192, 132, 252, 0.2)"
                strokeWidth="1"
              />
            ))}
            <circle cx={x} cy={y} r="4" fill="#c084fc" />
          </g>
        ))}
      </svg>
    ),
  },
];

const ARSENAL_HUB_TOPICS: LearningCardTopic[] = [
  {
    id: "writing",
    title: "Writing",
    description:
      "Essays and notes on reliability, API design, distributed systems, and engineering craft.",
    icon: "✎",
    path: "/arsenal/writing",
    status: "active",
    tags: ["Essays", "Technical Writing", "Notes"],
    color: "from-emerald-500 to-teal-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        <rect
          x="55"
          y="45"
          width="90"
          height="110"
          rx="6"
          stroke="rgba(16,185,129,0.35)"
          fill="rgba(16,185,129,0.08)"
        />
        {[70, 90, 110, 130].map((y) => (
          <line
            key={y}
            x1="70"
            y1={y}
            x2="130"
            y2={y}
            stroke="rgba(16,185,129,0.25)"
            strokeWidth="2"
          />
        ))}
      </svg>
    ),
  },
  {
    id: "future-projects",
    title: "Future Projects",
    description:
      "Roadmap of platform ideas, AI infrastructure concepts, and long-horizon builds ranked by impact and leverage.",
    icon: "◆",
    path: "/arsenal/future-projects",
    status: "active",
    tags: ["Roadmap", "Ideas", "Rankings"],
    color: "from-violet-500 to-purple-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={50 + i * 28}
            y={120 - i * 30}
            width="36"
            height="36"
            rx="4"
            stroke="rgba(167,139,250,0.4)"
            fill="rgba(167,139,250,0.12)"
          />
        ))}
      </svg>
    ),
  },
  {
    id: "algorithm-visualizer",
    title: "Algorithm Visualizer",
    description:
      "Interactive sorting lab with themes, telemetry, and spatial bar visualizations for common algorithms.",
    icon: "📊",
    path: "/arsenal/algorithm",
    status: "active",
    tags: ["Sorting", "Visualization", "Interactive"],
    color: "from-indigo-500 to-purple-600",
    renderPortalVisual: () => (
      <svg className="h-full w-full p-4" viewBox="0 0 200 200" fill="none">
        {[40, 70, 55, 95, 80, 120, 65].map((h, i) => (
          <rect
            key={i}
            x={45 + i * 18}
            y={160 - h}
            width="12"
            height={h}
            rx="2"
            fill="rgba(129, 140, 248, 0.5)"
          />
        ))}
      </svg>
    ),
  },
];

/** Arsenal hub — writing, roadmap, and visual labs (not in main portfolio nav). */
export const ARSENAL_HUB_SECTIONS: LearningCardTopic[] = [...ARSENAL_HUB_TOPICS, ...ARSENAL_LABS];
