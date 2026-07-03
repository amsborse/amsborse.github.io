const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'pages', 'Resume.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: Imports
const importTarget = `import { Seo } from "@/components/Seo";
import { useState, useEffect, useRef } from "react";`;
const importReplacement = `import { Seo } from "@/components/Seo";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";`;
if (!content.includes(importTarget)) {
  console.error("Import target not found!");
  process.exit(1);
}
content = content.replace(importTarget, importReplacement);

// Replacement 2: Interfaces, constants, components, states, handlers
const startTarget = `export default function ResumePage() {
  const [morphed, setMorphed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Popup detail states
  const [, setHoveredDetail] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
  const [lockedDetail, setLockedDetail] = useState<string | null>(null);
  const [lockedIndex, setLockedIndex] = useState<string | null>(null);

  // Sync body classes
  useEffect(() => {
    if (morphed) {
      document.body.classList.add("morphed");
      setDarkMode(false);
    } else {
      document.body.classList.remove("morphed");
      document.body.classList.remove("dark");
    }
  }, [morphed]);

  useEffect(() => {
    if (morphed && darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode, morphed]);

  useEffect(() => {
    if (lockedDetail) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
    }
  }, [lockedDetail]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("morphed", "dark", "focus-mode");
    };
  }, []);

  // Popup interaction logic
  const handleItemMouseEnter = (detail: string, index: string) => {
    if (!morphed || lockedDetail) return;
    setHoveredDetail(detail);
    setHoveredIndex(index);
  };

  const handleItemMouseLeave = () => {
    if (lockedDetail) return;
    setHoveredDetail(null);
    setHoveredIndex(null);
  };

  const handleItemClick = (detail: string, index: string, e: React.MouseEvent) => {
    if (!morphed) return;
    e.stopPropagation();
    if (lockedIndex === index) {
      // Unlock
      setLockedDetail(null);
      setLockedIndex(null);
      setHoveredDetail(null);
      setHoveredIndex(null);
    } else {
      // Lock
      setLockedDetail(detail);
      setLockedIndex(index);
      setHoveredDetail(null);
      setHoveredIndex(null);
    }
  };

  const closeLocks = () => {
    setLockedDetail(null);
    setLockedIndex(null);
    setHoveredDetail(null);
    setHoveredIndex(null);
  };

  // Listen to clicks outside to dismiss lock
  useEffect(() => {
    const handleGlobalClick = () => {
      closeLocks();
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  return (`;

const startReplacement = `interface Bullet {
  index: string;
  boldText: string;
  plainText: string;
  impactText?: string;
  extraText?: string;
  detail: string;
  eli5?: string;
  analogy?: string;
  qnas?: { q: string; a: string }[];
}

const MICROSOFT_BULLETS: Bullet[] = [
  {
    index: "ms-1",
    boldText: "Architected end-to-end AI-agent risk-scoring pipeline",
    plainText: " — 4-stage system processing ",
    impactText: "12.9M triggers/day",
    extraText: " (23.9M peak) across 34,071 tenants; concept to sovereign-cloud GA in 9 months.",
    detail: "Built a parallel 4-stage system: Activity Ingestion (Event Hub capture) → Trigger Evaluation (12.9M dispatches/day, 23.9M peak) → Insight Generation (366,700 insights/day, 475,500 peak) → Enforcement (Entra/Graph risk signal + DLP/Conditional Access). Scores AI agent behavior across M365 surfaces. Went from zero infrastructure to sovereign-cloud GA across Commercial + GCC/GCCH/DOD in 9 months. 100+ PRs, 849 commits, 13,500+ file changes.",
    eli5: "We designed the entire system from scratch—from gathering raw AI activity logs, evaluating security risks, to automatically restricting dangerous agents—and shipped it to production in 9 months.",
    analogy: "Building an entire automated airport security check from the ticket counter to the boarding gate, capable of checking millions of passengers daily.",
    qnas: [
      { q: "Can you describe the 4 stages of the pipeline?", a: "1) Activity Ingestion: M365 Unified Audit Log events are streamed via Event Hub. 2) Trigger Evaluation: Spark jobs evaluate triggers daily (12.9M avg). 3) Insight Generation: Aggregated patterns form insights. 4) Enforcement: Pushes risk level to Entra ID." }
    ]
  },
  {
    index: "ms-2",
    boldText: "Built Progressive Insights pipeline",
    plainText: " — Spark streaming → Event Hub → Cosmos DB → Azure Functions scoring; ",
    impactText: "~39M user events/day",
    extraText: ", ~200K agent events/day, P95 latency 48s.",
    detail: "Two-phase Progressive Insights pipeline: Phase 1 (Tyrol/Spark) runs IrmHourlyCumulativeFullAggregator and IrmProgressiveInsightGenerationJob, outputting changed insights to Event Hub and full snapshots to ADLS. Phase 2 (.NET 8 Functions) captures via InsightsCapturer into Cosmos DB, runs BackupInsightsProcessorClient every ~5 min for safety, deduplicates by ConstantInsightId, scores via UserInsightsProcessor, and feeds into Adaptive Protection. Handles ~39M user events/day + ~200K agent events/day.",
    eli5: "A two-step data pipeline that streams changed activities in real-time while also saving full backups to ensure we never lose or miss any security events.",
    analogy: "A streaming video service that lets you watch live sports in real-time, while also recording the entire game to a server for playback later."
  },
  {
    index: "ms-3",
    boldText: "Integrated Purview with Entra ID for agent risk enforcement",
    plainText: " — Graph API endpoints, risk signal propagation, IRM deep links; ",
    impactText: "same-cycle CA enforcement",
    extraText: " with no human intervention.",
    detail: "Integrated Purview IRM with Microsoft Entra ID for AI agent risk signals. Built new Graph API endpoints for agent risk signal propagation, riskyUserId/actorType flow, HttpClient certificate authentication, default policy auto-setup, and IRM deep links. SOC analysts navigate directly from Entra alert to Purview investigation. Enforcement loop: IRM detects risky agent → scores risk → pushes signal to Entra → triggers DLP/Conditional Access policy automatically.",
    eli5: "A direct link between the security monitoring center (Purview) and the lock system (Entra ID) so that any flagged AI agent has its permissions pulled automatically.",
    analogy: "Connecting a motion sensor directly to the automatic door locks, so if a sensor is tripped, the doors lock immediately."
  },
  {
    index: "ms-4",
    boldText: "Optimized Adaptive Protection scoring latency by 40–60%",
    plainText: " — parallelized Cosmos + EOP writes; scoring ",
    impactText: "119,800 insights/day",
    extraText: " (958K per 8-day window).",
    detail: "Parallelized independent Cosmos DB and EOP writes in the AP scoring path, refactored UserRiskProfileProcessorBase for agent/user separation, and optimized the scoring pipeline end-to-end. Scoring processes 958,800 insights per 8-day window (119,800/day). Pipeline now handles 366,700 new insights/day with peak of 475,500/day."
  },
  {
    index: "ms-5",
    boldText: "Built isolated agent compute infrastructure",
    plainText: " — 28 dedicated Function Apps; ",
    impactText: "33% lower P95 latency",
    extraText: " (48s vs 72s), 100% API success rate over 30 days.",
    detail: "Built 14 dedicated AgentDataClient Function Apps + 14 DataClient apps with fully isolated App Service Plans and storage accounts. Agent pipeline achieves P95 capture latency of 48s vs 72s for the shared user pipeline (33% improvement). Agent burst at 3x load never touches user SLAs. 100% API success rate across all DataClient operations over 30 days.",
    eli5: "We separated the AI agent traffic from normal human user traffic so that even if the AI starts making millions of requests at once, human workers won't experience any slowdown or system crashes.",
    analogy: "An express delivery lane on a highway. Trucks have their own dedicated lane, so they never cause traffic jams in the passenger car lanes.",
    qnas: [
      { q: "What was the benefit of computing isolation?", a: "It improved P95 capture latency by 33% (48s vs 72s) and prevented heavy, bursty agent workloads (up to 3x peak load) from impacting the response times of the human user pipeline." }
    ]
  },
  {
    index: "ms-6",
    boldText: "Led sovereign cloud rollout (GCC, GCCH, DOD)",
    plainText: " — DR across 4 forests, ",
    impactText: "53 resource groups",
    extraText: ", 51 agent deployments, staged ring-by-ring delivery.",
    detail: "Authored DR parameter files across GCC01, GCC02, USG01, USG02. Built EV2 service model and rollout specs spanning 53 resource groups and 51 agent DataClient deployments. Staged rollout: GCC-first, then GCCH/DOD. Geneva/Kusto onboarding for Gov telemetry (3 environments × 7 steps × 16 Geneva queries). Embedded ASP steps, fixed rollout-spec bugs, and added ServiceModel_DR updates.",
    eli5: "We deployed these AI risk features to highly secure, locked-down government clouds (like GCC, GCCH, and DoD), ensuring that government agencies can use AI safely while adhering to strict sovereign compliance.",
    analogy: "Like installing a bank-vault-grade security system inside a military base. It requires separate isolated equipment, custom setups, and strict approval keys.",
    qnas: [
      { q: "How did you manage deployments in sovereign clouds?", a: "We configured separate parameter files for GCC01, GCC02, USG01, USG02, deploying across 53 isolated resource groups with EV2 service model specifications, and onboarding Gov telemetry via Geneva/Kusto." }
    ]
  },
  {
    index: "ms-7",
    boldText: "Extended IRM to treat AI agents as first-class actors",
    plainText: " — DRP, historical search, risk scoring, policy lookup, onboarding; serving ",
    impactText: "13,047 tenants",
    extraText: ", 237,600+ agent actors.",
    detail: "Extended IRM platform to treat AI agents as first-class actors: Agent type in UpsertDRPCustomTag, actor support in HistoricalSearchProcess, AgentAdaptiveProtectionSettings, RiskProfileProcessorClient for agent scoring, MasterDRPSyncClient for agent DRP sync, ObjectId/mailbox identity for Agentic User, AgentActorComparer for reusable comparison logic. Now serving 13,047 tenants with 237,600+ distinct agent actors.",
    eli5: "We updated the whole Microsoft Purview codebase so that it can treat AI agents just like human users—assigning them profiles, scanning their histories, and scoring their risk.",
    analogy: "Upgrading an office badge reader system to print cards and track logs for robotic carts, not just human employees."
  },
  {
    index: "ms-8",
    boldText: "Operated on CDP at billions-of-signals-per-day scale",
    plainText: " — multi-stage Spark → Event Hub → Kusto → Service Fabric pipeline; ",
    impactText: "82 EV2 resource definitions",
    extraText: ", horizontal storage sharding.",
    detail: "Operated on CDP (Common Data Platform) processing billions of signals/day through a multi-stage pipeline: Sources → S1 (Spark Structured Streaming) → S2 (parallel dispatch) → S3 (batch aggregation) → K1/K2 (Kusto ingestion) → Q (query). EV2 service model with 82 resource definitions. Horizontal storage sharding. 500K records in 8.3 min parallel vs 13.8h sequential.",
    eli5: "We worked on a huge data platform that handles billions of security signals every day, speeding up data processing from hours to minutes using parallel processing.",
    analogy: "Replacing a single cashier with 100 checkout lanes to handle holiday shopping crowds without making anyone wait."
  },
  {
    index: "ms-9",
    boldText: "Resolved critical Gov production incidents",
    plainText: " — Event Hub deletion (",
    impactText: "~90% capture drop",
    extraText: " recovered), Cosmos conflict bugs; established team-wide recovery SOPs.",
    detail: "Resolved Event Hub deletion in GCC02 causing ~90% insight capture drop. Fixed Cosmos conflict bug affecting 3 Gov tenants. Managed multiple Sev 2/3/4 ICM days during Gov rollout. Recovery procedures became team-wide standards.",
    eli5: "When critical government cloud pipelines went down, we quickly found the cause, restored operations, and wrote step-by-step guides to prevent it from happening again.",
    analogy: "Like a firefighter team responding to a major blackout at a hospital, fixing the generator, and upgrading the backup systems."
  },
  {
    index: "ms-10",
    boldText: "Managed complex flight and release operations",
    plainText: " — 10+ cloud regions/rings, cherry-pick/backport coordination, ",
    impactText: "100-file config cleanup",
    extraText: ", staged Gov scoping.",
    detail: "Managed feature flights across 10+ cloud regions/rings. Executed cherry-pick/backport waves across release branches. 100-file config cleanup in single PR. Scoped risky Gov rollout from all-Gov to GCC-only, then expanded after validation. ActorId to AgentId migration + backfill."
  },
  {
    index: "ms-11",
    boldText: "Scaled trigger pipeline to 400M dispatches/month",
    plainText: " — ",
    impactText: "25.8M distinct actors",
    extraText: ", intelligent throttling (48.3%) and noise filtering (6%) for signal quality.",
    detail: "Trigger pipeline processes 399.7M dispatches in 30 days across 34,071 tenants and 25.8M distinct actors. Disposition: 45.7% Allowed (181.7M), 48.3% Throttled (191.8M), 6% DroppedNoisy (23.7M). Covers the full IRM signal surface across all M365 workloads."
  }
];

const AMAZON_BULLETS: Bullet[] = [
  {
    index: "amz-1",
    boldText: "Architected backend for quantile regression model",
    plainText: " — ",
    impactText: "~$28MM profit gain.",
    extraText: "",
    detail: "Built the full backend: real-time feature pipeline, model serving infrastructure, A/B test framework, and rollback safety nets. SageMaker-hosted quantile regression model powers delivery date predictions across all of Amazon logistics."
  },
  {
    index: "amz-2",
    boldText: "Led logging optimization",
    plainText: " — ",
    impactText: "$3M+/year savings",
    extraText: " across 60+ services.",
    detail: "Audited 60+ services during AWS migration. Identified redundant CloudWatch metrics, optimized log levels, implemented sampling strategies. Reduced costs by $250K+/month sustained."
  },
  {
    index: "amz-3",
    boldText: "Microservice bootstrap library",
    plainText: " — saving ",
    impactText: "40–50 engineer-weeks.",
    extraText: "",
    detail: "Custom DSL for service configuration: dependency injection, middleware chains, health checks, deployment pipelines — all generated from a single config file. Reduced new service setup from 2–3 weeks to hours."
  },
  {
    index: "amz-4",
    boldText: "Event orchestration",
    plainText: " — ",
    impactText: "100K+ TPS",
    extraText: ", 16 services.",
    detail: "Unified event bus coordinating state transitions and inventory updates across 16 M365/Fulfillment services."
  },
  {
    index: "amz-5",
    boldText: "RAG delivery prediction",
    plainText: " — ",
    impactText: "7% global sales increase.",
    extraText: "",
    detail: "Retrieval-augmented generation using SageMaker embeddings + OpenSearch vector index. Predicts delivery windows by retrieving similar historical deliveries and adjusting for current conditions."
  },
  {
    index: "amz-6",
    boldText: "Just-In-Stock",
    plainText: " — ",
    impactText: "16% early delivery increase.",
    extraText: "",
    detail: "Real-time inventory optimization that routes packages to the closest fulfillment center with available stock, reducing transit time and increasing early-delivery rates by 16%."
  },
  {
    index: "amz-7",
    boldText: "LLM email redesign",
    plainText: " — 37 templates via Bedrock.",
    impactText: "",
    extraText: "",
    detail: "Used Amazon Bedrock (Claude/Titan) with RAG constraints to ensure brand compliance, legal requirements, and personalization. Automated generation of 37 transactional email templates."
  },
  {
    index: "amz-8",
    boldText: "Load testing 60+ services",
    plainText: " for Prime Day.",
    impactText: "",
    extraText: "",
    detail: "Built load testing infrastructure for Prime Day and Black Friday. Validated auto-scaling policies, identified bottlenecks, ensured zero degradation during 10x traffic spikes."
  },
  {
    index: "amz-9",
    boldText: "Sev-2 reduced 60%",
    plainText: " via on-call reviews.",
    impactText: "",
    extraText: "",
    detail: "Conducted systematic on-call reduction reviews across 8 teams. Identified recurring alerts, built runbooks, automated common resolutions. Sev-2 page frequency dropped 60%."
  },
  {
    index: "amz-10",
    boldText: "TRA readiness",
    plainText: " — CI/CD, fault injection, canary.",
    impactText: "",
    extraText: "",
    detail: "Full TRA (Threat & Risk Assessment) for Tier-1 service: CI/CD hardening, multi-AZ failover, chaos engineering via fault injection, canary deployments, and reusable developer tools."
  }
];

function BulletStoryteller({ index }: { index: string }) {
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTrigger((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (index === "ms-1") {
    return (
      <div className="story-board-container" style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "var(--accent)", fontWeight: "bold" }}>
          <span>4-STAGE SCORING PIPELINE</span>
          <button onClick={() => setTrigger(t => t + 1)} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: "bold" }}>⚡ Simulate Pulse</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", margin: "24px 0" }}>
          <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: "2px", background: "rgba(99, 102, 241, 0.2)", zIndex: 1 }} />
          <motion.div 
            key={trigger}
            initial={{ left: "10%" }}
            animate={{ left: "90%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
            style={{ position: "absolute", top: "calc(50% - 3px)", width: "12px", height: "8px", borderRadius: "4px", background: "var(--accent)", filter: "drop-shadow(0 0 4px var(--accent))", zIndex: 2 }} 
          />
          {
            [
              { label: "Ingest", icon: "📥", desc: "EventHub", color: "var(--accent)" },
              { label: "Evaluate", icon: "🧠", desc: "Spark Jobs", color: "#f59e0b" },
              { label: "Insight", icon: "📊", desc: "Aggregations", color: "#ec4899" },
              { label: "Enforce", icon: "🔒", desc: "Entra ID", color: "#ef4444" }
            ].map((step, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.15 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 3, position: "relative" }}
              >
                <motion.div 
                  animate={{ 
                    boxShadow: trigger % 4 === i ? `0 0 16px ${step.color}` : "0 0 0px transparent",
                    borderColor: trigger % 4 === i ? step.color : "rgba(99, 102, 241, 0.2)"
                  }}
                  style={{ width: "42px", height: "42px", borderRadius: "50%", background: "var(--paper)", border: "2px solid rgba(99, 102, 241, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}
                >
                  {step.icon}
                </motion.div>
                <span style={{ fontSize: "7.5pt", fontWeight: "bold", marginTop: "6px", color: "var(--text)" }}>{step.label}</span>
                <span style={{ fontSize: "6pt", color: "var(--text-light)" }}>{step.desc}</span>
              </motion.div>
            ))
          }
        </div>
        <div style={{ fontSize: "8.5pt", color: "var(--text-light)", textAlign: "center", fontStyle: "italic" }}>
          {trigger % 4 === 0 && "📥 Ingesting real-time M365 audit logs..."}
          {trigger % 4 === 1 && "🧠 Evaluating risk signals against tenant threat rules..."}
          {trigger % 4 === 2 && "📊 Compiling raw signals into active risk insights..."}
          {trigger % 4 === 3 && "🔒 Sending Conditional Access policy signal to block OAuth token..."}
        </div>
      </div>
    );
  }

  if (index === "ms-2") {
    return (
      <div className="story-board-container" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#10b981", fontWeight: "bold" }}>
          <span>PROGRESSIVE INSIGHTS WORKFLOW</span>
          <span style={{ fontSize: "7pt", color: "var(--text-light)" }}>P95 LATENCY: 48s</span>
        </div>
        <div style={{ margin: "16px 0", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "8px", border: "1px dashed rgba(16, 185, 129, 0.2)" }}>
              <span style={{ fontSize: "7pt", fontWeight: "bold", color: "#10b981", minWidth: "70px" }}>⚡ Real-time:</span>
              <div style={{ flex: 1, display: "flex", gap: "20px", overflow: "hidden" }}>
                {
                  [0, 1, 2].map((x) => (
                    <motion.div 
                      key={x + trigger}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 100, opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 4, repeat: Infinity, delay: x * 1.2 }}
                      style={{ background: "#10b981", color: "white", fontSize: "7pt", padding: "2px 8px", borderRadius: "4px", whiteSpace: "nowrap" }}
                    >
                      📝 Event {x + trigger * 3}
                    </motion.div>
                  ))
                }
              </div>
              <span style={{ fontSize: "12px" }}>➡️ 🗄️ Cosmos</span>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px", background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "8px", border: "1px dashed rgba(245, 158, 11, 0.2)" }}>
              <span style={{ fontSize: "7pt", fontWeight: "bold", color: "#f59e0b", minWidth: "70px" }}>⏰ Backup (~5m):</span>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-around" }}>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={{ fontSize: "14px" }}
                >
                  ⚙️
                </motion.div>
                <div style={{ height: "4px", flex: 1, background: "rgba(245, 158, 11, 0.2)", margin: "0 8px", borderRadius: "2px" }} />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ fontSize: "7pt", padding: "2px 6px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)" }}
                >
                  Deduplicating...
                </motion.div>
              </div>
              <span style={{ fontSize: "12px" }}>➡️ 🗄️ Cosmos</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Spark aggregates hourly streams to Event Hub. Azure Functions capture and continuously score User profiles.
        </div>
      </div>
    );
  }

  if (index === "ms-3") {
    return (
      <div className="story-board-container" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#ef4444", fontWeight: "bold" }}>
          <span>ENTRA ID ADAPTIVE ENFORCEMENT</span>
          <button onClick={() => setTrigger(t => t + 1)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontSize: "7pt", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}>Simulate Revoke</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", margin: "16px 0" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <div style={{ fontSize: "7pt", fontWeight: "bold", color: "var(--text)", marginTop: "4px" }}>Purview</div>
            <div style={{ fontSize: "6pt", color: "#dc2626", fontWeight: "bold" }}>Risk: HIGH</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            <div style={{ width: "100%", height: "2px", background: "rgba(239, 68, 68, 0.2)", position: "absolute", top: "50%", zIndex: 1 }} />
            <motion.div 
              key={trigger}
              initial={{ scale: 0.5, opacity: 0, x: -50 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1, x: 50 }}
              transition={{ duration: 1.5 }}
              style={{ background: "#ef4444", color: "white", fontSize: "6pt", padding: "2px 6px", borderRadius: "4px", zIndex: 2, fontWeight: "bold" }}
            >
              SIGNAL
            </motion.div>
          </div>
          <div style={{ textAlign: "center", position: "relative" }}>
            <motion.div
              animate={{ rotate: trigger % 2 === 1 ? [0, -90] : [0] }}
              transition={{ duration: 0.5 }}
              style={{ fontSize: "20px" }}
            >
              🔑
            </motion.div>
            <div style={{ fontSize: "7pt", fontWeight: "bold", color: "var(--text)", marginTop: "4px" }}>OAuth Status</div>
            <motion.span 
              animate={{ 
                color: trigger % 2 === 1 ? "#ef4444" : "#10b981",
                background: trigger % 2 === 1 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)"
              }}
              style={{ fontSize: "6.5pt", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", border: "1px solid" }}
            >
              {trigger % 2 === 1 ? "REVOKED" : "ACTIVE"}
            </motion.span>
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Same-cycle Conditional Access token revocation prevents compromised agents from reading or leaking files.
        </div>
      </div>
    );
  }

  if (index === "ms-5") {
    return (
      <div className="story-board-container" style={{ background: "rgba(139, 92, 246, 0.05)", border: "1px solid rgba(139, 92, 246, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "var(--accent2)", fontWeight: "bold" }}>
          <span>ISOLATED COMPUTE PATHWAYS</span>
          <span style={{ fontSize: "7pt", color: "#10b981" }}>No interference</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "16px 0" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", padding: "8px 12px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "7.5pt", fontWeight: "bold", color: "var(--text)" }}>👤 Human Users</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#3b82f6" }} />
              ))}
            </div>
            <span style={{ fontSize: "7.5pt", color: "#3b82f6", fontWeight: "bold" }}>P95: 72s</span>
          </div>
          <div style={{ background: "rgba(139, 92, 246, 0.08)", border: "1px dashed rgba(139, 92, 246, 0.25)", padding: "8px 12px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "7.5pt", fontWeight: "bold", color: "var(--accent2)" }}>🤖 AI Agents</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div 
                  key={i} 
                  animate={{ height: [12, 24, 12] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: "12px", height: "12px", borderRadius: "2px", background: "var(--accent2)" }} 
                />
              ))}
            </div>
            <span style={{ fontSize: "7.5pt", color: "#10b981", fontWeight: "bold" }}>P95: 48s (-33%)</span>
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Separating AI workloads into 28 dedicated Function Apps stops heavy agent bursts from stalling human transactions.
        </div>
      </div>
    );
  }

  if (index === "ms-6") {
    return (
      <div className="story-board-container" style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#f59e0b", fontWeight: "bold" }}>
          <span>SOVEREIGN CLOUD ROLLOUT SPEC</span>
          <span style={{ fontSize: "7pt", color: "var(--text-light)" }}>53 Resource Groups</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "16px 0", position: "relative", height: "80px" }}>
          {[
            { name: "DoD", r: 30, color: "#ef4444" },
            { name: "GCCH", r: 42, color: "#f59e0b" },
            { name: "GCC", r: 54, color: "#10b981" },
            { name: "Commercial", r: 66, color: "#3b82f6" }
          ].map((ring, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.4, type: "spring", stiffness: 100 }}
              style={{
                position: "absolute",
                width: ring.r * 2,
                height: ring.r * 2,
                borderRadius: "50%",
                border: `2px solid ${ring.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 10px ${ring.color}33`,
                background: "transparent"
              }}
            >
              <span style={{ position: "absolute", top: "-12px", background: "var(--paper)", padding: "1px 4px", borderRadius: "4px", fontSize: "6pt", border: `1px solid ${ring.color}`, color: ring.color, fontWeight: "bold" }}>{ring.name}</span>
            </motion.div>
          ))}
          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", border: "2px solid #222", zIndex: 5 }} />
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Staged ring deployments configure isolated telemetry and parameter files across 4 global forests.
        </div>
      </div>
    );
  }

  if (index === "ms-7") {
    return (
      <div className="story-board-container" style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#38bdf8", fontWeight: "bold" }}>
          <span>FIRST-CLASS RISK REPRESENTATION</span>
          <button onClick={() => setTrigger(t => t + 1)} style={{ background: "transparent", border: "none", color: "#38bdf8", fontSize: "7pt", fontWeight: "bold", cursor: "pointer" }}>🔄 Morph Entity</button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "16px 0" }}>
          <AnimatePresence mode="wait">
            {trigger % 2 === 0 ? (
              <motion.div 
                key="human"
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ duration: 0.5 }}
                style={{ width: "180px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "8px", padding: "10px", textAlign: "center" }}
              >
                <div style={{ fontSize: "20px" }}>👤</div>
                <div style={{ fontSize: "8pt", fontWeight: "bold", color: "var(--text)" }}>Human Actor</div>
                <div style={{ fontSize: "6.5pt", color: "var(--text-light)" }}>Mailbox • IP • File operations</div>
              </motion.div>
            ) : (
              <motion.div 
                key="agent"
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -90 }}
                transition={{ duration: 0.5 }}
                style={{ width: "180px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "8px", padding: "10px", textAlign: "center" }}
              >
                <div style={{ fontSize: "20px" }}>🤖</div>
                <div style={{ fontSize: "8pt", fontWeight: "bold", color: "var(--text)" }}>AI Agent Actor</div>
                <div style={{ fontSize: "6.5pt", color: "var(--text-light)" }}>AppID • TenantId • API Scopes</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Updating Purview's search, profile, and DRP components lets the system evaluate AI agents exactly like human actors.
        </div>
      </div>
    );
  }

  if (index === "ms-8") {
    return (
      <div className="story-board-container" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#10b981", fontWeight: "bold" }}>
          <span>COMMON DATA PLATFORM SCALE</span>
          <span style={{ fontSize: "7pt", color: "#10b981" }}>Billions/Day Ingest</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "16px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "14px" }}>🔥</span>
            <span style={{ fontSize: "7pt", fontWeight: "bold" }}>Audit log</span>
          </div>
          <span style={{ fontSize: "14px" }}>➡️</span>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "50px", height: "4px", background: "rgba(16, 185, 129, 0.2)", borderRadius: "2px", overflow: "hidden", position: "relative" }}>
                  <motion.div 
                    animate={{ left: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                    style={{ position: "absolute", top: 0, bottom: 0, width: "30%", background: "#10b981" }}
                  />
                </div>
                <span style={{ fontSize: "6.5pt", color: "var(--text-light)" }}>Shard {i}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)", textAlign: "center" }}>
            <span style={{ fontSize: "9pt", fontWeight: "bold", color: "#10b981", display: "block" }}>16x Speed</span>
            <span style={{ fontSize: "5pt", color: "var(--text-light)" }}>Parallel dispatch</span>
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Splitting large user batches into partitioned sharded queues reduced ingestion time from 13.8 hours to 8.3 minutes.
        </div>
      </div>
    );
  }

  if (index === "ms-9") {
    return (
      <div className="story-board-container" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#ef4444", fontWeight: "bold" }}>
          <span>ICM INCIDENT RESPONSE PLAYBOOK</span>
          <button onClick={() => setTrigger(t => t + 1)} style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", fontSize: "7pt", padding: "2px 8px", borderRadius: "4px", cursor: "pointer" }}>Run Recovery</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", margin: "16px 0" }}>
          <div style={{ textAlign: "center" }}>
            <motion.span 
              animate={{ scale: trigger % 2 === 0 ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 1, repeat: trigger % 2 === 0 ? Infinity : 0 }}
              style={{ fontSize: "20px" }}
            >
              {trigger % 2 === 0 ? "🚨" : "✅"}
            </motion.span>
            <div style={{ fontSize: "7.5pt", fontWeight: "bold", color: trigger % 2 === 0 ? "#ef4444" : "#10b981" }}>
              {trigger % 2 === 0 ? "90% Drop Alert" : "100% Recovered"}
            </div>
          </div>
          <div style={{ fontSize: "14px", color: "var(--text-light)" }}>➡️</div>
          <div style={{ width: "180px", background: "var(--paper)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "8px", padding: "8px", fontSize: "6.5pt", color: "var(--text)" }}>
            <div>🔧 1. Recreate Event Hub</div>
            <div>🔑 2. Update SAS / secrets</div>
            <motion.div animate={{ color: trigger % 2 === 1 ? "#10b981" : "var(--text-light)" }}>🔄 3. Restore checkpoints</motion.div>
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Successfully recovered Gov cloud insight pipelines from accidental Event Hub deletions, establishing official restore checklists.
        </div>
      </div>
    );
  }

  if (index === "amz-1") {
    return (
      <div className="story-board-container" style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#f59e0b", fontWeight: "bold" }}>
          <span>QUANTILE REGRESSION DELIVERY MODEL</span>
          <span style={{ fontSize: "7pt", color: "#10b981" }}>+$28MM profit gain</span>
        </div>
        <div style={{ position: "relative", margin: "16px 0", height: "40px" }}>
          <div style={{ position: "absolute", bottom: "4px", left: 0, right: 0, height: "4px", background: "#475569", borderRadius: "2px" }} />
          <motion.div 
            animate={{ width: ["90%", "30%", "90%"], left: ["5%", "35%", "5%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", bottom: "16px", height: "6px", background: "rgba(245, 158, 11, 0.25)", borderRadius: "3px" }}
          />
          <motion.div 
            animate={{ x: ["0%", "85%", "0%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", bottom: "8px", fontSize: "16px" }}
          >
            🚚
          </motion.div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          SageMaker-hosted quantile regression forecasts delivery times as ranges rather than single estimates, reducing shipping expenses.
        </div>
      </div>
    );
  }

  if (index === "amz-2") {
    return (
      <div className="story-board-container" style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#3b82f6", fontWeight: "bold" }}>
          <span>LOGGING AUDIT & OPTIMIZATION</span>
          <span style={{ fontSize: "7pt", color: "#ef4444" }}>-$250K / month</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", margin: "16px 0" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "16px" }}>📄📄📄</span>
            <div style={{ fontSize: "7pt", color: "var(--text)", fontWeight: "bold" }}>Bloated Logs</div>
            <div style={{ fontSize: "8pt", color: "#ef4444", fontWeight: "bold" }}>$$$$</div>
          </div>
          <div style={{ fontSize: "16px", color: "var(--accent)" }}>➡️ 🧹 ➡️</div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "16px" }}>📄</span>
            <div style={{ fontSize: "7pt", color: "var(--text)", fontWeight: "bold" }}>Filtered Signal</div>
            <div style={{ fontSize: "8pt", color: "#10b981", fontWeight: "bold" }}>$</div>
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Removed redundant logs and configured custom metrics across 60+ Amazon services, reducing CloudWatch costs.
        </div>
      </div>
    );
  }

  if (index === "amz-4") {
    return (
      <div className="story-board-container" style={{ background: "rgba(6, 182, 212, 0.05)", border: "1px solid rgba(6, 182, 212, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#06b6d4", fontWeight: "bold" }}>
          <span>EVENT BUS ORCHESTRATION</span>
          <span style={{ fontSize: "7pt", color: "#06b6d4" }}>100K+ TPS scale</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "12px 0", height: "80px", position: "relative" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", zIndex: 10, color: "white", boxShadow: "0 0 12px #06b6d4" }}>🔄</div>
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x = Math.cos(rad) * 35;
            const y = Math.sin(rad) * 35;
            return (
              <div key={deg}>
                <div style={{ position: "absolute", left: `calc(50% + ${x}px - 6px)`, top: `calc(50% + ${y}px - 6px)`, width: "12px", height: "12px", borderRadius: "50%", background: "var(--paper)", border: "1.5px solid #06b6d4" }} />
                <motion.div 
                  animate={{ 
                    left: [`calc(50% - 3px)`, `calc(50% + ${x}px - 3px)`],
                    top: [`calc(50% - 3px)`, `calc(50% + ${y}px - 3px)`]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ position: "absolute", width: "6px", height: "6px", borderRadius: "50%", background: "#22d3ee" }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          A high-scale unified event bus coordinating state transitions and inventory updates across 16 M365/Fulfillment services.
        </div>
      </div>
    );
  }

  if (index === "amz-5") {
    return (
      <div className="story-board-container" style={{ background: "rgba(236, 72, 153, 0.05)", border: "1px solid rgba(236, 72, 153, 0.15)", borderRadius: "12px", padding: "16px", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#ec4899", fontWeight: "bold" }}>
          <span>RETRIEVAL-AUGMENTED GENERATION (RAG)</span>
          <span style={{ fontSize: "7pt", color: "#10b981" }}>7% Sales Increase</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", margin: "16px 0" }}>
          <div style={{ fontSize: "8pt", background: "rgba(236, 72, 153, 0.15)", color: "#ec4899", padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(236, 72, 153, 0.3)" }}>
            🔎 Query
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
            <motion.span 
              animate={{ x: [-25, 25] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ fontSize: "14px" }}
            >
              ⚡
            </motion.span>
          </div>
          <div style={{ display: "flex", gap: "3px" }}>
            {[0, 1, 2].map((i) => (
              <motion.div 
                key={i} 
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ec4899", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: "white" }}
              >
                📍
              </motion.div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: "8pt", color: "var(--text-light)", textAlign: "center" }}>
          Retrieves historical deliveries using SageMaker embeddings and OpenSearch to dynamically predict delivery windows.
        </div>
      </div>
    );
  }

  return (
    <div className="story-board-container" style={{ background: "rgba(99, 102, 241, 0.03)", border: "1px dashed rgba(99, 102, 241, 0.2)", borderRadius: "12px", padding: "16px", minHeight: "185px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "var(--accent)", fontWeight: "bold" }}>
        <span>💡 NOTE: IDEAS FOR CREATIVE VISUALIZATION</span>
        <span style={{ color: "#10b981", fontSize: "7.5pt" }}>✨ Concept Board</span>
      </div>
      
      <div style={{ margin: "8px 0", fontSize: "8.5pt", color: "var(--text-light)", lineHeight: "1.4" }}>
        {index === "ms-4" && (
          <div>
            <strong>Proposed Visualization:</strong> An interactive comparison dashboard with two bars. Bar 1 shows the old sequential scoring processor (slowly filling to 13.8 hours). Bar 2 shows the optimized parallel Cosmos DB + EOP writer (snapping to completion in just 8.3 minutes, showing a 40–60% speed increase).
          </div>
        )}
        {index === "ms-10" && (
          <div>
            <strong>Proposed Visualization:</strong> A multi-ring regional deployment map showing code flags staging ring-by-ring from Commercial WW to GCC, GCCH, and DOD forests, with clickable toggle switches for Cherry-picks and Hotfixes.
          </div>
        )}
        {index === "ms-11" && (
          <div>
            <strong>Proposed Visualization:</strong> An animated pie chart or horizontal flow splitting 400M dispatches: 45.7% Allowed (green), 48.3% Throttled (orange), and 6% Noise-Filtered (red) to visually show signal quality filtering.
          </div>
        )}
        {index === "amz-6" && (
          <div>
            <strong>Proposed Visualization:</strong> A logistics map showing packages dynamically routing to the closest fulfillment centers (reducing transit time and leading to a 16% early-delivery increase).
          </div>
        )}
        {index === "amz-7" && (
          <div>
            <strong>Proposed Visualization:</strong> An interactive LLM template builder that lets you swap variables dynamically while maintaining brand and legal safety constraints.
          </div>
        )}
        {index === "amz-8" && (
          <div>
            <strong>Proposed Visualization:</strong> A load spikes simulator for Prime Day demonstrating zero degradation when service call frequencies scale from 1x to 10x traffic levels.
          </div>
        )}
        {index === "amz-9" && (
          <div>
            <strong>Proposed Visualization:</strong> A side-by-side incident ticket frequency chart before and after systematic on-call review automations (demonstrating a 60% drop).
          </div>
        )}
        {index === "amz-10" && (
          <div>
            <strong>Proposed Visualization:</strong> A TRA readiness checklist showing interactive pass badges for CI/CD hardening, Fault Injection, Canary deployments, and reusable tools.
          </div>
        )}
        {(!index.startsWith("ms-") && index !== "amz-1" && index !== "amz-2" && index !== "amz-4" && index !== "amz-5" && index !== "amz-6" && index !== "amz-7" && index !== "amz-8" && index !== "amz-9" && index !== "amz-10") && (
          <div>
            <strong>Proposed Visualization:</strong> A cost/performance telemetry dashboard comparing active service instances. We can show real-time auto-scaling indicators, service response alerts, or automated pipeline checklists.
          </div>
        )}
      </div>

      <div style={{ height: "4px", background: "rgba(99, 102, 241, 0.15)", borderRadius: "2px", overflow: "hidden", position: "relative", margin: "8px 0" }}>
        <motion.div 
          animate={{ left: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ position: "absolute", top: 0, bottom: 0, width: "30%", background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }}
        />
      </div>
      
      <div style={{ fontSize: "7.5pt", color: "var(--text-light)", textAlign: "center", fontStyle: "italic" }}>
        Click other experience bullet points to explore existing interactive visualizations!
      </div>
    </div>
  );
}

export default function ResumePage() {
  const [morphed, setMorphed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Popup detail states
  const [, setHoveredDetail] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
  const [lockedBullet, setLockedBullet] = useState<Bullet | null>(null);
  const [activeTab, setActiveTab] = useState<"technical" | "eli5" | "qna">("technical");

  const lockedIndex = lockedBullet?.index ?? null;
  const lockedDetail = lockedBullet?.detail ?? null;

  // Sync body classes
  useEffect(() => {
    if (morphed) {
      document.body.classList.add("morphed");
      setDarkMode(false);
    } else {
      document.body.classList.remove("morphed");
      document.body.classList.remove("dark");
    }
  }, [morphed]);

  useEffect(() => {
    if (morphed && darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode, morphed]);

  useEffect(() => {
    if (lockedBullet) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
    }
  }, [lockedBullet]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove("morphed", "dark", "focus-mode");
    };
  }, []);

  // Popup interaction logic
  const handleItemMouseEnter = (detail: string, index: string) => {
    if (!morphed || lockedBullet) return;
    setHoveredDetail(detail);
    setHoveredIndex(index);
  };

  const handleItemMouseLeave = () => {
    if (lockedBullet) return;
    setHoveredDetail(null);
    setHoveredIndex(null);
  };

  const handleItemClick = (bullet: Bullet, e: React.MouseEvent) => {
    if (!morphed) return;
    e.stopPropagation();
    if (lockedBullet?.index === bullet.index) {
      setLockedBullet(null);
      setActiveTab("technical");
    } else {
      setLockedBullet(bullet);
      setActiveTab("technical");
      setHoveredDetail(null);
      setHoveredIndex(null);
    }
  };

  const closeLocks = () => {
    setLockedBullet(null);
    setHoveredDetail(null);
    setHoveredIndex(null);
  };

  // Listen to clicks outside to dismiss lock
  useEffect(() => {
    const handleGlobalClick = () => {
      closeLocks();
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  return (`;

const startIdx = content.indexOf(startTarget);
if (startIdx === -1) {
  console.error("Start target not found!");
  process.exit(1);
}
content = content.replace(startTarget, startReplacement);

// Replacement 3: Styling
const styleTarget = `body.morphed.dark.focus-mode li.popup-parent{background:rgba(27,30,54,.95);box-shadow:0 8px 32px rgba(139,123,255,.25);}
body.morphed.dark .theme-btn-pill{background:rgba(27,30,54,.92);color:#ffd770;border:1px solid rgba(255,255,255,.12);}
body.morphed.dark ::selection{background:rgba(139,123,255,.4);color:#fff;}
/* keep résumé content above the glow layer (container is z-index:1 by default; buttons stay at 1000) */
body.morphed.dark .resume-container{z-index:1;}
@media print{
.mode-toggle-container,.theme-btn-pill,.stats-bar,.tech-tags,.skill-bars,.hover-popup,.morphed-only{display:none!important}
body,.resume-container{background:#fff!important;box-shadow:none!important;border-radius:0!important;margin:0!important;max-width:100%!important;padding:0.5in!important}
}`;

const styleReplacement = `body.morphed.dark.focus-mode li.popup-parent{background:rgba(27,30,54,.95);box-shadow:0 8px 32px rgba(139,123,255,.25);}
body.morphed.dark .theme-btn-pill{background:rgba(27,30,54,.92);color:#ffd770;border:1px solid rgba(255,255,255,.12);}
body.morphed.dark ::selection{background:rgba(139,123,255,.4);color:#fff;}
/* keep résumé content above the glow layer (container is z-index:1 by default; buttons stay at 1000) */
body.morphed.dark .resume-container{z-index:1;}
/* Sidebar Drawer Overlay */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(4, 5, 10, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 1999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}
/* Sidebar Drawer */
.drawer-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 95vw;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-left: 1px solid rgba(99, 102, 241, 0.12);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.08);
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s, border-color 0.3s;
}
body.morphed.dark .drawer-panel {
  background: rgba(15, 18, 36, 0.88);
  border-left-color: rgba(255, 255, 255, 0.08);
  box-shadow: -10px 0 50px rgba(0, 0, 0, 0.3);
}
.drawer-panel.visible {
  transform: translateX(0);
}
.drawer-header {
  padding: 24px 28px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
body.morphed.dark .drawer-header {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}
.drawer-close-btn {
  background: transparent;
  border: none;
  color: var(--text-light);
  font-size: 20px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.drawer-close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text);
}
body.morphed.dark .drawer-close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.drawer-meta-badge {
  font-size: 7.5pt;
  background: var(--accent-soft);
  color: var(--accent);
  padding: 4px 10px;
  border-radius: 9999px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.drawer-body {
  padding: 24px 28px;
  flex: 1;
  overflow-y: auto;
}
.drawer-title {
  font-size: 11.5pt;
  font-weight: 700;
  line-height: 1.5;
  color: var(--text);
  margin-bottom: 20px;
}
body.morphed.dark .drawer-title {
  color: #fff;
}
.drawer-title strong {
  color: var(--accent);
}
/* Premium Tab Switcher */
.drawer-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px;
  border-radius: 12px;
  margin-bottom: 24px;
}
body.morphed.dark .drawer-tabs {
  background: rgba(255, 255, 255, 0.04);
}
.drawer-tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 12px;
  font-size: 9pt;
  font-weight: 600;
  color: var(--text-light);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}
.drawer-tab-btn.active {
  background: #fff;
  color: var(--text);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
body.morphed.dark .drawer-tab-btn.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
/* Content Cards */
.drawer-card {
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(99, 102, 241, 0.08);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}
body.morphed.dark .drawer-card {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}
.drawer-card-title {
  font-weight: 700;
  font-size: 9.5pt;
  color: var(--accent);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.drawer-card-text {
  font-size: 10pt;
  line-height: 1.6;
  color: var(--text-light);
}
body.morphed.dark .drawer-card-text {
  color: #cbd5e1;
}
.popup-rich-container {
  padding: 4px 0;
  text-align: left;
}
.popup-rich-title {
  font-weight: 700;
  font-size: 10pt;
  margin: 10px 0 6px;
  color: var(--accent);
  border-bottom: 1px solid rgba(99,102,241,0.15);
  padding-bottom: 4px;
}
body.morphed.dark .popup-rich-title {
  border-bottom-color: rgba(255,255,255,0.15);
}
.popup-section {
  margin-bottom: 12px;
  font-size: 9.5pt;
  line-height: 1.6;
  color: var(--text-light);
}
body.focus-mode li.popup-parent .popup-section {
  color: var(--text);
}
body.morphed.dark .popup-section {
  color: var(--text-light);
}
.popup-qna-details {
  background: rgba(99,102,241,0.03);
  border: 1px solid rgba(99,102,241,0.08);
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
  transition: all 0.3s;
}
body.morphed.dark .popup-qna-details {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}
.popup-qna-details[open] {
  border-color: var(--accent);
  background: rgba(99,102,241,0.06);
}
.popup-qna-summary {
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  font-size: 9pt;
  color: var(--text);
  outline: none;
}
body.morphed.dark .popup-qna-summary {
  color: #fff;
}
.popup-qna-summary::-webkit-details-marker {
  display: none;
}
.popup-qna-summary::before {
  content: '❓ ';
  margin-right: 4px;
}
.popup-qna-content {
  padding: 8px 12px;
  border-top: 1px solid rgba(99,102,241,0.08);
  font-size: 9pt;
  color: var(--text-light);
  line-height: 1.5;
  background: var(--paper);
}
body.morphed.dark .popup-qna-content {
  border-top-color: rgba(255,255,255,0.06);
  color: var(--text-light);
}
@media print{
.mode-toggle-container,.theme-btn-pill,.stats-bar,.tech-tags,.skill-bars,.hover-popup,.morphed-only{display:none!important}
body,.resume-container{background:#fff!important;box-shadow:none!important;border-radius:0!important;margin:0!important;max-width:100%!important;padding:0.5in!important}
}`;
if (!content.includes(styleTarget)) {
  console.error("Style target not found!");
  process.exit(1);
}
content = content.replace(styleTarget, styleReplacement);

// Replacement 4: MS map
const msMapPattern = `                  <ul>
                    {[
                      {
                        index: "ms-1",`;
const msMapEndPattern = `                        {/* Interactive Popup inside li */}
                        {morphed && (hoveredIndex === bullet.index || lockedIndex === bullet.index) && (
                          <div 
                            className={\`hover-popup \${
                              hoveredIndex === bullet.index ? 'visible' : ''
                            } \${
                              lockedIndex === bullet.index ? 'visible locked' : ''
                            }\`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bullet.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>`;

const msMapIdx = content.indexOf(msMapPattern);
const msMapEndIdx = content.indexOf(msMapEndPattern, msMapIdx);
if (msMapIdx === -1 || msMapEndIdx === -1) {
  console.error("MS map pattern not found!");
  process.exit(1);
}

const msReplacement = `                  <ul>
                    {MICROSOFT_BULLETS.map((bullet) => (
                      <li
                        key={bullet.index}
                        className={
                          (lockedIndex === bullet.index ? "popup-parent " : "") +
                          (morphed ? "morphed-li" : "")
                        }
                        onMouseEnter={() => handleItemMouseEnter(bullet.detail, bullet.index)}
                        onMouseLeave={handleItemMouseLeave}
                        onClick={(e) => handleItemClick(bullet, e)}
                      >
                        <strong>{bullet.boldText}</strong>
                        {bullet.plainText}
                        <span className="impact">{bullet.impactText}</span>
                        {bullet.extraText}

                        {/* Interactive Popup inside li on hover only */}
                        {morphed && hoveredIndex === bullet.index && !lockedIndex && (
                          <div 
                            className="hover-popup visible"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bullet.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>`;

// We slice out the entire original array and map call, replacing it with msReplacement
content = content.slice(0, msMapIdx) + msReplacement + content.slice(msMapEndIdx + msMapEndPattern.length);

// Replacement 5: Amazon map
const amzMapPattern = `                  <ul>
                    {[
                      {
                        index: "amz-1",`;
const amzMapEndPattern = `                        {/* Interactive Popup inside li */}
                        {morphed && (hoveredIndex === bullet.index || lockedIndex === bullet.index) && (
                          <div 
                            className={\`hover-popup \${
                              hoveredIndex === bullet.index ? 'visible' : ''
                            } \${
                              lockedIndex === bullet.index ? 'visible locked' : ''
                            }\`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bullet.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>`;

const amzMapIdx = content.indexOf(amzMapPattern);
const amzMapEndIdx = content.indexOf(amzMapEndPattern, amzMapIdx);
if (amzMapIdx === -1 || amzMapEndIdx === -1) {
  console.error("Amazon map pattern not found!");
  process.exit(1);
}

const amzReplacement = `                  <ul>
                    {AMAZON_BULLETS.map((bullet) => (
                      <li
                        key={bullet.index}
                        className={
                          (lockedIndex === bullet.index ? "popup-parent " : "") +
                          (morphed ? "morphed-li" : "")
                        }
                        onMouseEnter={() => handleItemMouseEnter(bullet.detail, bullet.index)}
                        onMouseLeave={handleItemMouseLeave}
                        onClick={(e) => handleItemClick(bullet, e)}
                      >
                        <strong>{bullet.boldText}</strong>
                        {bullet.plainText}
                        <span className="impact">{bullet.impactText}</span>
                        {bullet.extraText}

                        {/* Interactive Popup inside li on hover only */}
                        {morphed && hoveredIndex === bullet.index && !lockedIndex && (
                          <div 
                            className="hover-popup visible"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {bullet.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>`;

content = content.slice(0, amzMapIdx) + amzReplacement + content.slice(amzMapEndIdx + amzMapEndPattern.length);

// Replacement 6: End tag integration
const endTarget = `            </div>
          </div>
      </div>
    </>
  );
}`;

const endReplacement = `            </div>
          </div>
      </div>

      {/* Sidebar Drawer Overlay */}
      <div 
        className={\`drawer-overlay \${lockedBullet ? "visible" : ""}\`}
        onClick={closeLocks}
      />

      {/* Sidebar Drawer Panel */}
      <div 
        className={\`drawer-panel \${lockedBullet ? "visible" : ""}\`}
        onClick={(e) => e.stopPropagation()}
      >
        {lockedBullet && (
          <>
            <div className="drawer-header">
              <span className="drawer-meta-badge">
                {lockedBullet.index.startsWith("ms") ? "Microsoft Purview" : "Amazon Operations"}
              </span>
              <button className="drawer-close-btn" onClick={closeLocks}>✕</button>
            </div>
            
            <div className="drawer-body">
              <div className="drawer-title">
                <strong>{lockedBullet.boldText}</strong>
                {lockedBullet.plainText}
                {lockedBullet.impactText && <span className="impact">{lockedBullet.impactText}</span>}
                {lockedBullet.extraText}
              </div>

              {/* Tab Switcher if ELI5 or Q&A exists */}
              {(lockedBullet.eli5 || (lockedBullet.qnas && lockedBullet.qnas.length > 0)) && (
                <div className="drawer-tabs">
                  <button 
                    className={\`drawer-tab-btn \${activeTab === "technical" ? "active" : ""}\`}
                    onClick={() => setActiveTab("technical")}
                  >
                    🛠️ Tech Deep Dive
                  </button>
                  {lockedBullet.eli5 && (
                    <button 
                      className={\`drawer-tab-btn \${activeTab === "eli5" ? "active" : ""}\`}
                      onClick={() => setActiveTab("eli5")}
                    >
                      🧒 ELI5
                    </button>
                  )}
                  {lockedBullet.qnas && lockedBullet.qnas.length > 0 && (
                    <button 
                      className={\`drawer-tab-btn \${activeTab === "qna" ? "active" : ""}\`}
                      onClick={() => setActiveTab("qna")}
                    >
                      💬 Interview Q&A
                    </button>
                  )}
                </div>
              )}

              {/* Tab Content */}
              <div className="drawer-tab-content">
                {activeTab === "technical" && (
                  <>
                    <div className="drawer-card" style={{ marginBottom: "20px" }}>
                      <div className="drawer-card-title" style={{ marginBottom: "12px" }}>Interactive Storyboard</div>
                      <BulletStoryteller index={lockedBullet.index} />
                    </div>

                    <div className="drawer-card">
                      <div className="drawer-card-title">Technical Deep Dive</div>
                      <div className="drawer-card-text">{lockedBullet.detail}</div>
                      
                      {lockedBullet.analogy && (
                        <div className="drawer-card" style={{ marginTop: "16px", background: "rgba(99, 102, 241, 0.01)", borderStyle: "dashed" }}>
                          <div className="drawer-card-title" style={{ fontSize: "8.5pt", color: "var(--accent2)" }}>🎯 Analogy</div>
                          <div className="drawer-card-text" style={{ fontSize: "9.5pt", fontStyle: "italic" }}>
                            {lockedBullet.analogy}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeTab === "eli5" && lockedBullet.eli5 && (
                  <div className="drawer-card">
                    <div className="drawer-card-title">Plain English Explanation (ELI5)</div>
                    <div className="drawer-card-text" style={{ fontStyle: "italic" }}>
                      "\${lockedBullet.eli5}"
                    </div>
                    
                    {lockedBullet.analogy && (
                      <div className="drawer-card" style={{ marginTop: "16px", background: "rgba(99, 102, 241, 0.01)", borderStyle: "dashed" }}>
                        <div className="drawer-card-title" style={{ fontSize: "8.5pt", color: "var(--accent2)" }}>🎯 Concept Analogy</div>
                        <div className="drawer-card-text" style={{ fontSize: "9.5pt" }}>
                          {lockedBullet.analogy}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "qna" && lockedBullet.qnas && lockedBullet.qnas.length > 0 && (
                  <div>
                    {lockedBullet.qnas.map((qna, idx) => (
                      <details key={idx} className="popup-qna-details" open={idx === 0}>
                        <summary className="popup-qna-summary">{qna.q}</summary>
                        <div className="popup-qna-content">{qna.a}</div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}`;

if (!content.includes(endTarget)) {
  console.error("End target not found!");
  process.exit(1);
}
content = content.replace(endTarget, endReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched Resume.tsx!");
