import { describe, expect, it } from "vitest";
import {
  createSimulation,
  leavePointer,
  MAX_DT,
  movePointer,
  resizeSimulation,
  stepSimulation,
  type CreatureSimulation,
} from "../../src/components/ambient/creatures";

function seededRandom(initialSeed = 21) {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function field() {
  return createSimulation(800, 600, 20, seededRandom());
}
function advance(sim: CreatureSimulation, seconds: number, dt = 1 / 60) {
  for (let i = 0; i < Math.round(seconds / dt); i++) stepSimulation(sim, dt);
}
const distance = (c: { x: number; y: number }, x: number, y: number) =>
  Math.hypot(c.x - x, c.y - y);

describe("ambient creature steering", () => {
  it("accelerates away from a moving pointer", () => {
    const sim = field();
    const control = field();
    const c = sim.creatures[0];
    const x = c.x - 20;
    const y = c.y;
    const before = distance(c, x, y);
    for (let i = 0; i < 20; i++) {
      movePointer(sim, x + i * 0.6, y);
      stepSimulation(sim, 1 / 60);
      stepSimulation(control, 1 / 60);
    }
    expect(distance(c, x, y)).toBeGreaterThan(before + 10);
    expect(distance(c, x, y)).toBeGreaterThan(distance(control.creatures[0], x, y) + 10);
  });

  it.each([1 / 30, 1 / 60, 1 / 120])(
    "lands one to three neighbours at a still tip at dt=%s",
    (dt) => {
      const sim = field();
      movePointer(sim, 400, 300);
      advance(sim, 0.65, dt);
      expect(sim.creatures.filter((c) => c.slot >= 0)).toHaveLength(0);
      advance(sim, 4, dt);
      const residents = sim.creatures.filter((c) => c.settled);
      expect(residents.length).toBeGreaterThanOrEqual(1);
      expect(residents.length).toBeLessThanOrEqual(3);
      for (const c of residents) expect(distance(c, 400, 300)).toBeLessThan(12);
    }
  );

  it("startles settled creatures when the cursor moves again, even with a large jump", () => {
    const sim = field();
    movePointer(sim, 400, 300);
    advance(sim, 5);
    const residents = sim.creatures.filter((c) => c.settled);
    expect(residents.length).toBeGreaterThan(0);
    movePointer(sim, 700, 500);
    advance(sim, 0.5);
    for (const c of residents) {
      expect(c.settled).toBe(false);
      expect(c.slot).toBe(-1);
      expect(distance(c, 400, 300)).toBeGreaterThan(35);
    }
  });

  it("brings at least one nearby butterfly to rest during a three-second pause", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const sim = createSimulation(1440, 900, 10, seededRandom(seed));
      movePointer(sim, 900, 440);
      advance(sim, 3);
      expect(sim.creatures.some((c) => c.settled)).toBe(true);
    }
  });

  it("disallows landing after window leave and touch", () => {
    const sim = field();
    movePointer(sim, 400, 300);
    advance(sim, 5);
    leavePointer(sim);
    advance(sim, 3);
    expect(sim.creatures.every((c) => c.slot === -1 && !c.settled)).toBe(true);
    movePointer(sim, 400, 300, false);
    advance(sim, 5);
    expect(sim.creatures.every((c) => c.slot === -1 && !c.settled)).toBe(true);
  });

  it("stays inside soft bounds through wandering, corner arrivals and resizing", () => {
    const sim = field();
    // Every creature is checked after every step; the first escape is reported with its context.
    let escape: string | null = null;
    for (let i = 0; i < 3600 && !escape; i++) {
      if (i % 300 === 0) movePointer(sim, i % 600 === 0 ? 0 : sim.width, 0);
      if (i === 1800) resizeSimulation(sim, 390, 844);
      stepSimulation(sim, 1 / 30);
      for (const c of sim.creatures) {
        if (!(c.x >= 0 && c.x <= sim.width && c.y >= 0 && c.y <= sim.height)) {
          escape = `step ${i}: (${c.x}, ${c.y}) outside ${sim.width}x${sim.height}`;
          break;
        }
      }
    }
    expect(escape).toBeNull();
  });

  it("clamps stalls and ignores negative or non-finite deltas", () => {
    const sim = field();
    const control = field();
    stepSimulation(sim, 10);
    stepSimulation(control, MAX_DT);
    expect(sim).toEqual(control);
    for (const invalid of [-1, NaN, Infinity, 0]) stepSimulation(sim, invalid);
    expect(sim).toEqual(control);
  });

  it("keeps trajectories comparable at 30 and 120 Hz", () => {
    const slow = field();
    const fast = field();
    advance(slow, 6, 1 / 30);
    advance(fast, 6, 1 / 120);
    for (let i = 0; i < slow.count; i++) {
      expect(distance(slow.creatures[i], fast.creatures[i].x, fast.creatures[i].y)).toBeLessThan(4);
    }
  });
});
