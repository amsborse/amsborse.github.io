import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "@/components/Seo";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warn" | "error" | "route";
  text: string;
}

interface Packet {
  id: string;
  from: "router" | "shard1" | "shard2" | "shard3";
  to: "router" | "shard1" | "shard2" | "shard3";
  label: string;
  color: string;
  duration: number;
}

type ShardingStrategy = "hash" | "range" | "directory";

export default function DatabaseShardingPage() {
  const [strategy, setStrategy] = useState<ShardingStrategy>("hash");

  const [activePackets, setActivePackets] = useState<Packet[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const requestCounter = useRef(0);

  // Shards: array of arrays of strings (e.g. "User:15", "User:Bob")
  const [shards, setShards] = useState<Record<string, string[]>>({
    shard1: [],
    shard2: [],
    shard3: [],
  });

  const addLog = (text: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev, { id: Math.random().toString(), timestamp: time, type, text }]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Initial Logs & Reset Shards on strategy change
  useEffect(() => {
    setLogs([]);
    setShards({ shard1: [], shard2: [], shard3: [] });
    addLog("Database Shard Cluster initialized.", "success");
    addLog(`Active partitioning strategy: ${strategy.toUpperCase()}`, "route");
  }, [strategy]);

  const sendPacket = (
    from: Packet["from"],
    to: Packet["to"],
    label: string,
    color: string,
    duration: number,
    onComplete?: () => void
  ) => {
    const id = Math.random().toString();
    setActivePackets((prev) => [...prev, { id, from, to, label, color, duration }]);

    setTimeout(() => {
      setActivePackets((prev) => prev.filter((p) => p.id !== id));
      if (onComplete) onComplete();
    }, duration * 1000);
  };

  const simulateInsert = () => {
    requestCounter.current++;
    const reqId = requestCounter.current;

    let key = "";
    let valueStr = "";

    if (strategy === "hash") {
      // Use numeric IDs for hash
      const id = Math.floor(Math.random() * 999) + 1;
      key = `${id}`;
      valueStr = `ID:${id}`;
    } else if (strategy === "range") {
      // Use alphabetical for range (A-I, J-R, S-Z)
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const char = chars.charAt(Math.floor(Math.random() * chars.length));
      key = `${char}`;
      valueStr = `User:${char}`;
    } else {
      // Directory (Tenant ID)
      const tenants = ["EU", "US", "APAC"];
      key = tenants[Math.floor(Math.random() * tenants.length)];
      valueStr = `Tenant:${key}`;
    }

    addLog(`[Router] Incoming INSERT request #${reqId} with Key [${key}]`, "info");

    // Router processes the routing logic
    setTimeout(() => {
      let targetShard: "shard1" | "shard2" | "shard3" = "shard1";

      if (strategy === "hash") {
        // Simple modulo hash
        const numeric = parseInt(key, 10);
        const hash = numeric % 3;
        targetShard = hash === 0 ? "shard1" : hash === 1 ? "shard2" : "shard3";
        addLog(
          `[Router] Hash(${key}) % 3 = ${hash} -> Routing to ${targetShard.toUpperCase()}`,
          "route"
        );
      } else if (strategy === "range") {
        const code = key.charCodeAt(0);
        // A(65) to I(73) -> shard1
        // J(74) to R(82) -> shard2
        // S(83) to Z(90) -> shard3
        if (code <= 73) targetShard = "shard1";
        else if (code <= 82) targetShard = "shard2";
        else targetShard = "shard3";
        addLog(`[Router] Range [${key}] mapped to -> ${targetShard.toUpperCase()}`, "route");
      } else {
        // Directory
        if (key === "EU") targetShard = "shard1";
        else if (key === "US") targetShard = "shard2";
        else targetShard = "shard3";
        addLog(
          `[Router] Lookup Tenant [${key}] -> mapped to ${targetShard.toUpperCase()}`,
          "route"
        );
      }

      // Router -> Target Shard
      sendPacket(
        "router",
        targetShard,
        `INSERT ${valueStr}`,
        "text-purple-400 bg-purple-950/80 border border-purple-500/30",
        0.6,
        () => {
          setShards((prev) => {
            const next = { ...prev };
            // Keep max 4 items per shard for visual sanity
            if (next[targetShard].length >= 4) {
              next[targetShard] = [...next[targetShard].slice(1), valueStr];
            } else {
              next[targetShard] = [...next[targetShard], valueStr];
            }
            return next;
          });
          addLog(`[${targetShard.toUpperCase()}] Stored ${valueStr} successfully`, "success");

          // Shard -> Router (ACK)
          sendPacket(
            targetShard,
            "router",
            `ACK`,
            "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
            0.6
          );
        }
      );
    }, 300);
  };

  const simulateCrossShardJoin = () => {
    addLog(`[Router] Incoming complex query requiring CROSS-SHARD JOIN`, "warn");

    // Scatter Phase
    addLog(`[Router] Scatter Phase: Broadcasting query to all shards...`, "route");
    sendPacket(
      "router",
      "shard1",
      "SCAN",
      "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30",
      0.6
    );
    sendPacket(
      "router",
      "shard2",
      "SCAN",
      "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30",
      0.6
    );
    sendPacket(
      "router",
      "shard3",
      "SCAN",
      "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30",
      0.6,
      () => {
        // Gather Phase
        setTimeout(() => {
          addLog(`[Router] Gather Phase: Collecting partial results...`, "route");
          sendPacket(
            "shard1",
            "router",
            "ROWS",
            "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
            0.6
          );
          sendPacket(
            "shard2",
            "router",
            "ROWS",
            "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
            0.6
          );
          sendPacket(
            "shard3",
            "router",
            "ROWS",
            "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
            0.6,
            () => {
              addLog(
                `[Router] Merge Sort & Application Join completed. High Latency Overhead!`,
                "error"
              );
            }
          );
        }, 500);
      }
    );
  };

  const clearData = () => {
    setShards({ shard1: [], shard2: [], shard3: [] });
    addLog(`[System] TRUNCATE executed on all shards`, "warn");
  };

  // Node Positions for packet animation coordinates
  const routerPos = { x: 50, y: 140 };
  const s1Pos = { x: 300, y: 50 };
  const s2Pos = { x: 300, y: 140 };
  const s3Pos = { x: 300, y: 230 };

  const getPosition = (node: string) => {
    if (node === "router") return routerPos;
    if (node === "shard1") return s1Pos;
    if (node === "shard2") return s2Pos;
    return s3Pos;
  };

  return (
    <>
      <Seo
        title="Database Sharding Visualizer"
        description="Visualize Database Sharding partitioning strategies like Hashing, Range-based, and Directory lookups."
        path="/learning/system-design-concepts/database-sharding"
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-16 bg-[#030712]/88 backdrop-blur-md" />

      <div className="min-h-screen bg-[#07111f] pb-24 pt-20 text-[#f1f3f7] font-sans selection:bg-purple-500/30">
        {/* Decorative Grid / Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-purple-500/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <Link
            to="/learning/system-design-concepts"
            className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 hover:text-purple-400 transition-colors mb-6 inline-block"
          >
            ← System Design Concepts
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl font-display font-black tracking-tight text-white sm:text-4xl">
              Database Sharding
            </h1>
            <p className="mt-2 text-slate-400 text-xs font-mono max-w-2xl leading-relaxed">
              Explore horizontal database partitioning. Distribute massive datasets across multiple
              independent cluster nodes to break through single-machine limits.
            </p>
          </header>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left & Middle Column: Interactive Sandbox & Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Simulation Canvas Panel */}
              <div className="relative border border-white/[0.09] bg-[#0c1624] rounded-[22px] p-6 overflow-hidden shadow-2xl min-h-[360px]">
                {/* Background path labels */}
                <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Partition Distribution Canvas
                </div>

                {/* Packet Animations */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  <AnimatePresence>
                    {activePackets.map((packet) => {
                      const fromPos = getPosition(packet.from);
                      const toPos = getPosition(packet.to);

                      return (
                        <motion.div
                          key={packet.id}
                          className={`absolute px-2.5 py-1 rounded-full text-[9px] font-mono shadow-lg whitespace-nowrap z-30 ${packet.color}`}
                          initial={{
                            left: fromPos.x,
                            top: fromPos.y,
                            x: "-50%",
                            y: "-50%",
                            scale: 0.8,
                            opacity: 0,
                          }}
                          animate={{
                            left: toPos.x,
                            top: toPos.y,
                            x: "-50%",
                            y: "-50%",
                            scale: 1,
                            opacity: 1,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: packet.duration, ease: "easeInOut" }}
                        >
                          {packet.label}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Dotted Connections Paths */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800 stroke-[1.5]"
                  style={{ strokeDasharray: "4 4" }}
                >
                  {/* Router <-> Shard 1 */}
                  <line x1={routerPos.x} y1={routerPos.y} x2={s1Pos.x} y2={s1Pos.y} />
                  {/* Router <-> Shard 2 */}
                  <line x1={routerPos.x} y1={routerPos.y} x2={s2Pos.x} y2={s2Pos.y} />
                  {/* Router <-> Shard 3 */}
                  <line x1={routerPos.x} y1={routerPos.y} x2={s3Pos.x} y2={s3Pos.y} />
                </svg>

                {/* Router Node */}
                <div
                  className="absolute flex flex-col items-center z-10"
                  style={{
                    left: routerPos.x,
                    top: routerPos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="w-24 h-24 rounded-2xl bg-[#131b29] border border-cyan-500/40 p-3.5 flex flex-col justify-center items-center shadow-[0_0_20px_rgba(6,182,212,0.15)] relative overflow-hidden">
                    <span className="text-[12px] font-display font-bold text-white z-10">
                      APP ROUTER
                    </span>
                    <span className="text-[8px] font-mono text-cyan-400 mt-1 z-10">
                      Partition Logic
                    </span>

                    <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-cyan-500/20 blur-xl rounded-full" />
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-slate-400">
                    Application Layer
                  </span>
                </div>

                {/* Shard Nodes */}
                {(
                  [
                    {
                      id: "shard1",
                      pos: s1Pos,
                      name: "Shard 0",
                      color: "purple",
                      filter:
                        strategy === "hash"
                          ? "Hash % 3 == 0"
                          : strategy === "range"
                            ? "A-I"
                            : "EU Tenant",
                    },
                    {
                      id: "shard2",
                      pos: s2Pos,
                      name: "Shard 1",
                      color: "pink",
                      filter:
                        strategy === "hash"
                          ? "Hash % 3 == 1"
                          : strategy === "range"
                            ? "J-R"
                            : "US Tenant",
                    },
                    {
                      id: "shard3",
                      pos: s3Pos,
                      name: "Shard 2",
                      color: "indigo",
                      filter:
                        strategy === "hash"
                          ? "Hash % 3 == 2"
                          : strategy === "range"
                            ? "S-Z"
                            : "APAC Tenant",
                    },
                  ] as const
                ).map((shard) => (
                  <div
                    key={shard.id}
                    className="absolute flex flex-col items-center z-10"
                    style={{
                      left: shard.pos.x,
                      top: shard.pos.y,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className={`w-40 rounded-xl bg-[#131b29] border p-3 flex flex-col ${
                        shard.color === "purple"
                          ? "border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                          : shard.color === "pink"
                            ? "border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                            : "border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                        <span
                          className={`text-[10px] font-display font-bold ${
                            shard.color === "purple"
                              ? "text-purple-400"
                              : shard.color === "pink"
                                ? "text-pink-400"
                                : "text-indigo-400"
                          }`}
                        >
                          {shard.name}
                        </span>
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400">
                          {shard.filter}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[8px] min-h-[44px]">
                        {shards[shard.id].length === 0 ? (
                          <div className="text-slate-600 text-center py-2 flex items-center justify-center h-full">
                            Empty Partition
                          </div>
                        ) : (
                          shards[shard.id].map((item, idx) => (
                            <div
                              key={idx}
                              className="bg-black/30 px-2 py-1 rounded text-slate-300 border border-white/5"
                            >
                              {item}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Control Panel */}
              <div className="border border-white/[0.09] bg-[#0c1624]/60 rounded-[22px] p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">
                    Sharding Topology Setup
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-400">
                      {strategy.toUpperCase()} PARTITIONING
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strategy Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      1. Partition Key Strategy
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: "hash", label: "Hash-Based Sharding" },
                        { id: "range", label: "Range-Based Sharding" },
                        { id: "directory", label: "Directory-Based (Tenant)" },
                      ].map((alg) => (
                        <button
                          key={alg.id}
                          onClick={() => setStrategy(alg.id as any)}
                          className={`text-[10px] font-mono py-2 rounded-lg border font-bold transition-all text-left px-3 ${
                            strategy === alg.id
                              ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                              : "bg-slate-900 border-white/5 text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          {alg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      2. Cluster Operations
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={simulateInsert}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-lg py-2 transition font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] w-full"
                      >
                        Insert Random Record
                      </button>
                      <button
                        onClick={simulateCrossShardJoin}
                        className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-bold text-[11px] rounded-lg py-2 transition font-mono w-full"
                      >
                        Simulate Cross-Shard Join
                      </button>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={clearData}
                        className="w-full font-bold text-[10px] rounded-lg py-1.5 transition font-mono border bg-slate-900 border-red-500/20 text-red-400 hover:border-red-500/50"
                      >
                        Truncate All Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Terminal Logs & Theory Card */}
            <div className="space-y-6">
              {/* Terminal Log Console */}
              <div className="border border-white/[0.09] bg-[#07111f] rounded-[22px] overflow-hidden flex flex-col h-[320px] shadow-2xl">
                <div className="flex items-center justify-between bg-[#0b1420] border-b border-white/5 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
                    Operation Log
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] leading-relaxed bg-[#060c14]">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <span className="text-slate-600 select-none shrink-0">{log.timestamp}</span>
                      <span
                        className={
                          log.type === "success"
                            ? "text-emerald-400"
                            : log.type === "warn"
                              ? "text-yellow-400 font-bold"
                              : log.type === "error"
                                ? "text-red-400 font-bold"
                                : log.type === "route"
                                  ? "text-purple-400"
                                  : "text-slate-300"
                        }
                      >
                        {log.text}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Theory Summary Card */}
              <div className="border border-white/[0.09] bg-[#0c1624] rounded-[22px] p-6 shadow-xl space-y-4">
                <h3 className="font-display font-bold text-white text-sm">Sharding Architecture</h3>

                <div className="space-y-3.5">
                  {strategy === "hash" && (
                    <div>
                      <span className="text-[9px] font-mono uppercase text-purple-400 block mb-1">
                        Hash-Based
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Data is distributed based on the hash of a key. Ensures extremely even data
                        distribution across shards, preventing hotspots. However, rebalancing data
                        when adding a new shard requires moving almost all data (unless Consistent
                        Hashing is used).
                      </p>
                    </div>
                  )}
                  {strategy === "range" && (
                    <div>
                      <span className="text-[9px] font-mono uppercase text-purple-400 block mb-1">
                        Range-Based
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Data is divided into contiguous ranges (e.g. A-I, J-R). Very easy to
                        implement and perform range queries, but highly susceptible to uneven data
                        distribution and hotspots (e.g., if one alphabet letter is heavily used).
                      </p>
                    </div>
                  )}
                  {strategy === "directory" && (
                    <div>
                      <span className="text-[9px] font-mono uppercase text-purple-400 block mb-1">
                        Directory-Based (Tenant)
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        A lookup table determines which shard holds which data. Ideal for
                        multi-tenant architectures where each tenant's data must be completely
                        isolated (e.g. geographic regions or specific enterprise customers).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
