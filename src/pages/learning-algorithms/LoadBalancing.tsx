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
  from: "client" | "lb" | "A" | "B" | "C";
  to: "client" | "lb" | "A" | "B" | "C";
  label: string;
  color: string;
  duration: number;
}

interface ServerState {
  id: "A" | "B" | "C";
  name: string;
  online: boolean;
  activeConnections: number;
  cpu: number;
  requestsProcessed: number;
}

export default function LoadBalancingPage() {
  const [algorithm, setAlgorithm] = useState<"round-robin" | "least-conn" | "hash">("round-robin");
  const [trafficRate, setTrafficRate] = useState(1); // auto requests per second
  const [isAutoTraffic, setIsAutoTraffic] = useState(false);

  // Servers
  const [servers, setServers] = useState<ServerState[]>([
    {
      id: "A",
      name: "Server A",
      online: true,
      activeConnections: 0,
      cpu: 10,
      requestsProcessed: 0,
    },
    {
      id: "B",
      name: "Server B",
      online: true,
      activeConnections: 0,
      cpu: 15,
      requestsProcessed: 0,
    },
    { id: "C", name: "Server C", online: true, activeConnections: 0, cpu: 8, requestsProcessed: 0 },
  ]);

  const [activePackets, setActivePackets] = useState<Packet[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const nextRrIndex = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const requestCounter = useRef(0);

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
    addLog("Load Balancer cluster operational.", "success");
    addLog(`Routing algorithm initialized: ${algorithm.toUpperCase()}`, "route");
  }, [algorithm]);

  // Auto Traffic generator loop
  useEffect(() => {
    if (!isAutoTraffic) return;

    const interval = setInterval(() => {
      triggerRequest();
    }, 1000 / trafficRate);

    return () => clearInterval(interval);
  }, [isAutoTraffic, trafficRate, servers, algorithm]);

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

  // Main routing action
  const triggerRequest = () => {
    requestCounter.current++;
    const reqId = requestCounter.current;
    const clientIP = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;

    addLog(`[Client] Incoming request #${reqId} from ${clientIP}`, "info");

    // Client -> LB
    sendPacket(
      "client",
      "lb",
      `REQ(#${reqId})`,
      "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
      0.6,
      () => {
        // Find active/online servers
        const onlineServers = servers.filter((s) => s.online);
        if (onlineServers.length === 0) {
          addLog(`[LB] Request #${reqId} dropped: NO ONLINE SERVERS!`, "error");
          sendPacket(
            "lb",
            "client",
            "503 GATEWAY TIMEOUT",
            "text-red-400 bg-red-950/80 border border-red-500/30",
            0.6
          );
          return;
        }

        let targetServer: ServerState;

        if (algorithm === "round-robin") {
          // Find next server in RR order that is online
          let selectedIdx = -1;
          for (let i = 0; i < servers.length; i++) {
            const checkIdx = (nextRrIndex.current + i) % servers.length;
            if (servers[checkIdx].online) {
              selectedIdx = checkIdx;
              nextRrIndex.current = (checkIdx + 1) % servers.length;
              break;
            }
          }
          targetServer = servers[selectedIdx];
          addLog(`[LB] [Round-Robin] Routing req #${reqId} to ${targetServer.name}`, "route");
        } else if (algorithm === "least-conn") {
          // Choose server with minimum active connections
          targetServer = onlineServers.reduce((prev, curr) =>
            curr.activeConnections < prev.activeConnections ? curr : prev
          );
          addLog(
            `[LB] [Least-Conn] Routing req #${reqId} to ${targetServer.name} (Active: ${targetServer.activeConnections})`,
            "route"
          );
        } else {
          // Consistent Hashing based on Client IP hash
          let hash = 0;
          for (let i = 0; i < clientIP.length; i++) {
            hash = clientIP.charCodeAt(i) + ((hash << 5) - hash);
          }
          const serverIndex = Math.abs(hash) % onlineServers.length;
          targetServer = onlineServers[serverIndex];
          addLog(`[LB] [Hash] IP ${clientIP} maps to ${targetServer.name}`, "route");
        }

        // Increment target server connection count & CPU load
        setServers((prev) =>
          prev.map((s) =>
            s.id === targetServer.id
              ? {
                  ...s,
                  activeConnections: s.activeConnections + 1,
                  cpu: Math.min(95, s.cpu + 15),
                }
              : s
          )
        );

        // LB -> Server
        sendPacket(
          "lb",
          targetServer.id,
          `REQ(#${reqId})`,
          "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
          0.6,
          () => {
            addLog(`[${targetServer.name}] Processing request #${reqId}...`, "info");

            // Simulating Server process delay
            setTimeout(() => {
              setServers((prev) =>
                prev.map((s) =>
                  s.id === targetServer.id
                    ? {
                        ...s,
                        activeConnections: Math.max(0, s.activeConnections - 1),
                        cpu: Math.max(5, s.cpu - 15),
                        requestsProcessed: s.requestsProcessed + 1,
                      }
                    : s
                )
              );

              addLog(`[${targetServer.name}] Request #${reqId} processed successfully.`, "success");

              // Server -> LB
              sendPacket(
                targetServer.id,
                "lb",
                "200 OK",
                "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                0.6,
                () => {
                  // LB -> Client
                  sendPacket(
                    "lb",
                    "client",
                    "200 OK",
                    "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                    0.6
                  );
                }
              );
            }, 1200);
          }
        );
      }
    );
  };

  const toggleServer = (id: "A" | "B" | "C") => {
    setServers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextState = !s.online;
          addLog(
            `[System] ${s.name} is now ${nextState ? "ONLINE" : "OFFLINE"}`,
            nextState ? "success" : "error"
          );
          return {
            ...s,
            online: nextState,
            activeConnections: 0,
            cpu: nextState ? 10 : 0,
          };
        }
        return s;
      })
    );
  };

  // Node Positions for packet animation coordinates
  const clientPos = { x: 50, y: 150 };
  const lbPos = { x: 260, y: 150 };
  const nodeAPos = { x: 480, y: 60 };
  const nodeBPos = { x: 480, y: 150 };
  const nodeCPos = { x: 480, y: 240 };

  const getPosition = (node: string) => {
    if (node === "client") return clientPos;
    if (node === "lb") return lbPos;
    if (node === "A") return nodeAPos;
    if (node === "B") return nodeBPos;
    return nodeCPos;
  };

  return (
    <>
      <Seo
        title="Load Balancing Visualizer"
        description="Visualize and compare Round Robin, Least Connections, and Hashing load balancing algorithms under peak traffic loads."
        path="/learning/system-design-concepts/load-balancing"
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
              Load Balancing Visualizer
            </h1>
            <p className="mt-2 text-slate-400 text-xs font-mono max-w-2xl leading-relaxed">
              Explore dynamic traffic routing patterns across target server blocks. Switch
              algorithms, toggle node health states, and trigger query traffic streams.
            </p>
          </header>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left & Middle Column: Interactive Sandbox & Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Simulation Canvas Panel */}
              <div className="relative border border-white/[0.09] bg-[#0c1624] rounded-[22px] p-6 overflow-hidden shadow-2xl min-h-[380px]">
                {/* Background path labels */}
                <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Load Distribution Canvas
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
                  {/* Client <-> LB */}
                  <line x1={clientPos.x} y1={clientPos.y} x2={lbPos.x} y2={lbPos.y} />
                  {/* LB <-> Server A */}
                  <line x1={lbPos.x} y1={lbPos.y} x2={nodeAPos.x} y2={nodeAPos.y} />
                  {/* LB <-> Server B */}
                  <line x1={lbPos.x} y1={lbPos.y} x2={nodeBPos.x} y2={nodeBPos.y} />
                  {/* LB <-> Server C */}
                  <line x1={lbPos.x} y1={lbPos.y} x2={nodeCPos.x} y2={nodeCPos.y} />
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
                    <span className="text-2xl">💻</span>
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-slate-400">Clients</span>
                </div>

                {/* Load Balancer Core */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: lbPos.x, top: lbPos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-[#131b29] border border-cyan-500/40 p-3.5 flex flex-col justify-between items-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <span className="text-xs font-mono text-cyan-400 font-bold">LB</span>
                    <span className="text-[14px] font-display font-bold text-white">CORE</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-slate-400">Load Balancer</span>
                </div>

                {/* Target Servers */}
                {servers.map((srv) => {
                  const pos = getPosition(srv.id);
                  return (
                    <div
                      key={srv.id}
                      className="absolute flex flex-col items-center"
                      style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
                    >
                      <div
                        className={`w-28 h-20 rounded-xl bg-[#131b29] border p-2 flex flex-col justify-between transition-all duration-300 ${
                          !srv.online
                            ? "opacity-40 border-red-500/30"
                            : srv.activeConnections > 0
                              ? "border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.1)]"
                              : "border-white/5"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-mono text-slate-400">{srv.name}</span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${srv.online ? "bg-emerald-500" : "bg-red-500"}`}
                          />
                        </div>

                        {/* Telemetry metrics */}
                        {srv.online ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-mono">
                              <span className="text-slate-500">Conn: {srv.activeConnections}</span>
                              <span className="text-slate-400">CPU: {srv.cpu}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-cyan-500"
                                animate={{ width: `${srv.cpu}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center font-mono text-[9px] text-red-500">
                            OFFLINE
                          </div>
                        )}

                        <div className="flex justify-between text-[7px] font-mono text-slate-500">
                          <span>Processed: {srv.requestsProcessed}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Control Panel / Controls Deck */}
              <div className="border border-white/[0.09] bg-[#0c1624]/60 rounded-[22px] p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">
                    Cluster Control Deck
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] font-mono text-cyan-400">Active Node Pool</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Operations Module */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      1. Traffic Generation
                    </label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={triggerRequest}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg py-1.5 transition font-mono"
                      >
                        Single Query
                      </button>
                      <button
                        onClick={() => setIsAutoTraffic((prev) => !prev)}
                        className={`font-bold text-xs rounded-lg py-1.5 transition font-mono border ${
                          isAutoTraffic
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                            : "bg-slate-900 border-white/5 text-slate-300"
                        }`}
                      >
                        {isAutoTraffic ? "Stop Stream" : "Start Auto Stream"}
                      </button>
                    </div>
                  </div>

                  {/* Server Nodes Health Module */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      2. Node Health (Toggle)
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {servers.map((srv) => (
                        <button
                          key={srv.id}
                          onClick={() => toggleServer(srv.id)}
                          className={`text-[10px] font-mono font-bold rounded-lg py-2 transition border ${
                            srv.online
                              ? "bg-slate-900 border-emerald-500/20 text-emerald-400 hover:border-red-500/30"
                              : "bg-red-950/20 border-red-500/30 text-red-500 hover:border-emerald-500/30"
                          }`}
                        >
                          Server {srv.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Traffic Rate Slider */}
                  <div className="space-y-2 sm:col-span-2 md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      3. Query Rate ({trafficRate} / sec)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={trafficRate}
                      onChange={(e) => setTrafficRate(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>

                {/* Configuration Toggles */}
                <div className="pt-4 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
                    4. Routing Algorithm
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "round-robin", label: "Round Robin" },
                      { id: "least-conn", label: "Least Connections" },
                      { id: "hash", label: "Consistent Hash" },
                    ].map((alg) => (
                      <button
                        key={alg.id}
                        onClick={() => setAlgorithm(alg.id as any)}
                        className={`text-[10px] font-mono py-2 rounded-lg border font-bold transition-all ${
                          algorithm === alg.id
                            ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                            : "bg-slate-900 border-white/5 text-slate-400"
                        }`}
                      >
                        {alg.label}
                      </button>
                    ))}
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
                    Transaction log terminal
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
                <h3 className="font-display font-bold text-white text-sm">Algorithm Mechanics</h3>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-500 block">
                      Round Robin
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Distributes requests sequentially down the active server list. Ideal when
                      servers have identical specifications.
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-500 block">
                      Least Connections
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Evaluates active servers and routes query loads to whichever node has the
                      fewest connections, preventing single-node query hotspots.
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
