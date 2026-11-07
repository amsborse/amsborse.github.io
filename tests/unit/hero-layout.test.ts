import { describe, expect, it } from "vitest";
import { coreNodePosition, servicePosition } from "@/components/hero/layout";
import { ORBITS, SERVICES } from "@/components/hero/topology";

describe("hero visual layout", () => {
  it("places each service at its configured orbit radius", () => {
    for (const service of SERVICES) {
      const orbit = ORBITS.find((candidate) => candidate.id === service.orbit)!;
      const position = servicePosition(service.id);
      expect(Math.hypot(...position)).toBeCloseTo(orbit.radius, 5);
    }
  });

  it("keeps every core node on the requested sphere surface", () => {
    for (const service of SERVICES) {
      expect(Math.hypot(...coreNodePosition(service.id))).toBeCloseTo(0.78, 5);
    }
  });

  it("produces deterministic finite positions for the seven topology nodes", () => {
    const points = SERVICES.map((service) => servicePosition(service.id));
    expect(new Set(points.map((point) => point.join(","))).size).toBe(7);
    expect(points.flat().every(Number.isFinite)).toBe(true);
    expect(SERVICES.map((service) => servicePosition(service.id))).toEqual(points);
  });
});
