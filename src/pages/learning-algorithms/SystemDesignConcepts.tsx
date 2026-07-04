import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import type { LearningCardTopic } from "@/components/learning/LearningInteractiveCard";
import { LearningHubLayout } from "@/components/learning/LearningHubLayout";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";

interface Concept {
  id: string;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  metrics: { label: string; value: string }[];
  keyTerms: string[];
  icon: string;
  color: string;
  interactivePreview: () => React.ReactNode;
}

const CONCEPTS: Concept[] = [
  {
    id: "consistency",
    title: "Consistency Models",
    description:
      "Determines how and when data updates propagate across replica nodes in a distributed database system. Trades off write availability for read accuracy.",
    keyTerms: ["CAP Theorem", "PACELC", "Linearizability", "Eventual Consistency", "R + W > N"],
    pros: ["Ensures absolute data correctness", "Avoids dirty reads in financial transactions"],
    cons: ["Higher latency on writes", "Prone to availability drop during partition"],
    metrics: [
      { label: "Propagation Delay", value: "High (Strong) / Low (Eventual)" },
      { label: "CAP Alignment", value: "CP (Strong) vs AP (Eventual)" },
    ],
    icon: "⚖️",
    color: "from-blue-500 to-indigo-600",
    interactivePreview: () => (
      <div className="w-full h-40 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between p-4 relative overflow-hidden">
        <div className="flex justify-between items-center z-10">
          <span className="text-[10px] font-mono text-cyan-400">Node A (Leader)</span>
          <span className="text-[10px] font-mono text-indigo-400">Node B (Follower)</span>
        </div>
        <div className="flex items-center justify-between px-6 py-2 z-10">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-display font-bold text-cyan-300">
            Val: 5
          </div>
          <div className="flex-1 h-[2px] mx-4 relative bg-slate-800">
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400"
              animate={{ x: [0, 160] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
            />
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center font-display font-bold text-indigo-300">
            Val: 5
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 text-center z-10">
          Replicating state update via Raft consensus
        </div>
      </div>
    ),
  },
  {
    id: "scaling",
    title: "Scaling (Horizontal vs Vertical)",
    description:
      "Methods of increasing system throughput. Vertical scaling (scaling up) upgrades resource nodes. Horizontal scaling (scaling out) adds more node clones.",
    keyTerms: [
      "Stateless App Nodes",
      "Share-Nothing Architecture",
      "Hardware Limits",
      "Commodity Servers",
    ],
    pros: ["Horizontal: Unlimited scaling potential, high fault-tolerance"],
    cons: ["Horizontal: Increased infrastructure complexity and load routing"],
    metrics: [
      { label: "Scale Limits", value: "Hard limit (Vertical) / Unlimited (Horizontal)" },
      { label: "Fault Tolerance", value: "Single point of failure (Vertical) / High (Horizontal)" },
    ],
    icon: "📈",
    color: "from-emerald-500 to-teal-600",
    interactivePreview: () => (
      <div className="w-full h-40 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between p-4 relative overflow-hidden">
        <div className="flex justify-around items-end h-28 pb-2">
          {/* Horizontal scaling boxes representation */}
          <motion.div
            className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400 font-mono font-bold"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.1 }}
          >
            Node 1
          </motion.div>
          <motion.div
            className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400 font-mono font-bold"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
          >
            Node 2
          </motion.div>
          <motion.div
            className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400 font-mono font-bold"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          >
            Node 3
          </motion.div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 text-center">
          Horizontal Scaling: Spreading requests across active stateless workers
        </div>
      </div>
    ),
  },
  {
    id: "load-balancing",
    title: "Load Balancing",
    description:
      "Acts as a traffic cop routing user queries across target server groups to optimize resource utilization, throughput, and minimize server load.",
    keyTerms: ["Round Robin", "Consistent Hashing", "Least Connections", "Layer 4 vs Layer 7"],
    pros: ["Eliminates single point of failure", "Prevents server overloading / starvation"],
    cons: ["Adds network hops", "Single point of failure if load balancer itself has no replica"],
    metrics: [
      { label: "Supported Layers", value: "L4 (Transport) / L7 (Application)" },
      { label: "Algorithms", value: "Static & Dynamic options" },
    ],
    icon: "🔀",
    color: "from-cyan-500 to-blue-600",
    interactivePreview: () => (
      <div className="w-full h-40 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between p-4 relative overflow-hidden">
        <div className="flex items-center justify-between h-full px-4">
          <div className="w-8 h-8 rounded-full bg-blue-950 border border-blue-500/40 flex items-center justify-center font-display font-bold text-xs text-blue-300">
            LB
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-16 h-5 rounded bg-slate-900 border border-white/5 flex items-center justify-center text-[8px] font-mono text-slate-400">
              Server A
            </div>
            <div className="w-16 h-5 rounded bg-slate-900 border border-white/5 flex items-center justify-center text-[8px] font-mono text-slate-400">
              Server B
            </div>
            <div className="w-16 h-5 rounded bg-slate-900 border border-white/5 flex items-center justify-center text-[8px] font-mono text-slate-400">
              Server C
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 text-center">
          Routing requests round-robin style
        </div>
      </div>
    ),
  },
  {
    id: "caching",
    title: "Caching Strategies",
    description:
      "Temporary high-speed memory layer storing hot datasets to serve reads instantly and scale down core database requirements.",
    keyTerms: ["Cache Aside", "Write-Through", "LRU Cache Eviction", "TTL (Time to Live)"],
    pros: ["Sub-millisecond query responses", "Protects relational databases from load spikes"],
    cons: ["Risk of serving stale data", "Added cache synchronization/invalidation logic"],
    metrics: [
      { label: "Read Latency", value: "< 1ms (Redis/Memcached)" },
      { label: "Memory Type", value: "In-Memory RAM" },
    ],
    icon: "💾",
    color: "from-amber-500 to-orange-600",
    interactivePreview: () => (
      <div className="w-full h-40 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between p-4 relative overflow-hidden">
        <div className="flex justify-between items-center h-24 px-4">
          <div className="text-center">
            <span className="text-[8px] font-mono block text-slate-500">Client</span>
            <div className="w-10 h-10 rounded bg-slate-900 border border-white/5 flex items-center justify-center">
              💻
            </div>
          </div>
          <div className="text-center relative">
            <span className="text-[8px] font-mono block text-amber-400">Redis Cache</span>
            <div className="w-12 h-10 rounded bg-amber-950/50 border border-amber-500/40 flex items-center justify-center font-mono text-[9px] text-amber-300 font-bold">
              Hit (98%)
            </div>
          </div>
          <div className="text-center opacity-40">
            <span className="text-[8px] font-mono block text-slate-500">Postgres DB</span>
            <div className="w-10 h-10 rounded bg-slate-900 border border-white/5 flex items-center justify-center">
              🗄️
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 text-center">
          Memory lookup prevents costly database scans
        </div>
      </div>
    ),
  },
  {
    id: "database-sharding",
    title: "Database Sharding",
    description:
      "Splits monolithic databases horizontally into individual partitions (shards) across separate database nodes to balance CPU and storage constraints.",
    keyTerms: [
      "Horizontal Partitioning",
      "Shard Key Selection",
      "Consistent Hashing",
      "Cross-Shard Joins",
    ],
    pros: ["Scales database storage capacity linearly", "Limits blast radius of database failures"],
    cons: ["Highly complex cross-shard JOIN queries", "Resharding data requires heavy replication"],
    metrics: [
      { label: "Shard Key", value: "Hashed / Range / Directory" },
      { label: "Storage", value: "Distributed partitions" },
    ],
    icon: "⚡",
    color: "from-purple-500 to-pink-600",
    interactivePreview: () => (
      <div className="w-full h-40 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between p-4 relative overflow-hidden">
        <div className="flex justify-around items-center h-24">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-mono text-slate-400">Shard 0 (Users A-M)</span>
            <div className="w-14 h-10 rounded bg-purple-950 border border-purple-500/30 flex items-center justify-center text-xs text-purple-300 font-bold">
              DB 1
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-mono text-slate-400">Shard 1 (Users N-Z)</span>
            <div className="w-14 h-10 rounded bg-pink-950 border border-pink-500/30 flex items-center justify-center text-xs text-pink-300 font-bold">
              DB 2
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 text-center">
          Sharding by user ID hash reduces single-node limits
        </div>
      </div>
    ),
  },
  {
    id: "cdn",
    title: "Content Delivery Network (CDN)",
    description:
      "Distributed proxy servers caching media resources at edge locations globally closer to clients to eliminate latency overhead.",
    keyTerms: ["Edge Servers", "Anycast Routing", "Static Assets", "Origin Shielding"],
    pros: ["Reduces page loading latency worldwide", "Reduces origin server network costs"],
    cons: ["Purging cache updates takes time", "Added cost for high data egress volumes"],
    metrics: [
      { label: "Latency", value: "Edge cached assets (< 10ms)" },
      { label: "Assets Type", value: "Images, Videos, JS, CSS" },
    ],
    icon: "🌍",
    color: "from-cyan-500 to-emerald-600",
    interactivePreview: () => (
      <div className="w-full h-40 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between p-4 relative overflow-hidden">
        <div className="flex justify-around items-center h-24 px-2">
          <div className="text-center">
            <span className="text-[8px] font-mono block text-slate-500">Client (US)</span>
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-xs">
              🇺🇸
            </div>
          </div>
          <div className="text-center">
            <span className="text-[8px] font-mono block text-emerald-400">CDN Edge</span>
            <div className="w-10 h-8 rounded bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[8px] font-mono text-emerald-300 font-bold">
              Edge NY
            </div>
          </div>
          <div className="text-center opacity-40">
            <span className="text-[8px] font-mono block text-slate-500">Origin (EU)</span>
            <div className="w-10 h-8 rounded bg-slate-900 border border-white/5 flex items-center justify-center text-[8px] font-mono">
              Server
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-slate-500 text-center">
          Edge locations serve requests without hitting origin server
        </div>
      </div>
    ),
  },
];

function toTopics(concepts: Concept[]): LearningCardTopic[] {
  return concepts.map((concept) => ({
    id: concept.id,
    title: concept.title,
    description: concept.description,
    icon: concept.icon,
    status:
      concept.id === "consistency" || concept.id === "load-balancing" || concept.id === "caching"
        ? ("active" as const)
        : ("coming-soon" as const),
    path:
      concept.id === "consistency"
        ? "/learning/system-design-concepts/consistency"
        : concept.id === "load-balancing"
          ? "/learning/system-design-concepts/load-balancing"
          : concept.id === "caching"
            ? "/learning/system-design-concepts/caching"
            : undefined,
    tags: concept.keyTerms,
    color: concept.color,
    renderPortalVisual: () => (
      <div className="w-full h-full flex items-center justify-center p-2">
        {concept.interactivePreview()}
      </div>
    ),
  }));
}

export default function SystemDesignConceptsPage() {
  const [search, setSearch] = useState("");

  const filteredConcepts = useMemo(
    () =>
      CONCEPTS.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.keyTerms.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      ),
    [search]
  );

  const topics = useMemo(() => toTopics(filteredConcepts), [filteredConcepts]);

  return (
    <LearningHubLayout
      seo={{
        title: "System Design Concepts — Akshay Borse",
        description:
          "Learn the architectural concepts and models of high-scale system designs: consistency, scaling, caching, sharding, and CDN topologies.",
        path: "/learning/system-design-concepts",
      }}
      backLink={{ to: "/learning", label: "← Learning Lab" }}
      blobVariant="purple"
      eyebrow="Distributed Architecture"
      title="System Design Concepts"
      description="Explore architectural building blocks for high-availability, low-latency, and horizontally scalable distributed systems."
      headerMb="mb-16"
      toolbar={
        <div className="max-w-md mx-auto mb-16">
          <input
            type="text"
            placeholder="Search concepts or key terms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-5 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/40 font-mono"
          />
        </div>
      }
    >
      {topics.length === 0 ? (
        <p className="text-center text-slate-500 font-mono text-sm">
          No concepts match your search query.
        </p>
      ) : (
        <div className={HUB_CARD_GRID}>
          {topics.map((topic, index) => (
            <LearningInteractiveCard key={topic.id} topic={topic} index={index} />
          ))}
        </div>
      )}
    </LearningHubLayout>
  );
}
