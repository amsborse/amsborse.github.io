import { describe, expect, it } from "vitest";
import {
  IDENTITY_POSE,
  cameraTarget,
  poseSettled,
  springStep,
  stageTransform,
} from "@/components/hero/plateCamera";
import {
  PLATE_H,
  PLATE_MODULES,
  PLATE_SPHERE,
  PLATE_W,
  fitPlate,
} from "@/components/hero/plateMap";

const rest = { pointer: { x: 0, y: 0 }, focus: null, packet: null, scroll: 0 };

describe("hero plate camera", () => {
  it("holds the fitted composition at rest", () => {
    expect(cameraTarget(rest, { scale: 1 })).toEqual({ x: -0, y: -0, scale: 1 });
    const fit = fitPlate(1440, 900);
    const t = stageTransform(fit, { width: 1440, height: 900 }, IDENTITY_POSE);
    expect(t.x).toBeCloseTo(fit.x, 6);
    expect(t.y).toBeCloseTo(fit.y, 6);
    expect(t.scale).toBe(1);
  });

  it("keeps pointer parallax small and against the pointer", () => {
    const pose = cameraTarget({ ...rest, pointer: { x: 1, y: 1 } }, { scale: 1 });
    expect(pose.x).toBeLessThan(0);
    expect(pose.y).toBeLessThan(0);
    expect(Math.abs(pose.x)).toBeLessThanOrEqual(12);
    expect(Math.abs(pose.y)).toBeLessThanOrEqual(12);
    // Out-of-range pointer values cannot throw the camera further.
    expect(cameraTarget({ ...rest, pointer: { x: 9, y: 9 } }, { scale: 1 })).toEqual(pose);
  });

  it("draws the frame toward a selected module and zooms in a little", () => {
    const module = PLATE_MODULES.inference;
    const pose = cameraTarget({ ...rest, focus: module }, { scale: 1 });
    expect(Math.sign(pose.x)).toBe(Math.sign(PLATE_SPHERE.x - module.x));
    expect(pose.scale).toBeGreaterThan(1);
    expect(pose.scale).toBeLessThan(1.06);
    // A selected module outweighs the request packet.
    const both = cameraTarget(
      { ...rest, focus: module, packet: PLATE_MODULES.gateway },
      { scale: 1 }
    );
    expect(both).toEqual(pose);
    const packetOnly = cameraTarget({ ...rest, packet: module }, { scale: 1 });
    expect(Math.abs(packetOnly.x)).toBeLessThan(Math.abs(pose.x));
  });

  it("pushes in gradually as the hero scrolls away", () => {
    const half = cameraTarget({ ...rest, scroll: 0.5 }, { scale: 1 });
    const full = cameraTarget({ ...rest, scroll: 1 }, { scale: 1 });
    expect(half.scale).toBeGreaterThan(1);
    expect(full.scale).toBeGreaterThan(half.scale);
    expect(cameraTarget({ ...rest, scroll: 4 }, { scale: 1 })).toEqual(full);
  });

  it("springs to the target without overshoot and settles", () => {
    let x = 0;
    let v = 0;
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      [x, v] = springStep(x, v, 10, 5.5, 1 / 60);
      peak = Math.max(peak, x);
    }
    expect(peak).toBeLessThanOrEqual(10 + 1e-9);
    expect(x).toBeCloseTo(10, 2);
    expect(
      poseSettled({ x, y: 0, scale: 1 }, { x: 10, y: 0, scale: 1 }, { x: v, y: 0, scale: 0 })
    ).toBe(true);
    // A long frame does not explode the step.
    const [big] = springStep(0, 0, 10, 5.5, 1);
    expect(big).toBeGreaterThan(0);
    expect(big).toBeLessThanOrEqual(10);
  });

  it("never pans the plate off an edge it covered", () => {
    for (const [w, h] of [
      [1440, 900],
      [1024, 768],
      [390, 360],
    ]) {
      const fit = fitPlate(w, h);
      const t = stageTransform(fit, { width: w, height: h }, { x: 400, y: 400, scale: 1.03 });
      const left = t.x;
      const right = t.x + PLATE_W * fit.scale * t.scale;
      const bottom = t.y + PLATE_H * fit.scale * t.scale;
      if (fit.x <= 0) expect(left).toBeLessThanOrEqual(1e-6);
      if (fit.x + PLATE_W * fit.scale >= w) expect(right).toBeGreaterThanOrEqual(w - 1e-6);
      if (fit.y + PLATE_H * fit.scale >= h) expect(bottom).toBeGreaterThanOrEqual(h - 1e-6);
      const t2 = stageTransform(fit, { width: w, height: h }, { x: -400, y: -400, scale: 1.03 });
      if (fit.x + PLATE_W * fit.scale >= w)
        expect(t2.x + PLATE_W * fit.scale * t2.scale).toBeGreaterThanOrEqual(w - 1e-6);
      if (fit.y <= 0) expect(t2.y).toBeLessThanOrEqual(1e-6);
    }
  });
});
