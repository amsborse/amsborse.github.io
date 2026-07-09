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
  from: string;
  to: string;
  label: string;
  color: string;
  duration: number;
}

export default function ContentDeliveryNetworkPage() {
  const [activePackets, setActivePackets] = useState<Packet[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const requestCounter = useRef(0);

  // Cache state for each edge node
  const [edgeCache, setEdgeCache] = useState<Record<string, boolean>>({
    ny: false,
    lon: false,
    tok: false,
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
    addLog("CDN Edge Network initialized.", "success");
    addLog(`Origin Server (US Central) online and shielding.`, "route");
  }, []);

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

  const simulateFetch = (regionId: "ny" | "lon" | "tok", regionName: string) => {
    requestCounter.current++;
    const reqId = requestCounter.current;
    const clientNode = `client-${regionId}`;
    const edgeNode = `edge-${regionId}`;

    addLog(`[Client ${regionName}] Requesting asset (logo.png)...`, "info");

    // Client -> Edge
    sendPacket(
      clientNode,
      edgeNode,
      `GET /logo.png`,
      "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
      0.5,
      () => {
        const isCached = edgeCache[regionId];

        if (isCached) {
          addLog(`[Edge ${regionName}] CACHE HIT! Serving directly (Latency: 12ms)`, "success");
          // Edge -> Client
          sendPacket(
            edgeNode,
            clientNode,
            `200 OK (Cached)`,
            "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
            0.5
          );
        } else {
          addLog(`[Edge ${regionName}] CACHE MISS. Requesting from Origin Server...`, "warn");

          // Edge -> Origin (Longer duration based on region)
          const originDuration = regionId === "tok" ? 1.5 : regionId === "lon" ? 1.0 : 0.6;
          sendPacket(
            edgeNode,
            "origin",
            `GET /logo.png`,
            "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30",
            originDuration,
            () => {
              addLog(`[Origin] Serving asset to Edge ${regionName}`, "route");
              // Origin -> Edge
              sendPacket(
                "origin",
                edgeNode,
                `200 OK`,
                "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                originDuration,
                () => {
                  // Store in Edge Cache
                  setEdgeCache((prev) => ({ ...prev, [regionId]: true }));
                  addLog(
                    `[Edge ${regionName}] Asset cached locally. Serving to client (Latency: ${(originDuration * 2000).toFixed(0)}ms)`,
                    "success"
                  );

                  // Edge -> Client
                  sendPacket(
                    edgeNode,
                    clientNode,
                    `200 OK`,
                    "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                    0.5
                  );
                }
              );
            }
          );
        }
      }
    );
  };

  const purgeCache = () => {
    setEdgeCache({ ny: false, lon: false, tok: false });
    addLog(`[CDN Control] PURGE request received. All edge caches invalidated.`, "error");

    // Simulate propagation delay visual
    sendPacket(
      "origin",
      "edge-ny",
      "PURGE",
      "text-red-400 bg-red-950/80 border border-red-500/30",
      0.6
    );
    sendPacket(
      "origin",
      "edge-lon",
      "PURGE",
      "text-red-400 bg-red-950/80 border border-red-500/30",
      1.0
    );
    sendPacket(
      "origin",
      "edge-tok",
      "PURGE",
      "text-red-400 bg-red-950/80 border border-red-500/30",
      1.5
    );
  };

  // Node Positions for packet animation coordinates
  const originPos = { x: 260, y: 50 }; // Top Center

  const edgeNyPos = { x: 100, y: 150 };
  const edgeLonPos = { x: 260, y: 150 };
  const edgeTokPos = { x: 420, y: 150 };

  const clientNyPos = { x: 100, y: 250 };
  const clientLonPos = { x: 260, y: 250 };
  const clientTokPos = { x: 420, y: 250 };

  const getPosition = (node: string) => {
    if (node === "origin") return originPos;
    if (node === "edge-ny") return edgeNyPos;
    if (node === "edge-lon") return edgeLonPos;
    if (node === "edge-tok") return edgeTokPos;
    if (node === "client-ny") return clientNyPos;
    if (node === "client-lon") return clientLonPos;
    return clientTokPos;
  };

  return (
    <>
      <Seo
        title="CDN Visualizer"
        description="Visualize Content Delivery Networks, Edge caching, and Origin shielding."
        path="/learning/system-design-concepts/cdn"
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-16 bg-[#030712]/88 backdrop-blur-md" />

      <div className="min-h-screen bg-[#07111f] pb-24 pt-20 text-[#f1f3f7] font-sans selection:bg-emerald-500/30">
        {/* Decorative Grid / Glow */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
          <Link
            to="/learning/system-design-concepts"
            className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 hover:text-emerald-400 transition-colors mb-6 inline-block"
          >
            ← System Design Concepts
          </Link>

          <header className="mb-10">
            <h1 className="text-3xl font-display font-black tracking-tight text-white sm:text-4xl">
              Content Delivery Network
            </h1>
            <p className="mt-2 text-slate-400 text-xs font-mono max-w-2xl leading-relaxed">
              Explore how global Edge servers cache static assets close to users, dramatically
              reducing latency and offloading traffic from the Origin server.
            </p>
          </header>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left & Middle Column: Interactive Sandbox & Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Simulation Canvas Panel */}
              <div className="relative border border-white/[0.09] bg-[#0c1624] rounded-[22px] p-6 overflow-hidden shadow-2xl min-h-[380px]">
                {/* Background path labels */}
                <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Global Network Canvas
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
                          transition={{ duration: packet.duration, ease: "linear" }}
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
                  {/* Origin to Edges */}
                  <line x1={originPos.x} y1={originPos.y} x2={edgeNyPos.x} y2={edgeNyPos.y} />
                  <line x1={originPos.x} y1={originPos.y} x2={edgeLonPos.x} y2={edgeLonPos.y} />
                  <line x1={originPos.x} y1={originPos.y} x2={edgeTokPos.x} y2={edgeTokPos.y} />

                  {/* Edges to Clients */}
                  <line x1={edgeNyPos.x} y1={edgeNyPos.y} x2={clientNyPos.x} y2={clientNyPos.y} />
                  <line
                    x1={edgeLonPos.x}
                    y1={edgeLonPos.y}
                    x2={clientLonPos.x}
                    y2={clientLonPos.y}
                  />
                  <line
                    x1={edgeTokPos.x}
                    y1={edgeTokPos.y}
                    x2={clientTokPos.x}
                    y2={clientTokPos.y}
                  />
                </svg>

                {/* Origin Node */}
                <div
                  className="absolute flex flex-col items-center z-10"
                  style={{
                    left: originPos.x,
                    top: originPos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="w-24 h-16 rounded-2xl bg-[#131b29] border border-cyan-500/40 p-2 flex flex-col justify-center items-center shadow-[0_0_20px_rgba(6,182,212,0.15)] relative">
                    <span className="text-[10px] font-display font-bold text-white z-10">
                      ORIGIN SERVER
                    </span>
                    <span className="text-[8px] font-mono text-cyan-400 mt-0.5 z-10">
                      US-Central
                    </span>
                  </div>
                </div>

                {/* Edge Nodes */}
                {(
                  [
                    { id: "ny", pos: edgeNyPos, name: "NY Edge", region: "US East" },
                    { id: "lon", pos: edgeLonPos, name: "LON Edge", region: "Europe" },
                    { id: "tok", pos: edgeTokPos, name: "TOK Edge", region: "Asia" },
                  ] as const
                ).map((edge) => (
                  <div
                    key={edge.id}
                    className="absolute flex flex-col items-center z-10"
                    style={{
                      left: edge.pos.x,
                      top: edge.pos.y,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className={`w-20 h-14 rounded-xl bg-[#131b29] border flex flex-col items-center justify-center relative ${
                        edgeCache[edge.id]
                          ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "border-slate-700/50"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-bold ${edgeCache[edge.id] ? "text-emerald-400" : "text-slate-400"}`}
                      >
                        {edge.name}
                      </span>
                      {edgeCache[edge.id] && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0c1624]" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Client Nodes */}
                {(
                  [
                    { id: "ny", pos: clientNyPos, name: "New York Client", icon: "🗽" },
                    { id: "lon", pos: clientLonPos, name: "London Client", icon: "🎡" },
                    { id: "tok", pos: clientTokPos, name: "Tokyo Client", icon: "🗼" },
                  ] as const
                ).map((client) => (
                  <div
                    key={client.id}
                    className="absolute flex flex-col items-center z-10"
                    style={{
                      left: client.pos.x,
                      top: client.pos.y,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700/60 flex items-center justify-center text-xl shadow-lg relative overflow-hidden">
                      {client.icon}
                    </div>
                    <span className="mt-2 text-[8px] font-mono text-slate-400">{client.name}</span>
                  </div>
                ))}
              </div>

              {/* Control Panel */}
              <div className="border border-white/[0.09] bg-[#0c1624]/60 rounded-[22px] p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">
                    Traffic Simulation
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-emerald-400">
                      EDGE NETWORK ACTIVE
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Actions */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      1. Fetch Asset (Client Requests)
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => simulateFetch("ny", "New York")}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-200 font-bold text-[11px] rounded-lg py-2 transition font-mono"
                      >
                        Fetch from NY (US East)
                      </button>
                      <button
                        onClick={() => simulateFetch("lon", "London")}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-200 font-bold text-[11px] rounded-lg py-2 transition font-mono"
                      >
                        Fetch from LON (Europe)
                      </button>
                      <button
                        onClick={() => simulateFetch("tok", "Tokyo")}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-600/50 text-slate-200 font-bold text-[11px] rounded-lg py-2 transition font-mono"
                      >
                        Fetch from TOK (Asia)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      2. Cache Management
                    </label>
                    <div className="pt-1 flex flex-col gap-2">
                      <button
                        onClick={purgeCache}
                        className="w-full font-bold text-[11px] rounded-lg py-3 transition font-mono border bg-slate-900 border-red-500/20 text-red-400 hover:border-red-500/50 hover:bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                      >
                        Purge Edge Caches
                      </button>
                      <p className="text-[9px] font-mono text-slate-500 mt-2 leading-relaxed">
                        Purging invalidates the cached assets globally. Subsequent client requests
                        will require a full network hop back to the Origin Server to fetch fresh
                        data.
                      </p>
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
                    Access Log
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
                                  ? "text-cyan-400"
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
                <h3 className="font-display font-bold text-white text-sm">CDN Concepts</h3>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-emerald-400 block mb-1">
                      Latency Reduction
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Physical distance is the hardest limit in networking. By pushing static assets
                      (images, JS, CSS) to Edge servers worldwide, clients fetch data from a server
                      physically close to them, bypassing long transatlantic fibre hops.
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-emerald-400 block mb-1">
                      Origin Shielding
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      CDNs absorb massive amounts of traffic (and even DDoS attacks), ensuring the
                      vulnerable Origin Server only receives requests for dynamic data or initial
                      cache misses.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
