/**
 * Hero sculpture topology: the small distributed system the hero simulates.
 *
 * This is an illustrative reference architecture for an AI request pipeline,
 * not a depiction of any employer's system. Every node, edge and orbit in the
 * 3D scene is derived from this file, so the visuals never invent connections.
 */

export type ServiceId =
  "gateway" | "policy" | "ingest" | "orchestrator" | "inference" | "storage" | "observability";

export type OrbitId = "ingestion" | "processing" | "persistence";

export interface Orbit {
  id: OrbitId;
  label: string;
  /** What the ring means, shown in the info panel. */
  meaning: string;
  /** Full turn duration in seconds (reference timeline: 20–40 s). */
  periodSec: number;
  /** Ring tilt in radians [x, z]; scene uses these so geometry and data stay in sync. */
  tilt: readonly [number, number];
  radius: number;
}

export interface Service {
  id: ServiceId;
  name: string;
  orbit: OrbitId;
  /** Fixed angular slot on its orbit, radians. Deterministic layout. */
  angle: number;
  responsibility: string;
  inputs: string[];
  outputs: string[];
  concept: { name: string; detail: string };
  /** What happens to traffic when this service fails, in plain language. */
  onFailure: string;
  /** Fail closed: with no alternate path, requests are refused rather than left hanging. */
  failClosed?: boolean;
}

export type EdgeKind = "request" | "response" | "telemetry" | "fallback";

export interface Edge {
  id: string;
  from: ServiceId;
  to: ServiceId;
  kind: EdgeKind;
  label: string;
  /** Fallback edges only: the failed service this edge routes around. */
  replaces?: ServiceId;
  /** Fallback edges only: the answer is served, but with reduced quality. */
  degraded?: boolean;
}

export const ORBITS: readonly Orbit[] = [
  {
    id: "ingestion",
    label: "Ingestion & event flow",
    meaning: "Requests and events entering the system, authenticated and made durable.",
    periodSec: 26,
    tilt: [0.32, -0.18],
    radius: 2.35,
  },
  {
    id: "processing",
    label: "Processing & orchestration",
    meaning: "Work is planned, routed to models and agents, and assembled into a result.",
    periodSec: 34,
    tilt: [-0.22, 0.42],
    radius: 1.85,
  },
  {
    id: "persistence",
    label: "Persistence & feedback",
    meaning: "Results are stored and every hop reports signals back for observation.",
    periodSec: 40,
    tilt: [1.18, 0.12],
    radius: 2.05,
  },
];

export const SERVICES: readonly Service[] = [
  {
    id: "gateway",
    name: "API Gateway",
    orbit: "ingestion",
    angle: 0.35,
    responsibility: "Single front door: terminates TLS, authenticates callers and shapes traffic.",
    inputs: ["Client requests"],
    outputs: ["Authorized requests", "Responses to clients"],
    concept: {
      name: "Rate limiting & load shedding",
      detail: "Rejecting excess load early keeps the rest of the system inside its capacity.",
    },
    onFailure: "No other entry point exists, so new requests cannot get in until it recovers.",
  },
  {
    id: "policy",
    name: "Policy Enforcement",
    orbit: "ingestion",
    angle: 2.45,
    responsibility: "Checks every request against access and safety policy before work starts.",
    inputs: ["Authorized requests"],
    outputs: ["Allow / deny decisions"],
    concept: {
      name: "Fail closed",
      detail:
        "If policy cannot be evaluated, the safe answer is no. Requests are refused, not waved through.",
    },
    onFailure: "Requests are refused on purpose. Skipping the policy check would be unsafe.",
    failClosed: true,
  },
  {
    id: "ingest",
    name: "Event Ingestion",
    orbit: "ingestion",
    angle: 4.4,
    responsibility: "Appends accepted work to a durable log so nothing is lost under load.",
    inputs: ["Allowed requests", "Deferred writes"],
    outputs: ["Ordered events"],
    concept: {
      name: "Durable queue & backpressure",
      detail: "A log absorbs bursts and lets consumers catch up at their own pace.",
    },
    onFailure:
      "The gateway hands work straight to the orchestrator: slower and unbuffered, but still served.",
  },
  {
    id: "orchestrator",
    name: "Agent Orchestrator",
    orbit: "processing",
    angle: 1.2,
    responsibility: "Plans each task, calls models and tools, and assembles the result.",
    inputs: ["Ordered events", "Model outputs", "Cached results"],
    outputs: ["Inference calls", "Results", "Responses"],
    concept: {
      name: "Idempotent retries",
      detail: "Each step carries an id, so retrying after a timeout never does the work twice.",
    },
    onFailure: "Nothing else can plan the work. The gateway answers 503 with a retry hint.",
  },
  {
    id: "inference",
    name: "Model Inference",
    orbit: "processing",
    angle: 3.9,
    responsibility: "Runs model calls with batching, timeouts and per-tenant quotas.",
    inputs: ["Inference calls"],
    outputs: ["Model outputs"],
    concept: {
      name: "Timeouts & graceful degradation",
      detail: "A bounded wait plus a cached fallback beats an unbounded wait for a perfect answer.",
    },
    onFailure:
      "The orchestrator serves the last good cached result from storage, marked as degraded.",
  },
  {
    id: "storage",
    name: "Data Storage",
    orbit: "persistence",
    angle: 0.8,
    responsibility: "Persists results and serves cached answers for repeat questions.",
    inputs: ["Results"],
    outputs: ["Cached results", "Write acknowledgements"],
    concept: {
      name: "Replication & write-ahead logs",
      detail: "A write counts once it is durable, so a crash cannot lose acknowledged data.",
    },
    onFailure: "Writes are parked in the event log and replayed later. Responses still go out.",
  },
  {
    id: "observability",
    name: "Observability",
    orbit: "persistence",
    angle: 3.6,
    responsibility: "Collects traces, metrics and logs from every hop to find faults fast.",
    inputs: ["Telemetry from every service"],
    outputs: ["Alerts", "Traces", "SLO burn rates"],
    concept: {
      name: "Off the critical path",
      detail: "Telemetry is best-effort, so losing it must never slow or block a request.",
    },
    onFailure:
      "Requests are unaffected. Only visibility is lost, which is why it sits off the request path.",
  },
];

const e = (
  from: ServiceId,
  to: ServiceId,
  kind: EdgeKind,
  label: string,
  extra: Pick<Edge, "replaces" | "degraded"> = {}
): Edge => ({ id: `${from}>${to}`, from, to, kind, label, ...extra });

export const EDGES: readonly Edge[] = [
  e("gateway", "policy", "request", "Authorize"),
  e("policy", "ingest", "request", "Admit"),
  e("ingest", "orchestrator", "request", "Consume event"),
  e("orchestrator", "inference", "request", "Model call"),
  e("inference", "orchestrator", "response", "Model output"),
  e("orchestrator", "storage", "request", "Persist result"),
  e("orchestrator", "gateway", "response", "Respond"),
  // Alternate paths that exist only for recovery.
  e("policy", "orchestrator", "fallback", "Direct dispatch (ingest down)", { replaces: "ingest" }),
  e("storage", "orchestrator", "fallback", "Cached result (inference down)", {
    replaces: "inference",
    degraded: true,
  }),
  e("orchestrator", "ingest", "fallback", "Park write (storage down)", { replaces: "storage" }),
  // Telemetry: every service reports to observability; never on the request path.
  e("gateway", "observability", "telemetry", "Traces"),
  e("orchestrator", "observability", "telemetry", "Traces"),
  e("inference", "observability", "telemetry", "Latency"),
  e("storage", "observability", "telemetry", "Metrics"),
];

export const serviceById = (id: ServiceId): Service => {
  const service = SERVICES.find((s) => s.id === id);
  if (!service) throw new Error(`Unknown service ${id}`);
  return service;
};

export const edgeById = (id: string): Edge => {
  const edge = EDGES.find((candidate) => candidate.id === id);
  if (!edge) throw new Error(`Unknown edge ${id}`);
  return edge;
};

/** Upstream and downstream neighbours, used for hover dependency highlights. */
export function dependenciesOf(id: ServiceId): { upstream: ServiceId[]; downstream: ServiceId[] } {
  const upstream = new Set<ServiceId>();
  const downstream = new Set<ServiceId>();
  for (const edge of EDGES) {
    if (edge.kind === "fallback") continue;
    if (edge.to === id) upstream.add(edge.from);
    if (edge.from === id) downstream.add(edge.to);
  }
  return { upstream: [...upstream], downstream: [...downstream] };
}

/** The healthy request path, in order. Responses return along it. */
export const PRIMARY_PATH: readonly string[] = [
  "gateway>policy",
  "policy>ingest",
  "ingest>orchestrator",
  "orchestrator>inference",
  "inference>orchestrator",
  "orchestrator>storage",
  "orchestrator>gateway",
];
