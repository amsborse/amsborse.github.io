import { PLATE_H, PLATE_SPHERE, PLATE_W, type PlatePoint, type StageFit } from "./plateMap";

/**
 * The plate "camera": a small 2D move of the fitted stage (pan + zoom) that stands in for a
 * dolly. Idle holds still apart from a damped pointer parallax; a selected or failed module
 * draws the frame toward it; a live request is followed gently; scrolling out of the hero
 * pushes in a little. Everything is springed, nothing spins, and reduced motion is identity.
 */
export interface CameraPose {
  /** Pan in screen px, applied after the zoom. */
  x: number;
  y: number;
  /** Zoom around the sculpture (`pivot`), 1 = the fitted composition. */
  scale: number;
}

export interface CameraInput {
  /** Pointer over the hero, each axis in -1..1 (0 when unknown or touch). */
  pointer: PlatePoint;
  /** Module to frame (selected or failed), in plate px. */
  focus: PlatePoint | null;
  /** Live request packet, in plate px. */
  packet: PlatePoint | null;
  /** How far the hero has scrolled out of view, 0..1. */
  scroll: number;
}

export const IDENTITY_POSE: CameraPose = { x: 0, y: 0, scale: 1 };

const PARALLAX_X = 9;
const PARALLAX_Y = 5;
const FOCUS_PULL = 0.07;
const FOCUS_ZOOM = 0.035;
const PACKET_PULL = 0.025;
const PACKET_ZOOM = 0.012;
const SCROLL_ZOOM = 0.05;
const SCROLL_LIFT = 28;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Where the camera wants to be, in screen px for a stage fitted at `fit.scale`. */
export function cameraTarget(input: CameraInput, fit: Pick<StageFit, "scale">): CameraPose {
  const px = clamp(input.pointer.x, -1, 1);
  const py = clamp(input.pointer.y, -1, 1);
  const scroll = clamp(input.scroll, 0, 1);
  // Parallax moves the scene against the pointer, so the sculpture reads as the near layer.
  let x = -px * PARALLAX_X;
  let y = -py * PARALLAX_Y - scroll * SCROLL_LIFT;
  let scale = 1 + scroll * SCROLL_ZOOM;
  const lead = input.focus ?? input.packet;
  if (lead) {
    const pull = input.focus ? FOCUS_PULL : PACKET_PULL;
    // Bring the subject toward the sculpture's axis: the frame moves toward it.
    x += (PLATE_SPHERE.x - lead.x) * fit.scale * pull;
    y += (PLATE_SPHERE.y - lead.y) * fit.scale * pull;
    scale += input.focus ? FOCUS_ZOOM : PACKET_ZOOM;
  }
  return { x, y, scale };
}

/**
 * One critically damped spring step (exact for constant target), so the move eases in and
 * out with no overshoot and stays stable at any frame time.
 */
export function springStep(
  value: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number
): [number, number] {
  const offset = value - target;
  const decay = Math.exp(-omega * dt);
  const k = velocity + omega * offset;
  return [target + (offset + k * dt) * decay, (velocity - omega * k * dt) * decay];
}

/**
 * The stage transform for a pose. Zoom is around the sculpture; pan is then limited so any
 * edge of the frame the fitted plate covered stays covered (no page showing at the sides).
 */
export function stageTransform(
  fit: StageFit,
  frame: { width: number; height: number },
  pose: CameraPose
): { x: number; y: number; scale: number } {
  const s = Math.max(1, pose.scale);
  const w = PLATE_W * fit.scale;
  const h = PLATE_H * fit.scale;
  const ox = fit.x + PLATE_SPHERE.x * fit.scale * (1 - s);
  const oy = fit.y + PLATE_SPHERE.y * fit.scale * (1 - s);
  const limit = (pan: number, origin: number, start: number, size: number, span: number) => {
    let lo = -Infinity;
    let hi = Infinity;
    if (start <= 0) hi = -origin; // left/top edge was covered
    if (start + size >= span) lo = span - origin - size * s; // right/bottom edge was covered
    return lo > hi ? pan : clamp(pan, lo, hi);
  };
  return {
    x: ox + limit(pose.x, ox, fit.x, w, frame.width),
    y: oy + limit(pose.y, oy, fit.y, h, frame.height),
    scale: s,
  };
}

export const poseSettled = (pose: CameraPose, target: CameraPose, velocity: CameraPose) =>
  Math.abs(pose.x - target.x) < 0.05 &&
  Math.abs(pose.y - target.y) < 0.05 &&
  Math.abs(pose.scale - target.scale) < 0.0002 &&
  Math.abs(velocity.x) < 0.05 &&
  Math.abs(velocity.y) < 0.05 &&
  Math.abs(velocity.scale) < 0.0002;
