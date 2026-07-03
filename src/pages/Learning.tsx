import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { CSSProperties, MouseEvent, useRef } from "react";

interface LearningTopic {
  id: string;
  title: string;
  description: string;
  icon: string;
  path?: string;
  status: "active" | "coming-soon";
  tags: string[];
  color: string;
  renderPortalVisual: () => React.ReactNode;
}

const TOPICS: LearningTopic[] = [
  {
    id: "algorithm",
    title: "Algorithm Visualizer",
    description:
      "Interactive visual simulation of sorting algorithms, execution paths, and spatial telemetry. Bringing abstract data mechanics into a responsive physical dimension.",
    icon: "⚡",
    path: "/algorithm",
    status: "active",
    tags: ["Data Structures", "Big-O Analysis", "Interactive Telemetry"],
    color: "from-indigo-500 to-purple-600",
    renderPortalVisual: () => (
      /* Isometric Sorting Bar Graph preview */
      <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
        <g transform="translate(10, 30)">
          {/* Base plane */}
          <path
            d="M 0 100 L 90 55 L 180 100 L 90 145 Z"
            fill="rgba(99, 102, 241, 0.05)"
            stroke="rgba(99, 102, 241, 0.2)"
            strokeWidth="1"
          />

          {/* Isometric Bars rising */}
          {/* Bar 1 */}
          <g transform="translate(30, 70)">
            <path d="M 0 0 L 10 -5 L 20 0 L 10 5 Z" fill="url(#purpleGrad)" />
            <path d="M 0 0 L 10 5 L 10 25 L 0 20 Z" fill="rgba(139, 92, 246, 0.85)" />
            <path d="M 10 5 L 20 0 L 20 20 L 10 25 Z" fill="rgba(139, 92, 246, 0.65)" />
          </g>
          {/* Bar 2 */}
          <g transform="translate(60, 50)">
            <path d="M 0 0 L 10 -5 L 20 0 L 10 5 Z" fill="url(#indigoGrad)" />
            <path d="M 0 0 L 10 5 L 10 50 L 0 45 Z" fill="rgba(99, 102, 241, 0.85)" />
            <path d="M 10 5 L 20 0 L 20 45 L 10 50 Z" fill="rgba(99, 102, 241, 0.65)" />
          </g>
          {/* Bar 3 */}
          <g transform="translate(90, 60)">
            <path d="M 0 0 L 10 -5 L 20 0 L 10 5 Z" fill="url(#pinkGrad)" />
            <path d="M 0 0 L 10 5 L 10 35 L 0 30 Z" fill="rgba(236, 72, 153, 0.85)" />
            <path d="M 10 5 L 20 0 L 20 30 L 10 35 Z" fill="rgba(236, 72, 153, 0.65)" />
          </g>
          {/* Bar 4 */}
          <g transform="translate(120, 80)">
            <path d="M 0 0 L 10 -5 L 20 0 L 10 5 Z" fill="url(#purpleGrad)" />
            <path d="M 0 0 L 10 5 L 10 15 L 0 10 Z" fill="rgba(139, 92, 246, 0.75)" />
            <path d="M 10 5 L 20 0 L 20 10 L 10 15 Z" fill="rgba(139, 92, 246, 0.55)" />
          </g>
        </g>
        <defs>
          <linearGradient id="purpleGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="indigoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="pinkGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "sysdesign",
    title: "Distributed Systems Playground",
    description:
      "Visual sandboxes for load balancing policies, message queues handling high TPS, rate-limiting algorithms, and consensus protocols in distributed networks.",
    icon: "🌐",
    status: "coming-soon",
    tags: ["System Design", "Rate Limiter", "Consensus"],
    color: "from-emerald-500 to-teal-600",
    renderPortalVisual: () => (
      /* Topology network schematics with circular nodes */
      <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
        {/* Paths */}
        <path
          d="M 40 100 L 100 50 M 40 100 L 100 150 M 100 50 L 160 100 M 100 150 L 160 100 M 100 50 L 100 150"
          stroke="rgba(16, 185, 129, 0.25)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Glowing Node 1 */}
        <circle cx="40" cy="100" r="8" fill="#0d0e15" stroke="#10b981" strokeWidth="2.5" />
        <circle
          cx="40"
          cy="100"
          r="14"
          stroke="#10b981"
          strokeWidth="1"
          opacity="0.3"
          className="animate-ping"
          style={{ transformOrigin: "40px 100px" }}
        />

        {/* Node 2 */}
        <circle cx="100" cy="50" r="8" fill="#0d0e15" stroke="#10b981" strokeWidth="2.5" />
        {/* Node 3 */}
        <circle cx="100" cy="150" r="8" fill="#0d0e15" stroke="#10b981" strokeWidth="2.5" />

        {/* Node 4 */}
        <circle cx="160" cy="100" r="8" fill="#0d0e15" stroke="#059669" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: "security",
    title: "AI Security & Cryptography Sandbox",
    description:
      "Interactive exploration of agentic AI guardrails, risk-scoring engines, tokenized authorization, and Purview-style zero-touch enforcement models.",
    icon: "🛡️",
    status: "coming-soon",
    tags: ["Agent Security", "Zero Trust", "Risk Scoring"],
    color: "from-pink-500 to-rose-600",
    renderPortalVisual: () => (
      /* Concentric Radar sweeping arc */
      <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
        <circle cx="100" cy="100" r="80" stroke="rgba(244, 114, 182, 0.15)" strokeWidth="1" />
        <circle cx="100" cy="100" r="55" stroke="rgba(244, 114, 182, 0.2)" strokeWidth="1" />
        <circle cx="100" cy="100" r="30" stroke="rgba(244, 114, 182, 0.3)" strokeWidth="1.5" />

        {/* Radar Sweep Line */}
        <line x1="100" y1="100" x2="160" y2="40" stroke="#f472b6" strokeWidth="2" opacity="0.8" />
        <path d="M 100 100 L 160 40 A 85 85 0 0 1 180 100 Z" fill="url(#radarGrad)" />

        <defs>
          <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "ml-rag",
    title: "RAG & Vector Search Simulator",
    description:
      "Interactive guide on vector embedding projections, similarity search metrics, and Retrieval-Augmented Generation context window injection.",
    icon: "🧠",
    status: "coming-soon",
    tags: ["Embeddings", "RAG Pipeline", "Vector DB"],
    color: "from-amber-500 to-orange-600",
    renderPortalVisual: () => (
      /* Cluster of vector dots */
      <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
        {/* Core center dot */}
        <circle cx="100" cy="100" r="5" fill="#fbbf24" />
        <circle
          cx="100"
          cy="100"
          r="25"
          stroke="rgba(251,191,36,0.25)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Satellite clusters */}
        <circle cx="70" cy="80" r="4" fill="#fbbf24" opacity="0.9" />
        <line x1="100" y1="100" x2="70" y2="80" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />

        <circle cx="130" cy="90" r="4" fill="#f59e0b" opacity="0.85" />
        <line x1="100" y1="100" x2="130" y2="90" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />

        <circle cx="110" cy="130" r="3.5" fill="#d97706" opacity="0.75" />
        <line x1="100" y1="100" x2="110" y2="130" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />

        <circle cx="85" cy="120" r="4" fill="#fbbf24" opacity="0.95" />
        <line x1="100" y1="100" x2="85" y2="120" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />
      </svg>
    ),
  },
];

function InteractiveCard({ topic, index }: { topic: LearningTopic; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;

    // Throttled mouse tracking using CSS Variables (GPU accelerated, no React re-renders)
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  }

  const CardContent = (
    <div className="h-full flex relative z-10 select-none items-center overflow-hidden">
      {/* Left side text information (slides to make room for visual preview) */}
      <div className="w-full shrink-0 group-hover:w-[60%] transition-all duration-500 ease-out flex flex-col justify-between h-full p-8 pr-4">
        <div>
          {/* Header line */}
          <div className="flex justify-between items-start mb-6">
            {/* Continuous floating icon */}
            <motion.div
              className="text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
              animate={{
                y: [0, -6, 0],
                rotate: [0, -3, 3, 0],
              }}
              transition={{
                duration: 4 + index,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {topic.icon}
            </motion.div>

            {/* Tag badge */}
            {topic.status === "active" ? (
              <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                Active Sandbox
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono tracking-wider px-2.5 py-1 rounded bg-slate-500/10 border border-slate-500/20 text-slate-500">
                Coming Soon
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors duration-300">
            {topic.title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">{topic.description}</p>
        </div>

        <div>
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-mono text-slate-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Action */}
          {topic.status === "active" && topic.path ? (
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 group-hover:translate-x-1.5 transition-transform duration-300">
              Launch Sandbox <span className="text-sm">➔</span>
            </div>
          ) : (
            <div className="text-xs font-mono uppercase tracking-wider text-slate-600">
              Research Phase
            </div>
          )}
        </div>
      </div>

      {/* Right side visual preview: hidden by default, slides open on hover */}
      <div className="w-0 group-hover:w-[40%] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out h-full relative border-l border-white/5 flex items-center justify-center bg-black/35 overflow-hidden">
        <div className="w-full h-full transform scale-90 group-hover:scale-100 transition-transform duration-500 ease-out flex items-center justify-center">
          {topic.renderPortalVisual()}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial="initial"
      whileHover="hover"
      animate="animate"
      className="group relative rounded-2xl bg-[#0d0e15]/90 border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden flex flex-col justify-between h-[320px]"
      style={
        {
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.02)",
          ["--mouse-x"]: "50%",
          ["--mouse-y"]: "50%",
        } as CSSProperties
      }
    >
      {/* 
        Mesh Grid layer tracking the cursor:
        Renders a fine grid pattern strictly in a spotlight around the user's cursor
      */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage:
            "radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), black 20%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(circle 120px at var(--mouse-x) var(--mouse-y), black 20%, transparent 100%)",
        }}
      />

      {/* Subtle top color gradient line */}
      <div
        className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${topic.color} opacity-70 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {topic.status === "active" && topic.path ? (
        <Link to={topic.path} className="h-full block">
          {CardContent}
        </Link>
      ) : (
        <div className="h-full cursor-not-allowed">{CardContent}</div>
      )}
    </motion.div>
  );
}

export default function Learning() {
  return (
    <>
      <Seo
        title="Learning Hub — Akshay Borse"
        description="Interactive visual playpens and sandboxes exploring computer science theory, distributed systems, AI security, and platform engineering."
        path="/learning"
      />

      <div className="min-h-screen relative overflow-x-hidden pb-32 pt-20 bg-transparent text-[#f1f3f7] font-sans">
        {/* Ambient glow blobs */}
        <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-purple-500/10 to-transparent blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Header */}
          <header className="text-center mb-16">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-3"
            >
              CS Theory & Interactive Sandboxes
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-[2.25rem] sm:text-[3.25rem] font-display font-semibold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8]"
            >
              Learning Lab
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-4 text-sm max-w-lg mx-auto text-slate-400 leading-relaxed"
            >
              Explore complex concepts made tangible through interactive simulations. Move values,
              tweak parameters, and analyze real-time telemetry.
            </motion.p>
          </header>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {TOPICS.map((topic, index) => (
              <InteractiveCard key={topic.id} topic={topic} index={index} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
