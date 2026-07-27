import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import type { LearningCardTopic } from "@/components/learning/LearningInteractiveCard";
import { LearningHubLayout } from "@/components/learning/LearningHubLayout";
import { FlashcardsSection } from "@/components/learning/flashcards/FlashcardsSection";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";

const TOPICS: LearningCardTopic[] = [
  {
    id: "algorithm",
    title: "Algorithms",
    description:
      "Card hub for sorting, search, graphs, dynamic programming, greedy methods, and tree structures — each with its own interactive sandbox.",
    icon: "⚡",
    path: "/learning/algorithm",
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
  {
    id: "coding-patterns",
    title: "Coding Patterns",
    description:
      "Master common software design and coding patterns: factory, singleton, observer, strategy, builder, and decorator—with interactive sandboxes to trace call stacks and class structures.",
    icon: "🧩",
    status: "active",
    path: "/learning/coding-patterns",
    tags: ["Design Patterns", "Clean Code", "OOP & FP"],
    color: "from-blue-500 to-cyan-600",
    renderPortalVisual: () => (
      /* Animated Code Terminal SVG simulating typing code */
      <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
        <style>
          {`
            @keyframes type-line-1 {
              0%, 10% { width: 0; }
              40%, 100% { width: 110px; }
            }
            @keyframes type-line-2 {
              0%, 40% { width: 0; }
              70%, 100% { width: 70px; }
            }
            @keyframes type-line-3 {
              0%, 70% { width: 0; }
              95%, 100% { width: 90px; }
            }
            @keyframes blink-cursor {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
            .code-l1 { animation: type-line-1 5s infinite cubic-bezier(0.4, 0, 0.2, 1); }
            .code-l2 { animation: type-line-2 5s infinite cubic-bezier(0.4, 0, 0.2, 1); }
            .code-l3 { animation: type-line-3 5s infinite cubic-bezier(0.4, 0, 0.2, 1); }
            .cursor { animation: blink-cursor 1s infinite step-start; }
          `}
        </style>

        {/* Terminal Window */}
        <rect
          x="15"
          y="35"
          width="170"
          height="130"
          rx="8"
          fill="#07080d"
          stroke="rgba(56, 189, 248, 0.15)"
          strokeWidth="1.5"
        />

        {/* Window controls */}
        <circle cx="30" cy="47" r="3" fill="#ef4444" opacity="0.8" />
        <circle cx="40" cy="47" r="3" fill="#eab308" opacity="0.8" />
        <circle cx="50" cy="47" r="3" fill="#22c55e" opacity="0.8" />
        <line x1="15" y1="58" x2="185" y2="58" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />

        {/* Mock code lines */}
        {/* Line 1 */}
        <g transform="translate(30, 75)">
          <rect
            className="code-l1"
            x="0"
            y="0"
            width="110"
            height="6"
            rx="3"
            fill="url(#syntaxKeyword)"
          />
          {/* Cursor */}
          <rect className="cursor" x="115" y="-1" width="4" height="8" rx="1" fill="#38bdf8" />
        </g>

        {/* Line 2 */}
        <g transform="translate(45, 95)">
          <rect
            className="code-l2"
            x="0"
            y="0"
            width="70"
            height="6"
            rx="3"
            fill="url(#syntaxVar)"
          />
        </g>

        {/* Line 3 */}
        <g transform="translate(45, 115)">
          <rect
            className="code-l3"
            x="0"
            y="0"
            width="90"
            height="6"
            rx="3"
            fill="url(#syntaxFunc)"
          />
        </g>

        <defs>
          <linearGradient id="syntaxKeyword" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="30%" stopColor="#38bdf8" />
            <stop offset="35%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id="syntaxVar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="65%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <linearGradient id="syntaxFunc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="50%" stopColor="#fb7185" />
            <stop offset="55%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "system-design-concepts",
    title: "System Design Concepts",
    description:
      "Core concepts of high-scale system design: caching strategies, database partitioning/sharding, DNS load balancing, CDN caching, and proxy layers.",
    icon: "⚙️",
    status: "active",
    path: "/learning/system-design-concepts",
    tags: ["Horizontal Scaling", "Sharding", "Cache Eviction"],
    color: "from-purple-500 to-indigo-600",
    renderPortalVisual: () => (
      /* Database Shards cylinder layout with arrows */
      <svg className="w-full h-full p-4" viewBox="0 0 200 200" fill="none">
        {/* Shard 1 */}
        <g transform="translate(30, 60)">
          <ellipse cx="25" cy="15" rx="20" ry="8" fill="#0d0e15" stroke="#8b5cf6" strokeWidth="2" />
          <path
            d="M 5 15 L 5 45 A 20 8 0 0 0 45 45 L 45 15"
            fill="#0d0e15"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
          <ellipse
            cx="25"
            cy="45"
            rx="20"
            ry="8"
            stroke="#8b5cf6"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
          <text x="14" y="33" fill="#c084fc" fontSize="8" fontFamily="monospace">
            SHARD A
          </text>
        </g>
        {/* Shard 2 */}
        <g transform="translate(110, 60)">
          <ellipse cx="25" cy="15" rx="20" ry="8" fill="#0d0e15" stroke="#8b5cf6" strokeWidth="2" />
          <path
            d="M 5 15 L 5 45 A 20 8 0 0 0 45 45 L 45 15"
            fill="#0d0e15"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
          <ellipse
            cx="25"
            cy="45"
            rx="20"
            ry="8"
            stroke="#8b5cf6"
            strokeWidth="2"
            fill="none"
            opacity="0.5"
          />
          <text x="14" y="33" fill="#c084fc" fontSize="8" fontFamily="monospace">
            SHARD B
          </text>
        </g>
        {/* Request Router Node top */}
        <circle cx="100" cy="35" r="10" fill="#0d0e15" stroke="#6366f1" strokeWidth="2" />
        <text x="96" y="39" fill="#818cf8" fontSize="12" fontWeight="bold">
          R
        </text>

        <path
          d="M 90 35 L 55 60"
          stroke="rgba(99, 102, 241, 0.4)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <path
          d="M 110 35 L 135 60"
          stroke="rgba(99, 102, 241, 0.4)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </svg>
    ),
  },
];

export default function Learning() {
  return (
    <LearningHubLayout
      seo={{
        title: "Learning Hub — Akshay Borse",
        description:
          "Interactive visual playpens and sandboxes exploring computer science theory, distributed systems, AI security, and platform engineering.",
        path: "/learning",
      }}
      eyebrow="CS Theory & Interactive Sandboxes"
      title="Learning Lab"
      description="Explore complex concepts made tangible through interactive simulations. Move values, tweak parameters, and analyze real-time telemetry."
    >
      <div className={HUB_CARD_GRID}>
        {TOPICS.map((topic, index) => (
          <LearningInteractiveCard key={topic.id} topic={topic} index={index} />
        ))}
      </div>

      <FlashcardsSection />
    </LearningHubLayout>
  );
}
