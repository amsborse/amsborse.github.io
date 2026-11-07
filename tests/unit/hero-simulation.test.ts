import { describe, expect, it } from "vitest";
import {
  HOP_SEC,
  RECOVERY_SEC,
  describeState,
  dimmedEdges,
  heroReducer,
  initialHeroState,
  planRoute,
  routeDuration,
  sampleRoute,
} from "@/components/hero/simulation";
import { EDGES, SERVICES, dependenciesOf } from "@/components/hero/topology";

const ids = (route: ReturnType<typeof planRoute>) =>
  route.hops.map((h) => (h.status === "blocked" ? `x:${h.edgeId}` : h.edgeId));

describe("hero topology", () => {
  it("has 7 services and every edge connects known services", () => {
    expect(SERVICES).toHaveLength(7);
    const known = new Set(SERVICES.map((s) => s.id));
    for (const edge of EDGES) {
      expect(known.has(edge.from) && known.has(edge.to)).toBe(true);
    }
  });

  it("reports real upstream and downstream dependencies", () => {
    const deps = dependenciesOf("orchestrator");
    expect(deps.upstream.sort()).toEqual(["inference", "ingest"]);
    expect(deps.downstream.sort()).toEqual(["gateway", "inference", "observability", "storage"]);
  });
});

describe("planRoute", () => {
  it("uses the primary path when healthy", () => {
    const route = planRoute(null);
    expect(route.outcome).toBe("ok");
    expect(route.hops.every((h) => h.status === "ok")).toBe(true);
    expect(route.hops[0].edgeId).toBe("gateway>policy");
    expect(route.hops.at(-1)?.edgeId).toBe("orchestrator>gateway");
  });

  it("reroutes around ingest through direct dispatch", () => {
    const route = planRoute("ingest");
    expect(route.outcome).toBe("rerouted");
    expect(ids(route)).toEqual([
      "gateway>policy",
      "x:policy>ingest",
      "policy>orchestrator",
      "orchestrator>inference",
      "inference>orchestrator",
      "orchestrator>storage",
      "orchestrator>gateway",
    ]);
  });

  it("serves a degraded cached answer when inference is down", () => {
    const route = planRoute("inference");
    expect(route.outcome).toBe("degraded");
    expect(ids(route)).toContain("x:orchestrator>inference");
    expect(ids(route)).toContain("storage>orchestrator");
    expect(ids(route)).not.toContain("inference>orchestrator");
  });

  it("parks writes in the log when storage is down and still responds", () => {
    const route = planRoute("storage");
    expect(route.outcome).toBe("rerouted");
    expect(ids(route).slice(-3)).toEqual([
      "x:orchestrator>storage",
      "orchestrator>ingest",
      "orchestrator>gateway",
    ]);
  });

  it("fails closed when policy is down: no bypass", () => {
    const route = planRoute("policy");
    expect(route.outcome).toBe("rejected");
    expect(ids(route)).toEqual(["x:gateway>policy"]);
  });

  it("is unavailable without an alternate path", () => {
    expect(planRoute("orchestrator").outcome).toBe("unavailable");
    expect(planRoute("gateway")).toEqual({ hops: [], outcome: "unavailable", failed: "gateway" });
  });

  it("keeps requests flowing when observability is down", () => {
    const route = planRoute("observability");
    expect(route.outcome).toBe("ok");
    expect(route.hops).toEqual(planRoute(null).hops);
    expect([...dimmedEdges("observability")].every((id) => id.endsWith(">observability"))).toBe(
      true
    );
  });
});

describe("sampleRoute", () => {
  it("is deterministic and walks hops in order", () => {
    const route = planRoute(null);
    expect(sampleRoute(route, 0)?.edgeId).toBe("gateway>policy");
    expect(sampleRoute(route, HOP_SEC * 1.5)).toEqual(sampleRoute(route, HOP_SEC * 1.5));
    expect(sampleRoute(route, HOP_SEC * 1.5)?.hopIndex).toBe(1);
    expect(sampleRoute(route, routeDuration(route) + 0.01)).toBeNull();
  });

  it("stops blocked packets halfway", () => {
    const route = planRoute("policy");
    expect(sampleRoute(route, 0.94)?.progress).toBeLessThanOrEqual(0.5);
  });
});

describe("heroReducer", () => {
  it("runs request -> idle on the system clock", () => {
    let s = heroReducer(initialHeroState, { type: "sendRequest", now: 10 });
    expect(s.mode).toBe("request");
    s = heroReducer(s, { type: "tick", now: 10 + routeDuration(s.route!) + 0.01 });
    expect(s.mode).toBe("idle");
  });

  it("runs failure -> recovering -> idle and restores the primary path", () => {
    let s = heroReducer(initialHeroState, { type: "fail", id: "inference", now: 0 });
    expect(s.mode).toBe("failure");
    expect(describeState(s)).toMatch(/degraded/);
    s = heroReducer(s, { type: "sendRequest", now: 1 });
    expect(s.route?.outcome).toBe("degraded");
    s = heroReducer(s, { type: "recover", now: 2 });
    expect(s.mode).toBe("recovering");
    expect(s.failed).toBeNull();
    s = heroReducer(s, { type: "tick", now: 2 + RECOVERY_SEC });
    expect(s.mode).toBe("idle");
    expect(heroReducer(s, { type: "sendRequest", now: 9 }).route?.outcome).toBe("ok");
  });
});
