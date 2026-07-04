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
  from: "client" | "app" | "cache" | "db";
  to: "client" | "app" | "cache" | "db";
  label: string;
  color: string;
  duration: number;
}

type CachingStrategy = "cache-aside" | "write-through" | "write-behind";

export default function CachingStrategiesPage() {
  const [strategy, setStrategy] = useState<CachingStrategy>("cache-aside");

  const [activePackets, setActivePackets] = useState<Packet[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const requestCounter = useRef(0);
  const [cacheEntries, setCacheEntries] = useState<Record<string, string>>({});
  const [dbEntries, setDbEntries] = useState<Record<string, string>>({
    "user:1": '{"name":"Alice","age":28}',
    "user:2": '{"name":"Bob","age":34}',
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

  // Initial Logs
  useEffect(() => {
    setLogs([]);
    addLog("Caching subsystem initialized.", "success");
    addLog(`Active strategy: ${strategy.toUpperCase()}`, "route");
    // Clear cache on strategy change to demonstrate clean state
    setCacheEntries({});
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

  const simulateRead = () => {
    requestCounter.current++;
    const reqId = requestCounter.current;
    const key = `user:${Math.floor(Math.random() * 2) + 1}`; // user:1 or user:2

    addLog(`[Client] Incoming READ request #${reqId} for ${key}`, "info");

    // Client -> App
    sendPacket(
      "client",
      "app",
      `GET ${key}`,
      "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
      0.6,
      () => {
        if (
          strategy === "cache-aside" ||
          strategy === "write-through" ||
          strategy === "write-behind"
        ) {
          // App -> Cache (Check Cache)
          addLog(`[App] Checking cache for ${key}...`, "info");
          sendPacket(
            "app",
            "cache",
            `GET ${key}`,
            "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30",
            0.6,
            () => {
              if (cacheEntries[key]) {
                // Cache Hit
                addLog(`[Cache] HIT for ${key}`, "success");
                // Cache -> App
                sendPacket(
                  "cache",
                  "app",
                  `HIT`,
                  "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                  0.6,
                  () => {
                    addLog(`[App] Returning data to client`, "success");
                    // App -> Client
                    sendPacket(
                      "app",
                      "client",
                      `DATA`,
                      "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                      0.6
                    );
                  }
                );
              } else {
                // Cache Miss
                addLog(`[Cache] MISS for ${key}`, "warn");
                // Cache -> App
                sendPacket(
                  "cache",
                  "app",
                  `MISS`,
                  "text-red-400 bg-red-950/80 border border-red-500/30",
                  0.6,
                  () => {
                    addLog(`[App] Fetching ${key} from Database...`, "info");
                    // App -> DB
                    sendPacket(
                      "app",
                      "db",
                      `GET ${key}`,
                      "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
                      0.6,
                      () => {
                        const data = dbEntries[key] || "null";
                        addLog(`[DB] Fetched ${key}`, "success");

                        // DB -> App
                        sendPacket(
                          "db",
                          "app",
                          `DATA`,
                          "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                          0.6,
                          () => {
                            if (strategy === "cache-aside") {
                              addLog(`[App] Writing ${key} to Cache (Cache-Aside)`, "info");
                              // App -> Cache (Update Cache)
                              sendPacket(
                                "app",
                                "cache",
                                `SET ${key}`,
                                "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30",
                                0.6,
                                () => {
                                  setCacheEntries((prev) => ({ ...prev, [key]: data }));
                                  addLog(`[Cache] Stored ${key}`, "success");

                                  addLog(`[App] Returning data to client`, "success");
                                  // App -> Client
                                  sendPacket(
                                    "app",
                                    "client",
                                    `DATA`,
                                    "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                                    0.6
                                  );
                                }
                              );
                            } else {
                              addLog(`[App] Returning data to client`, "success");
                              // App -> Client
                              sendPacket(
                                "app",
                                "client",
                                `DATA`,
                                "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                                0.6
                              );
                            }
                          }
                        );
                      }
                    );
                  }
                );
              }
            }
          );
        }
      }
    );
  };

  const simulateWrite = () => {
    requestCounter.current++;
    const reqId = requestCounter.current;
    const key = `user:${Math.floor(Math.random() * 2) + 1}`;
    const value = `{"name":"User-${Math.floor(Math.random() * 999)}"}`;

    addLog(`[Client] Incoming WRITE request #${reqId} for ${key}`, "info");

    // Client -> App
    sendPacket(
      "client",
      "app",
      `SET ${key}`,
      "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
      0.6,
      () => {
        if (strategy === "cache-aside") {
          // Cache-Aside Write: Update DB directly, then invalidate (or update) cache
          addLog(`[App] Writing ${key} to Database...`, "info");
          sendPacket(
            "app",
            "db",
            `SET ${key}`,
            "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
            0.6,
            () => {
              setDbEntries((prev) => ({ ...prev, [key]: value }));
              addLog(`[DB] Updated ${key}`, "success");
              sendPacket(
                "db",
                "app",
                `ACK`,
                "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                0.6,
                () => {
                  addLog(`[App] Invalidating ${key} in Cache...`, "warn");
                  sendPacket(
                    "app",
                    "cache",
                    `DEL ${key}`,
                    "text-red-400 bg-red-950/80 border border-red-500/30",
                    0.6,
                    () => {
                      setCacheEntries((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      });
                      addLog(`[Cache] Invalidated ${key}`, "success");
                      sendPacket(
                        "cache",
                        "app",
                        `ACK`,
                        "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                        0.6,
                        () => {
                          sendPacket(
                            "app",
                            "client",
                            `ACK`,
                            "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                            0.6
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        } else if (strategy === "write-through") {
          // Write-Through: App -> Cache -> DB synchronously
          addLog(`[App] Writing ${key} to Cache...`, "info");
          sendPacket(
            "app",
            "cache",
            `SET ${key}`,
            "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
            0.6,
            () => {
              setCacheEntries((prev) => ({ ...prev, [key]: value }));
              addLog(`[Cache] Updated ${key}`, "success");

              addLog(`[Cache] Writing synchronously to Database...`, "info");
              sendPacket(
                "cache",
                "db",
                `SET ${key}`,
                "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
                0.6,
                () => {
                  setDbEntries((prev) => ({ ...prev, [key]: value }));
                  addLog(`[DB] Updated ${key}`, "success");

                  sendPacket(
                    "db",
                    "cache",
                    `ACK`,
                    "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                    0.6,
                    () => {
                      sendPacket(
                        "cache",
                        "app",
                        `ACK`,
                        "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                        0.6,
                        () => {
                          sendPacket(
                            "app",
                            "client",
                            `ACK`,
                            "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                            0.6
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        } else if (strategy === "write-behind") {
          // Write-Behind: App -> Cache (sync) -> DB (async)
          addLog(`[App] Writing ${key} to Cache...`, "info");
          sendPacket(
            "app",
            "cache",
            `SET ${key}`,
            "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
            0.6,
            () => {
              setCacheEntries((prev) => ({ ...prev, [key]: value }));
              addLog(`[Cache] Updated ${key}`, "success");

              sendPacket(
                "cache",
                "app",
                `ACK`,
                "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                0.6,
                () => {
                  addLog(`[App] Returning fast ACK to client`, "success");
                  sendPacket(
                    "app",
                    "client",
                    `ACK`,
                    "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                    0.6
                  );

                  // Asynchronous write to DB
                  setTimeout(() => {
                    addLog(`[Cache] Async flush ${key} to Database...`, "route");
                    sendPacket(
                      "cache",
                      "db",
                      `SET ${key}`,
                      "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
                      0.6,
                      () => {
                        setDbEntries((prev) => ({ ...prev, [key]: value }));
                        addLog(`[DB] Updated ${key} (Async)`, "success");
                      }
                    );
                  }, 1000);
                }
              );
            }
          );
        }
      }
    );
  };

  const clearCache = () => {
    setCacheEntries({});
    addLog(`[System] Cache manually flushed`, "warn");
  };

  // Node Positions for packet animation coordinates
  const clientPos = { x: 50, y: 140 };
  const appPos = { x: 200, y: 140 };
  const cachePos = { x: 380, y: 70 };
  const dbPos = { x: 380, y: 210 };

  const getPosition = (node: string) => {
    if (node === "client") return clientPos;
    if (node === "app") return appPos;
    if (node === "cache") return cachePos;
    return dbPos;
  };

  return (
    <>
      <Seo
        title="Caching Strategies Visualizer"
        description="Visualize and compare Cache-Aside, Write-Through, and Write-Behind caching strategies in distributed systems."
        path="/learning/system-design-concepts/caching"
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-16 bg-[#030712]/88 backdrop-blur-md" />

      <div className="min-h-screen bg-[#07111f] pb-24 pt-20 text-[#f1f3f7] font-sans selection:bg-cyan-500/30">
        {/* Decorative Grid / Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-cyan-500/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <Link
            to="/learning/system-design-concepts"
            className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 hover:text-cyan-400 transition-colors mb-6 inline-block"
          >
            ← System Design Concepts
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl font-display font-black tracking-tight text-white sm:text-4xl">
              Caching Strategies
            </h1>
            <p className="mt-2 text-slate-400 text-xs font-mono max-w-2xl leading-relaxed">
              Explore data flow patterns between Application, Cache, and Database. Compare
              read/write behaviors across different caching strategies.
            </p>
          </header>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left & Middle Column: Interactive Sandbox & Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Simulation Canvas Panel */}
              <div className="relative border border-white/[0.09] bg-[#0c1624] rounded-[22px] p-6 overflow-hidden shadow-2xl min-h-[360px]">
                {/* Background path labels */}
                <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Data Flow Canvas
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
                  {/* Client <-> App */}
                  <line x1={clientPos.x} y1={clientPos.y} x2={appPos.x} y2={appPos.y} />
                  {/* App <-> Cache */}
                  <line x1={appPos.x} y1={appPos.y} x2={cachePos.x} y2={cachePos.y} />
                  {/* App <-> DB */}
                  <line x1={appPos.x} y1={appPos.y} x2={dbPos.x} y2={dbPos.y} />
                  {/* Cache <-> DB (for Write-Through / Write-Behind) */}
                  <line
                    x1={cachePos.x}
                    y1={cachePos.y}
                    x2={dbPos.x}
                    y2={dbPos.y}
                    className="stroke-indigo-900/40"
                  />
                </svg>

                {/* Client Node */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    left: clientPos.x,
                    top: clientPos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/60 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">📱</span>
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-slate-400">Client</span>
                </div>

                {/* App Node */}
                <div
                  className="absolute flex flex-col items-center z-10"
                  style={{ left: appPos.x, top: appPos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-[#131b29] border border-cyan-500/40 p-3.5 flex flex-col justify-center items-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <span className="text-[14px] font-display font-bold text-white">APP</span>
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-slate-400">Application</span>
                </div>

                {/* Cache Node */}
                <div
                  className="absolute flex flex-col items-center z-10"
                  style={{ left: cachePos.x, top: cachePos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-32 rounded-xl bg-[#131b29] border border-yellow-500/40 p-3 shadow-[0_0_15px_rgba(234,179,8,0.1)] flex flex-col">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                      <span className="text-[10px] font-display font-bold text-yellow-400">
                        REDIS CACHE
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                    </div>
                    <div className="space-y-1 font-mono text-[8px] min-h-[40px]">
                      {Object.keys(cacheEntries).length === 0 ? (
                        <span className="text-slate-500 italic">Empty...</span>
                      ) : (
                        Object.entries(cacheEntries).map(([k, v]) => (
                          <div key={k} className="flex justify-between bg-black/20 p-1 rounded">
                            <span className="text-yellow-200">{k}</span>
                            <span className="text-slate-400 truncate ml-2 max-w-[60px]">{v}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* DB Node */}
                <div
                  className="absolute flex flex-col items-center z-10"
                  style={{ left: dbPos.x, top: dbPos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-32 rounded-xl bg-[#131b29] border border-indigo-500/40 p-3 shadow-[0_0_15px_rgba(99,102,241,0.1)] flex flex-col">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                      <span className="text-[10px] font-display font-bold text-indigo-400">
                        POSTGRES DB
                      </span>
                      <span className="text-[8px]">💽</span>
                    </div>
                    <div className="space-y-1 font-mono text-[8px] min-h-[40px]">
                      {Object.entries(dbEntries).map(([k, v]) => (
                        <div key={k} className="flex justify-between bg-black/20 p-1 rounded">
                          <span className="text-indigo-200">{k}</span>
                          <span className="text-slate-400 truncate ml-2 max-w-[60px]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Panel */}
              <div className="border border-white/[0.09] bg-[#0c1624]/60 rounded-[22px] p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">
                    Strategy Configuration
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-indigo-400">
                      {strategy.replace("-", " ")}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strategy Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      1. Caching Strategy
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: "cache-aside", label: "Cache Aside (Lazy Loading)" },
                        { id: "write-through", label: "Write Through" },
                        { id: "write-behind", label: "Write Behind (Write Back)" },
                      ].map((alg) => (
                        <button
                          key={alg.id}
                          onClick={() => setStrategy(alg.id as any)}
                          className={`text-[10px] font-mono py-2 rounded-lg border font-bold transition-all text-left px-3 ${
                            strategy === alg.id
                              ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
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
                      2. Simulator Actions
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={simulateRead}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-lg py-2 transition font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      >
                        Simulate Read
                      </button>
                      <button
                        onClick={simulateWrite}
                        className="bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold text-[11px] rounded-lg py-2 transition font-mono shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                      >
                        Simulate Write
                      </button>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={clearCache}
                        className="w-full font-bold text-[10px] rounded-lg py-2 transition font-mono border bg-slate-900 border-red-500/20 text-red-400 hover:border-red-500/50"
                      >
                        Clear Cache (Eviction)
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
                                  ? "text-indigo-400"
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
                <h3 className="font-display font-bold text-white text-sm">Strategy Mechanics</h3>

                <div className="space-y-3.5">
                  {strategy === "cache-aside" && (
                    <div>
                      <span className="text-[9px] font-mono uppercase text-indigo-400 block mb-1">
                        Cache Aside
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Application checks cache first. If missed, it fetches from DB and stores in
                        cache. Writes go directly to DB, and cache is invalidated to ensure
                        consistency. Best for read-heavy workloads.
                      </p>
                    </div>
                  )}
                  {strategy === "write-through" && (
                    <div>
                      <span className="text-[9px] font-mono uppercase text-indigo-400 block mb-1">
                        Write Through
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Application writes to cache, which then synchronously writes to the DB.
                        Guarantees consistency and fast reads, but introduces latency on writes
                        since both stores must acknowledge.
                      </p>
                    </div>
                  )}
                  {strategy === "write-behind" && (
                    <div>
                      <span className="text-[9px] font-mono uppercase text-indigo-400 block mb-1">
                        Write Behind
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Application writes to cache and returns immediately. Cache asynchronously
                        syncs with the DB. Extremely fast writes, but risks data loss if the cache
                        crashes before syncing.
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
