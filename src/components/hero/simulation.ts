/**
 * Deterministic hero simulation: request routing, failure and recovery.
 *
 * Pure functions only. Time is always passed in (seconds on the system clock),
 * so screenshots and tests can pin any moment exactly. The 3D scene samples
 * this state every frame; it never decides routing itself.
 */
import { EDGES, PRIMARY_PATH, edgeById, serviceById, type ServiceId } from "./topology";

export type HopStatus = "ok" | "blocked";
export interface Hop {
  edgeId: string;
  status: HopStatus;
}

export type Outcome = "ok" | "rerouted" | "degraded" | "rejected" | "unavailable";

export interface Route {
  hops: Hop[];
  outcome: Outcome;
  failed: ServiceId | null;
}

/** Seconds a healthy hop takes on screen. Reference: data pulse 1–2 s end to end per leg. */
export const HOP_SEC = 0.7;
/** A blocked hop waits out its timeout before the pulse fades. */
export const BLOCKED_HOP_SEC = 0.95;
/** Recovery: the restored service warms up before traffic returns to it. */
export const RECOVERY_SEC = 2.4;

/**
 * Walk the primary path. When the next service is down, mark that hop blocked
 * and use a fallback edge that the topology defines for it. With no fallback
 * the request stops there: refused if the service fails closed, otherwise
 * unavailable.
 */
export function planRoute(failed: ServiceId | null): Route {
  const first = edgeById(PRIMARY_PATH[0]);
  if (failed === first.from) return { hops: [], outcome: "unavailable", failed };

  const hops: Hop[] = [];
  let outcome: Outcome = "ok";
  for (const edgeId of PRIMARY_PATH) {
    const edge = edgeById(edgeId);
    if (failed !== null && edge.from === failed) continue; // already routed around
    if (failed !== null && edge.to === failed) {
      hops.push({ edgeId, status: "blocked" });
      const fallbacks = EDGES.filter((c) => c.kind === "fallback" && c.replaces === failed);
      if (fallbacks.length === 0) {
        return {
          hops,
          outcome: serviceById(failed).failClosed ? "rejected" : "unavailable",
          failed,
        };
      }
      for (const fb of fallbacks) hops.push({ edgeId: fb.id, status: "ok" });
      outcome = fallbacks.some((fb) => fb.degraded) ? "degraded" : "rerouted";
      continue;
    }
    hops.push({ edgeId, status: "ok" });
  }
  return { hops, outcome, failed };
}

export const hopDuration = (hop: Hop) => (hop.status === "blocked" ? BLOCKED_HOP_SEC : HOP_SEC);

export const routeDuration = (route: Route) =>
  route.hops.reduce((total, hop) => total + hopDuration(hop), 0);

export interface RouteSample {
  hopIndex: number;
  edgeId: string;
  status: HopStatus;
  /** 0..1 along the edge. Blocked hops stop at 0.5 and fade. */
  progress: number;
}

/** Where the packet is `elapsed` seconds after the request started; null once it is done. */
export function sampleRoute(route: Route, elapsed: number): RouteSample | null {
  if (elapsed < 0) return null;
  let start = 0;
  for (let i = 0; i < route.hops.length; i++) {
    const hop = route.hops[i];
    const duration = hopDuration(hop);
    if (elapsed < start + duration) {
      const t = (elapsed - start) / duration;
      // Ease in/out so packets accelerate out of a node and settle into the next.
      const eased = t * t * (3 - 2 * t);
      return {
        hopIndex: i,
        edgeId: hop.edgeId,
        status: hop.status,
        progress: hop.status === "blocked" ? Math.min(eased, 0.5) : eased,
      };
    }
    start += duration;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* State machine                                                       */
/* ------------------------------------------------------------------ */

export type Mode = "idle" | "request" | "failure" | "recovering";

export interface HeroState {
  mode: Mode;
  hovered: ServiceId | null;
  selected: ServiceId | null;
  failed: ServiceId | null;
  /** Service coming back during recovery. */
  recovering: ServiceId | null;
  route: Route | null;
  /** System-clock time the current request or recovery started. */
  startedAt: number | null;
}

export type HeroEvent =
  | { type: "hover"; id: ServiceId | null }
  | { type: "select"; id: ServiceId | null }
  | { type: "sendRequest"; now: number }
  | { type: "fail"; id: ServiceId; now: number }
  | { type: "recover"; now: number }
  | { type: "tick"; now: number };

export const initialHeroState: HeroState = {
  mode: "idle",
  hovered: null,
  selected: null,
  failed: null,
  recovering: null,
  route: null,
  startedAt: null,
};

export function heroReducer(state: HeroState, event: HeroEvent): HeroState {
  switch (event.type) {
    case "hover":
      return state.hovered === event.id ? state : { ...state, hovered: event.id };
    case "select":
      return state.selected === event.id ? state : { ...state, selected: event.id };
    case "sendRequest":
      if (state.mode === "recovering") return state;
      return {
        ...state,
        mode: "request",
        route: planRoute(state.failed),
        startedAt: event.now,
      };
    case "fail":
      return {
        ...state,
        mode: "failure",
        failed: event.id,
        recovering: null,
        selected: event.id,
        // A failure re-plans the next request immediately so the dimmed paths are visible.
        route: planRoute(event.id),
        startedAt: event.now,
      };
    case "recover":
      if (state.failed === null) return state;
      return {
        ...state,
        mode: "recovering",
        recovering: state.failed,
        failed: null,
        route: null,
        startedAt: event.now,
      };
    case "tick": {
      if (state.startedAt === null) return state;
      const elapsed = event.now - state.startedAt;
      if (state.mode === "recovering" && elapsed >= RECOVERY_SEC) {
        return { ...state, mode: "idle", recovering: null, startedAt: null };
      }
      if (state.mode === "request" && state.route && elapsed >= routeDuration(state.route)) {
        return { ...state, mode: state.failed ? "failure" : "idle", startedAt: null };
      }
      return state;
    }
  }
}

const OUTCOME_TEXT: Record<Outcome, string> = {
  ok: "Served on the primary path.",
  rerouted: "Served on an alternate path the topology defines.",
  degraded: "Served from cache: available, but marked as degraded.",
  rejected: "Refused on purpose: the system fails closed.",
  unavailable: "No alternate path exists, so the request cannot be served.",
};

/** One short sentence for the live caption under the controls. */
export function describeState(state: HeroState): string {
  if (state.mode === "recovering" && state.recovering) {
    const name = serviceById(state.recovering).name;
    return `${name} is back. Health checks pass before traffic returns to the original path.`;
  }
  if (state.failed) {
    const service = serviceById(state.failed);
    const route = state.route ?? planRoute(state.failed);
    return `${service.name} is down. ${service.onFailure} ${OUTCOME_TEXT[route.outcome]}`;
  }
  if (state.mode === "request" && state.route) {
    return "A request enters the gateway, passes policy and the event log, is planned by the orchestrator, runs inference, is stored, and the response returns.";
  }
  return "Seven services, three orbits, one request path. Send a request or fail a service to see how it behaves.";
}

/** Edges that are dimmed because a service on either end is down. */
export function dimmedEdges(failed: ServiceId | null): Set<string> {
  const dimmed = new Set<string>();
  if (!failed) return dimmed;
  for (const edge of EDGES) {
    if (edge.kind === "fallback") continue;
    if (edge.from === failed || edge.to === failed) dimmed.add(edge.id);
  }
  return dimmed;
}
