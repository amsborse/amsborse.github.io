/** Pixels and seconds throughout. The mutable simulation allocates only at creation. */
export const MAX_DT = 0.05;
export const STILL_DELAY = 0.7;

export interface Creature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  phase: number;
  depth: number;
  wingPhase: number;
  wingRate: number;
  slot: number;
  settled: boolean;
  fearUntil: number;
  escapeX: number;
  escapeY: number;
}

export interface CreatureSimulation {
  width: number;
  height: number;
  time: number;
  count: number;
  creatures: Creature[];
  pointer: {
    x: number;
    y: number;
    active: boolean;
    canLand: boolean;
    lastMove: number;
    speed: number;
  };
}

export function createSimulation(
  width: number,
  height: number,
  count: number,
  random: () => number = Math.random
): CreatureSimulation {
  return {
    width,
    height,
    time: 0,
    count,
    pointer: { x: 0, y: 0, active: false, canLand: false, lastMove: 0, speed: 0 },
    creatures: Array.from({ length: count }, () => {
      const phase = random() * Math.PI * 2;
      return {
        x: 8 + random() * Math.max(0, width - 16),
        y: 8 + random() * Math.max(0, height - 16),
        vx: Math.cos(phase) * 10,
        vy: Math.sin(phase) * 10,
        angle: phase,
        phase,
        depth: 0.35 + random() * 0.65,
        wingPhase: phase,
        wingRate: 12,
        slot: -1,
        settled: false,
        fearUntil: 0,
        escapeX: 0,
        escapeY: 0,
      };
    }),
  };
}

function release(sim: CreatureSimulation, startle: boolean) {
  for (let i = 0; i < sim.creatures.length; i++) {
    const c = sim.creatures[i];
    if (c.slot < 0) continue;
    if (startle) {
      const dx = c.x - sim.pointer.x;
      const dy = c.y - sim.pointer.y;
      const distance = Math.hypot(dx, dy);
      c.escapeX = distance > 1 ? dx / distance : Math.cos(c.phase);
      c.escapeY = distance > 1 ? dy / distance : Math.sin(c.phase);
      c.fearUntil = sim.time + 1.6;
    }
    c.slot = -1;
    c.settled = false;
  }
}

/** Touch can scatter the field but can never recruit a landing creature. */
export function movePointer(sim: CreatureSimulation, x: number, y: number, canLand = true) {
  const p = sim.pointer;
  const distance = Math.hypot(x - p.x, y - p.y);
  if (p.active && distance < 0.5 && canLand === p.canLand) return;
  // Release relative to the old tip before moving it: even a large jump startles residents.
  release(sim, true);
  p.speed = p.active ? Math.min(1800, distance / Math.max(1 / 120, sim.time - p.lastMove)) : 400;
  p.x = x;
  p.y = y;
  p.lastMove = sim.time;
  p.active = true;
  p.canLand = canLand;
}

export function leavePointer(sim: CreatureSimulation) {
  release(sim, false);
  sim.pointer.active = false;
  sim.pointer.canLand = false;
}

export function resizeSimulation(sim: CreatureSimulation, width: number, height: number) {
  for (let i = 0; i < sim.creatures.length; i++) {
    const c = sim.creatures[i];
    c.x = Math.max(0, Math.min(width, (c.x / Math.max(1, sim.width)) * width));
    c.y = Math.max(0, Math.min(height, (c.y / Math.max(1, sim.height)) * height));
  }
  sim.width = width;
  sim.height = height;
}

export function stepSimulation(sim: CreatureSimulation, elapsed: number) {
  const dt = Number.isFinite(elapsed) ? Math.max(0, Math.min(MAX_DT, elapsed)) : 0;
  if (!dt) return;
  sim.time += dt;
  const p = sim.pointer;
  const sinceMove = sim.time - p.lastMove;
  const curious = p.active && p.canLand && sinceMove >= STILL_DELAY;
  if (!curious) release(sim, false);

  // Claim up to three nearest neighbours, once per still-pointer visit; no sorting/arrays.
  if (curious) {
    for (let slot = 0; slot < Math.min(3, sim.count); slot++) {
      let occupied = false;
      for (let i = 0; i < sim.count; i++) {
        if (sim.creatures[i].slot === slot) occupied = true;
      }
      if (occupied) continue;
      let closest = -1;
      let best = Math.max(260, Math.min(sim.width, sim.height) * 0.6);
      for (let i = 0; i < sim.count; i++) {
        const c = sim.creatures[i];
        if (c.slot >= 0 || c.fearUntil > sim.time) continue;
        const distance = Math.hypot(c.x - p.x, c.y - p.y);
        if (distance < best) {
          closest = i;
          best = distance;
        }
      }
      if (closest >= 0) sim.creatures[closest].slot = slot;
    }
  }

  for (let i = 0; i < sim.count; i++) {
    const c = sim.creatures[i];
    const landing = curious && c.slot >= 0;
    const fear = Math.max(0, (c.fearUntil - sim.time) / 1.6);
    let targetVx =
      Math.cos(c.phase + sim.time * 0.28 + Math.sin(sim.time * 0.43 + c.phase)) *
      (9 + c.depth * 10);
    let targetVy = Math.sin(c.phase + sim.time * 0.23) * 9 + Math.cos(sim.time * 1.7 + c.phase) * 3;
    let response = 1.6;

    if (landing) {
      const offsetAngle = c.slot * ((Math.PI * 2) / 3) - Math.PI / 2;
      const tx = Math.max(4, Math.min(sim.width - 4, p.x + Math.cos(offsetAngle) * 8));
      const ty = Math.max(4, Math.min(sim.height - 4, p.y + Math.sin(offsetAngle) * 8));
      const dx = tx - c.x;
      const dy = ty - c.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const speed = Math.min(210, distance * 4);
      const curve = Math.min(28, distance * 0.38) * Math.sin(c.phase + sim.time);
      targetVx = (dx * speed - dy * curve) / distance;
      targetVy = (dy * speed + dx * curve) / distance;
      response = 10;
      c.settled = distance < 3 && Math.hypot(c.vx, c.vy) < 8;
    } else {
      c.settled = false;
    }

    const dx = c.x - p.x;
    const dy = c.y - p.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const flee = p.active && sinceMove < 0.45 && distance < 155;
    if (flee) {
      const strength = (1 - distance / 155) * (65 + p.speed * 0.16) * Math.exp(-sinceMove * 5);
      targetVx += (dx / distance) * strength;
      targetVy += (dy / distance) * strength;
      response = 7;
    }
    targetVx += c.escapeX * fear * 170;
    targetVy += c.escapeY * fear * 170;
    if (fear > 0) response = 7;

    // Separation is deliberately tiny at the tip so arrivals can perch together.
    for (let j = 0; j < sim.count; j++) {
      if (i === j) continue;
      const other = sim.creatures[j];
      const sx = c.x - other.x;
      const sy = c.y - other.y;
      const gap = Math.max(0.1, Math.hypot(sx, sy));
      const radius = landing ? 5 : 25;
      if (gap < radius) {
        targetVx += (sx / gap) * (radius - gap) * 1.3;
        targetVy += (sy / gap) * (radius - gap) * 1.3;
      }
    }
    if (!landing) {
      const margin = Math.min(60, sim.width / 4, sim.height / 4);
      targetVx += Math.max(0, margin - c.x) * 1.4 - Math.max(0, c.x - sim.width + margin) * 1.4;
      targetVy += Math.max(0, margin - c.y) * 1.4 - Math.max(0, c.y - sim.height + margin) * 1.4;
    }
    const blend = 1 - Math.exp(-response * dt);
    c.vx += (targetVx - c.vx) * blend;
    c.vy += (targetVy - c.vy) * blend;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    // Safety net for extreme resize/pointer events; normal motion uses the soft bounds above.
    if (c.x < 0 || c.x > sim.width) {
      c.x = Math.max(0, Math.min(sim.width, c.x));
      c.vx *= -0.3;
    }
    if (c.y < 0 || c.y > sim.height) {
      c.y = Math.max(0, Math.min(sim.height, c.y));
      c.vy *= -0.3;
    }
    const angle = c.settled
      ? -Math.PI / 2 + Math.sin(sim.time * 0.6 + c.phase) * 0.16
      : Math.atan2(c.vy, c.vx);
    c.angle +=
      Math.atan2(Math.sin(angle - c.angle), Math.cos(angle - c.angle)) * (1 - Math.exp(-4 * dt));
    c.wingRate += ((c.settled ? 1.7 : 12) - c.wingRate) * (1 - Math.exp(-3 * dt));
    c.wingPhase += c.wingRate * dt;
  }
}
