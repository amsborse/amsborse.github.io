import { describe, expect, it } from "vitest";
import {
  PLATE_FOCUS,
  PLATE_H,
  PLATE_MODULES,
  PLATE_SPHERE,
  PLATE_W,
  edgeCurve,
  fitPlate,
} from "@/components/hero/plateMap";
import { SERVICES } from "@/components/hero/topology";

describe("hero plate map", () => {
  it("places every service inside the plate", () => {
    for (const service of SERVICES) {
      const point = PLATE_MODULES[service.id];
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(PLATE_W);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(PLATE_H);
    }
  });

  it("covers a desktop viewport and keeps the focus rect on screen", () => {
    const fit = fitPlate(1440, 900);
    expect(fit.scale).toBeCloseTo(900 / PLATE_H, 3);
    expect(PLATE_W * fit.scale + fit.x).toBeGreaterThanOrEqual(1440 - 0.5);
    expect(fit.x + PLATE_FOCUS.x1 * fit.scale).toBeLessThanOrEqual(1440 + 0.5);
    expect(fit.y).toBe(0);
  });

  it("shrinks below cover on a narrow band so the whole sculpture fits", () => {
    const fit = fitPlate(390, 600);
    const cover = Math.max(390 / PLATE_W, 600 / PLATE_H);
    expect(fit.scale).toBeLessThan(cover);
    expect(fit.x + PLATE_FOCUS.x0 * fit.scale).toBeGreaterThanOrEqual(-0.5);
    expect(fit.x + PLATE_FOCUS.x1 * fit.scale).toBeLessThanOrEqual(390.5);
    expect(fit.y + PLATE_FOCUS.y0 * fit.scale).toBeGreaterThanOrEqual(-0.5);
    expect(fit.y + PLATE_FOCUS.y1 * fit.scale).toBeLessThanOrEqual(600.5);
  });

  it("returns a zero fit for an empty container", () => {
    expect(fitPlate(0, 400)).toEqual({ scale: 0, x: 0, y: 0 });
  });

  it("bows route curves away from the core", () => {
    const { a, b, c } = edgeCurve("gateway", "inference");
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const dist = (p: { x: number; y: number }) =>
      Math.hypot(p.x - PLATE_SPHERE.x, p.y - PLATE_SPHERE.y);
    expect(dist(c)).toBeGreaterThan(dist(mid));
  });
});
