import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Seo } from "@/components/Seo";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warn" | "error" | "network";
  text: string;
}

interface Packet {
  id: string;
  from: "client" | "A" | "B" | "C";
  to: "client" | "A" | "B" | "C";
  label: string;
  color: string;
  duration: number;
  onComplete?: () => void;
}

export default function ConsistencyModelsPage() {
  // Config States
  const [consistencyMode, setConsistencyMode] = useState<"strong" | "eventual">("eventual");
  const [hasPartition, setHasPartition] = useState(false);
  const [replicationDelay, setReplicationDelay] = useState(2.5); // seconds

  // Node States (A = Leader, B & C = Followers)
  const [nodeAValue, setNodeAValue] = useState("0");
  const [nodeBValue, setNodeBValue] = useState("0");
  const [nodeCValue, setNodeCValue] = useState("0");

  const [nodeAStatus, setNodeAStatus] = useState<"idle" | "writing" | "replicating" | "error">(
    "idle"
  );
  const [nodeBStatus, setNodeBStatus] = useState<"idle" | "syncing" | "stale">("idle");
  const [nodeCStatus, setNodeCStatus] = useState<"idle" | "syncing" | "stale">("idle");

  // Interaction States
  const [writeValue, setWriteValue] = useState("5");
  const [activePackets, setActivePackets] = useState<Packet[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPendingWrite, setIsPendingWrite] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper to add logs
  const addLog = (text: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [...prev, { id: Math.random().toString(), timestamp: time, type, text }]);
  };

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Initial logs
  useEffect(() => {
    setLogs([]);
    addLog("System initialized. Multi-replica cluster connected.", "success");
    addLog("Leader node: A. Follower nodes: B, C.", "info");
    addLog(
      `Current Mode: ${consistencyMode === "strong" ? "Strong Consistency (CP / Linearizability)" : "Eventual Consistency (AP)"}`,
      "network"
    );
  }, [consistencyMode]);

  // Trigger Packet animation
  const sendPacket = (
    from: Packet["from"],
    to: Packet["to"],
    label: string,
    color: string,
    duration: number,
    onComplete?: () => void
  ) => {
    const id = Math.random().toString();
    setActivePackets((prev) => [...prev, { id, from, to, label, color, duration, onComplete }]);

    setTimeout(() => {
      setActivePackets((prev) => prev.filter((p) => p.id !== id));
      if (onComplete) onComplete();
    }, duration * 1000);
  };

  const handleWrite = () => {
    if (isPendingWrite) return;
    setIsPendingWrite(true);
    addLog(`[Client] Initiating write transaction: Set value = ${writeValue}`, "info");
    setNodeAStatus("writing");

    // Phase 1: Client -> Node A
    sendPacket(
      "client",
      "A",
      `WRITE(${writeValue})`,
      "text-cyan-400 bg-cyan-950/80 border border-cyan-500/30",
      0.8,
      () => {
        if (hasPartition) {
          // Node A is isolated from B and C
          if (consistencyMode === "strong") {
            addLog(
              "[Node A] Strong Consistency requires replication consensus, but followers are unreachable!",
              "error"
            );
            setNodeAStatus("error");
            sendPacket(
              "A",
              "client",
              "ERROR(503)",
              "text-red-400 bg-red-950/80 border border-red-500/30",
              0.8,
              () => {
                setIsPendingWrite(false);
                setNodeAStatus("idle");
                addLog(
                  "[Client] Write Transaction FAILED due to network partition (CP Choice).",
                  "error"
                );
              }
            );
          } else {
            // Eventual Consistency: Leader accepts immediately, updates own store
            setNodeAValue(writeValue);
            addLog(`[Node A] Local write completed: Value = ${writeValue}`, "success");
            setNodeAStatus("idle");
            setNodeBStatus("stale");
            setNodeCStatus("stale");
            sendPacket(
              "A",
              "client",
              "ACK",
              "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
              0.8,
              () => {
                setIsPendingWrite(false);
                addLog(
                  "[Client] Write Transaction ACKNOWLEDGED instantly. Replicas are currently stale.",
                  "warn"
                );
              }
            );
          }
        } else {
          // Healthy state replication flow
          if (consistencyMode === "strong") {
            // CP Flow: Node A replicates to B & C, waits for BOTH, then updates value & acknowledges client
            setNodeAStatus("replicating");
            addLog("[Node A] Broadcasting write proposal to followers (B, C)...", "network");

            let acksReceived = 0;
            const collectAck = (follower: "B" | "C") => {
              acksReceived++;
              addLog(`[Node A] Received replication ACK from Node ${follower}`, "success");
              if (acksReceived === 2) {
                setNodeAValue(writeValue);
                setNodeBValue(writeValue);
                setNodeCValue(writeValue);
                setNodeAStatus("idle");
                setNodeBStatus("idle");
                setNodeCStatus("idle");
                addLog(
                  `[Node A] Consensus reached. All nodes updated to Value = ${writeValue}`,
                  "success"
                );
                sendPacket(
                  "A",
                  "client",
                  "ACK",
                  "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
                  0.8,
                  () => {
                    setIsPendingWrite(false);
                    addLog(
                      "[Client] Write Transaction complete. Linearizability achieved.",
                      "success"
                    );
                  }
                );
              }
            };

            setNodeBStatus("syncing");
            setNodeCStatus("syncing");

            sendPacket(
              "A",
              "B",
              `SYNC(${writeValue})`,
              "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
              replicationDelay,
              () => {
                sendPacket(
                  "B",
                  "A",
                  "ACK",
                  "text-slate-400 bg-slate-900 border border-white/5",
                  0.8,
                  () => collectAck("B")
                );
              }
            );

            sendPacket(
              "A",
              "C",
              `SYNC(${writeValue})`,
              "text-purple-400 bg-purple-950/80 border border-purple-500/30",
              replicationDelay,
              () => {
                sendPacket(
                  "C",
                  "A",
                  "ACK",
                  "text-slate-400 bg-slate-900 border border-white/5",
                  0.8,
                  () => collectAck("C")
                );
              }
            );
          } else {
            // AP Flow: Node A updates immediately and responds to client, replication happens asynchronously
            setNodeAValue(writeValue);
            addLog(`[Node A] Local write completed: Value = ${writeValue}`, "success");
            setNodeAStatus("idle");
            setNodeBStatus("stale");
            setNodeCStatus("stale");

            // Instant Client Ack
            sendPacket(
              "A",
              "client",
              "ACK",
              "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
              0.8,
              () => {
                setIsPendingWrite(false);
                addLog(
                  "[Client] Write Transaction ACKNOWLEDGED. Background replication running.",
                  "info"
                );
              }
            );

            // Asynchronous updates
            setTimeout(() => {
              addLog("[Node A] Spawning async replication to Followers...", "network");
              setNodeBStatus("syncing");
              setNodeCStatus("syncing");

              sendPacket(
                "A",
                "B",
                `ASYNC_SYNC(${writeValue})`,
                "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
                replicationDelay,
                () => {
                  setNodeBValue(writeValue);
                  setNodeBStatus("idle");
                  addLog(`[Node B] Asynchronously synced: Value = ${writeValue}`, "success");
                }
              );

              sendPacket(
                "A",
                "C",
                `ASYNC_SYNC(${writeValue})`,
                "text-purple-400 bg-purple-950/80 border border-purple-500/30",
                replicationDelay,
                () => {
                  setNodeCValue(writeValue);
                  setNodeCStatus("idle");
                  addLog(`[Node C] Asynchronously synced: Value = ${writeValue}`, "success");
                }
              );
            }, 800);
          }
        }
      }
    );
  };

  const handleRead = (node: "A" | "B" | "C") => {
    addLog(`[Client] Initiating READ from Node ${node}`, "info");

    const getVal = () => {
      if (node === "A") return nodeAValue;
      if (node === "B") return nodeBValue;
      return nodeCValue;
    };

    const targetVal = getVal();

    // Check if partitioned follower
    const isPartitionedFollower = hasPartition && (node === "B" || node === "C");

    sendPacket(
      "client",
      node,
      "READ",
      "text-amber-400 bg-amber-950/80 border border-amber-500/30",
      0.8,
      () => {
        if (isPartitionedFollower && consistencyMode === "strong") {
          addLog(
            `[Node ${node}] Isolated from leader A. Refusing read to prevent stale delivery.`,
            "error"
          );
          sendPacket(
            node,
            "client",
            "ERROR(500)",
            "text-red-400 bg-red-950/80 border border-red-500/30",
            0.8,
            () => {
              addLog(
                `[Client] READ from Node ${node} FAILED. Node is unavailable/isolated under CP.`,
                "error"
              );
            }
          );
        } else {
          const isStale =
            (node === "B" && nodeBValue !== nodeAValue) ||
            (node === "C" && nodeCValue !== nodeAValue);

          if (isStale) {
            addLog(`[Node ${node}] Responding with current cached state (STALE).`, "warn");
          } else {
            addLog(`[Node ${node}] Responding with current cached state (LATEST).`, "success");
          }

          sendPacket(
            node,
            "client",
            `VAL(${targetVal})`,
            isStale
              ? "text-yellow-400 bg-yellow-950/80 border border-yellow-500/30"
              : "text-emerald-400 bg-emerald-950/80 border border-emerald-500/30",
            0.8,
            () => {
              if (isStale) {
                addLog(
                  `[Client] READ Success. Received value: ${targetVal} (WARNING: Stale read!).`,
                  "warn"
                );
              } else {
                addLog(`[Client] READ Success. Received value: ${targetVal}.`, "success");
              }
            }
          );
        }
      }
    );
  };

  const triggerHeal = () => {
    setHasPartition(false);
    addLog(
      "[Network] Healing network partition. Connecting followers back to leader A.",
      "success"
    );

    // Auto-sync followers if stale
    if (nodeBValue !== nodeAValue || nodeCValue !== nodeAValue) {
      addLog("[Leader A] Syncing stale replicas after recovery.", "network");
      setNodeBStatus("syncing");
      setNodeCStatus("syncing");

      sendPacket(
        "A",
        "B",
        `SYNC(${nodeAValue})`,
        "text-indigo-400 bg-indigo-950/80 border border-indigo-500/30",
        replicationDelay,
        () => {
          setNodeBValue(nodeAValue);
          setNodeBStatus("idle");
          addLog(`[Node B] Re-synced after partition heal: Value = ${nodeAValue}`, "success");
        }
      );

      sendPacket(
        "A",
        "C",
        `SYNC(${nodeAValue})`,
        "text-purple-400 bg-purple-950/80 border border-purple-500/30",
        replicationDelay,
        () => {
          setNodeCValue(nodeAValue);
          setNodeCStatus("idle");
          addLog(`[Node C] Re-synced after partition heal: Value = ${nodeAValue}`, "success");
        }
      );
    }
  };

  const togglePartition = () => {
    if (hasPartition) {
      triggerHeal();
    } else {
      setHasPartition(true);
      addLog(
        "[Network] CRITICAL: Network partition triggered! Leader Node A isolated from Followers B & C.",
        "error"
      );
    }
  };

  // Node Positions for packet animation coordinates
  const clientPos = { x: 50, y: 150 };
  const nodeAPos = { x: 260, y: 150 };
  const nodeBPos = { x: 480, y: 70 };
  const nodeCPos = { x: 480, y: 230 };

  const getPosition = (node: string) => {
    if (node === "client") return clientPos;
    if (node === "A") return nodeAPos;
    if (node === "B") return nodeBPos;
    return nodeCPos;
  };

  return (
    <>
      <Seo
        title="Consistency Models Visualizer"
        description="Explore the behavior of Strong vs Eventual consistency across multi-replica databases under latency and partitions."
        path="/learning/system-design-concepts/consistency"
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
              Consistency Models Visualizer
            </h1>
            <p className="mt-2 text-slate-400 text-xs font-mono max-w-2xl leading-relaxed">
              Interactively observe the tradeoffs between Strong (Linearizable) and Eventual
              consistency. Simulate read/write transactions, adjust latency, and trigger network
              partition splits.
            </p>
          </header>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {/* Left & Middle Column: Interactive Sandbox & Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Simulation Canvas Panel */}
              <div className="relative border border-white/[0.09] bg-[#0c1624] rounded-[22px] p-6 overflow-hidden shadow-2xl min-h-[400px]">
                {/* Background path labels */}
                <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Transaction Stream Layer
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
                  {/* Client <-> Leader A */}
                  <line x1={clientPos.x} y1={clientPos.y} x2={nodeAPos.x} y2={nodeAPos.y} />
                  {/* Leader A <-> Follower B */}
                  <line x1={nodeAPos.x} y1={nodeAPos.y} x2={nodeBPos.x} y2={nodeBPos.y} />
                  {/* Leader A <-> Follower C */}
                  <line x1={nodeAPos.x} y1={nodeAPos.y} x2={nodeCPos.x} y2={nodeCPos.y} />

                  {/* Partition Line */}
                  {hasPartition && (
                    <line
                      x1={370}
                      y1={10}
                      x2={370}
                      y2={290}
                      className="stroke-red-500/60 stroke-2"
                      style={{ strokeDasharray: "6 4" }}
                    />
                  )}
                </svg>

                {/* Network Partition Wall Label */}
                {hasPartition && (
                  <div className="absolute left-[370px] top-6 -translate-x-1/2 z-10 px-2 py-0.5 bg-red-950 border border-red-500/30 text-red-400 text-[8px] font-mono rounded uppercase tracking-wider">
                    Network Partition
                  </div>
                )}

                {/* Client Node */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    left: clientPos.x,
                    top: clientPos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700/60 flex items-center justify-center shadow-lg hover:border-cyan-400/40 transition-colors">
                    <span className="text-2xl">💻</span>
                  </div>
                  <span className="mt-2 text-[10px] font-mono text-slate-400">Client Node</span>
                </div>

                {/* Replica Node A (Leader) */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: nodeAPos.x, top: nodeAPos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className={`w-20 h-24 rounded-2xl bg-[#131b29] border p-3 flex flex-col justify-between items-center shadow-2xl transition-all duration-300 ${
                      nodeAStatus === "writing"
                        ? "border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                        : nodeAStatus === "replicating"
                          ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] animate-pulse"
                          : nodeAStatus === "error"
                            ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            : "border-white/5"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[8px] font-mono text-cyan-400 font-bold">Node A</span>
                      <span className="text-[8px] font-mono text-slate-500">LEADER</span>
                    </div>

                    <div className="my-1.5 flex flex-col items-center">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Val</span>
                      <span className="text-xl font-bold font-display text-white">
                        {nodeAValue}
                      </span>
                    </div>

                    {/* Status lights */}
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${nodeAStatus === "error" ? "bg-red-500 animate-ping" : "bg-emerald-500"}`}
                      />
                      <span className="text-[8px] font-mono text-slate-400">
                        {nodeAStatus === "writing"
                          ? "Writing"
                          : nodeAStatus === "replicating"
                            ? "Syncing"
                            : "Online"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Replica Node B (Follower) */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: nodeBPos.x, top: nodeBPos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className={`w-20 h-24 rounded-2xl bg-[#131b29] border p-3 flex flex-col justify-between items-center shadow-2xl transition-all duration-300 ${
                      nodeBStatus === "syncing"
                        ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] animate-pulse"
                        : nodeBStatus === "stale"
                          ? "border-yellow-500/40"
                          : "border-white/5"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[8px] font-mono text-indigo-400 font-bold">Node B</span>
                      <span className="text-[8px] font-mono text-slate-500">FOLLOWER</span>
                    </div>

                    <div className="my-1.5 flex flex-col items-center">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Val</span>
                      <span
                        className={`text-xl font-bold font-display ${nodeBValue !== nodeAValue ? "text-yellow-400" : "text-white"}`}
                      >
                        {nodeBValue}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${hasPartition ? "bg-red-500" : nodeBValue !== nodeAValue ? "bg-yellow-500" : "bg-emerald-500"}`}
                      />
                      <span className="text-[8px] font-mono text-slate-400">
                        {hasPartition ? "Isolated" : nodeBValue !== nodeAValue ? "Stale" : "Synced"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Replica Node C (Follower) */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{ left: nodeCPos.x, top: nodeCPos.y, transform: "translate(-50%, -50%)" }}
                >
                  <div
                    className={`w-20 h-24 rounded-2xl bg-[#131b29] border p-3 flex flex-col justify-between items-center shadow-2xl transition-all duration-300 ${
                      nodeCStatus === "syncing"
                        ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-pulse"
                        : nodeCStatus === "stale"
                          ? "border-yellow-500/40"
                          : "border-white/5"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[8px] font-mono text-purple-400 font-bold">Node C</span>
                      <span className="text-[8px] font-mono text-slate-500">FOLLOWER</span>
                    </div>

                    <div className="my-1.5 flex flex-col items-center">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Val</span>
                      <span
                        className={`text-xl font-bold font-display ${nodeCValue !== nodeAValue ? "text-yellow-400" : "text-white"}`}
                      >
                        {nodeCValue}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${hasPartition ? "bg-red-500" : nodeCValue !== nodeAValue ? "bg-yellow-500" : "bg-emerald-500"}`}
                      />
                      <span className="text-[8px] font-mono text-slate-400">
                        {hasPartition ? "Isolated" : nodeCValue !== nodeAValue ? "Stale" : "Synced"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Panel / Controls Deck */}
              <div className="border border-white/[0.09] bg-[#0c1624]/60 rounded-[22px] p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <h3 className="font-mono text-xs uppercase tracking-widest text-slate-300">
                    Cluster Control Deck
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] font-mono text-cyan-400">Console Online</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Write Value Module */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      1. Write Operation
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={writeValue}
                        onChange={(e) => setWriteValue(e.target.value.slice(0, 3))}
                        disabled={isPendingWrite}
                        className="w-16 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white text-center font-mono focus:outline-none focus:border-cyan-500/40"
                      />
                      <button
                        onClick={handleWrite}
                        disabled={isPendingWrite}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg py-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed font-mono"
                      >
                        SET (Leader)
                      </button>
                    </div>
                  </div>

                  {/* Read Value Module */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      2. Read Operations
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => handleRead("A")}
                        disabled={isPendingWrite}
                        className="bg-slate-900 border border-white/5 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-white rounded-lg py-1.5 transition"
                      >
                        Read A
                      </button>
                      <button
                        onClick={() => handleRead("B")}
                        disabled={isPendingWrite}
                        className="bg-slate-900 border border-white/5 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-white rounded-lg py-1.5 transition"
                      >
                        Read B
                      </button>
                      <button
                        onClick={() => handleRead("C")}
                        disabled={isPendingWrite}
                        className="bg-slate-900 border border-white/5 hover:border-cyan-500/40 text-[10px] font-mono font-bold text-white rounded-lg py-1.5 transition"
                      >
                        Read C
                      </button>
                    </div>
                  </div>

                  {/* Latency Slider Module */}
                  <div className="space-y-2 sm:col-span-2 md:col-span-1">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      3. Replication Delay ({replicationDelay}s)
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={replicationDelay}
                      onChange={(e) => setReplicationDelay(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>

                {/* Configuration Toggles */}
                <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  {/* Mode Select */}
                  <div className="flex items-center justify-between bg-slate-950/40 border border-white/5 rounded-xl p-3.5">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Consistency Mode
                      </span>
                      <span className="text-xs text-white font-medium">
                        {consistencyMode === "strong"
                          ? "Strong (Linearizable)"
                          : "Eventual Consistency"}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setConsistencyMode((prev) => (prev === "strong" ? "eventual" : "strong"))
                      }
                      className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border font-bold transition-all ${
                        consistencyMode === "strong"
                          ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                          : "bg-slate-900 border-white/5 text-slate-300"
                      }`}
                    >
                      Toggle Mode
                    </button>
                  </div>

                  {/* Network Partition Toggle */}
                  <div className="flex items-center justify-between bg-slate-950/40 border border-white/5 rounded-xl p-3.5">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Network Split
                      </span>
                      <span className="text-xs text-white font-medium">
                        {hasPartition
                          ? "Partition Active (Split Brain Risk)"
                          : "Healthy (All Connected)"}
                      </span>
                    </div>
                    <button
                      onClick={togglePartition}
                      className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border font-bold transition-all ${
                        hasPartition
                          ? "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse"
                          : "bg-slate-900 border-white/5 text-slate-300"
                      }`}
                    >
                      {hasPartition ? "Heal Network" : "Cut Network"}
                    </button>
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
                                : log.type === "network"
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
                <h3 className="font-display font-bold text-white text-sm">Trade-off Telemetry</h3>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-500 block">
                      CAP Alignment
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {consistencyMode === "strong"
                        ? "Linearizable operations prioritize Consistency over Availability (CP). Updates block until synchronized."
                        : "Eventual updates prioritize Availability over Consistency (AP). Readers can access older values."}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono uppercase text-slate-500 block">
                      Split Brain Behavior
                    </span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {consistencyMode === "strong"
                        ? "Partition isolates replicas. Operations on decoupled followers fail immediately to prevent data deviation."
                        : "Followers remain readable/writeable and diverge. State auto-synchronizes and reconciles when partition heals."}
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
