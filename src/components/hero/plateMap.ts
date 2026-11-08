/**
 * Pixel map of the generated hero art plate (public/hero/plate-*.webp, 1672x941).
 *
 * The dark and light plates share one composition, so every live layer (shader
 * effects, route paths, hotspots, callouts) is placed in these plate pixels and
 * scaled with the image. The scene geometry comes from the arsenal-scene package's
 * HERO_PLATE preset, measured on the plate itself; the plate is an illustration, and
 * the module assignment below is a reading aid, not a claim about any real system.
 */
import {
  fitPlate as fitScenePlate,
  HERO_PLATE,
  orbitPoint as sceneOrbitPoint,
  platePercent as scenePlatePercent,
  type Orbit,
  type Point,
  type Rect,
  type StageFit,
} from "@amsborse/arsenal-scene";
import type { ServiceId } from "./topology";

export type { StageFit };
export type PlatePoint = Point;
export type PlateRect = Rect;
/** A glass orbit ring as a fitted ellipse; lights travel along it at `speed` rad/s. */
export type PlateOrbit = Orbit;

export const PLATE_W = HERO_PLATE.width;
export const PLATE_H = HERO_PLATE.height;

/** Where each service sits on the plate: four ring modules, three on the island. */
export const PLATE_MODULES: Readonly<Record<ServiceId, PlatePoint>> = {
  gateway: { x: 923, y: 243 },
  policy: { x: 1317, y: 207 },
  ingest: { x: 1022, y: 541 },
  orchestrator: { x: 953, y: 492 },
  inference: { x: 1399, y: 416 },
  storage: { x: 1148, y: 572 },
  observability: { x: 1240, y: 596 },
};

export const PLATE_SPHERE = HERO_PLATE.sphere;
export const PLATE_RINGS: PlateRect = HERO_PLATE.rings;
export const PLATE_ORBITS: readonly PlateOrbit[] = HERO_PLATE.orbits;
export const PLATE_FALLS: readonly PlateRect[] = HERO_PLATE.falls;
export const PLATE_HORIZON_Y = HERO_PLATE.horizonY;
export const PLATE_RIPPLE: PlatePoint = HERO_PLATE.ripple;
export const PLATE_BEAM = HERO_PLATE.beam;
/** The part of the plate that must stay visible on narrow screens. */
export const PLATE_FOCUS: PlateRect = HERO_PLATE.focus;

/** A point on an orbit at parameter angle `theta` (radians), in plate px. */
export const orbitPoint = (o: PlateOrbit, theta: number): PlatePoint => sceneOrbitPoint(o, theta);

/**
 * Cover-fit the plate anchored on the focus rect (see arsenal-scene `fitPlate`). Up to 10%
 * of the height may stay uncovered at the top so desktop frames the full plate width.
 */
export const fitPlate = (width: number, height: number, focus: PlateRect = PLATE_FOCUS): StageFit =>
  fitScenePlate(HERO_PLATE, width, height, { focus });

/** Plate pixel → percentage of the plate, for CSS positioning. */
export const platePercent = (point: PlatePoint) => scenePlatePercent(HERO_PLATE, point);

/** Quadratic curve between two modules, bowed away from the core so paths read as routes. */
export function edgeCurve(from: ServiceId, to: ServiceId) {
  const a = PLATE_MODULES[from];
  const b = PLATE_MODULES[to];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  let nx = mx - PLATE_SPHERE.x;
  let ny = my - PLATE_SPHERE.y;
  let n = Math.hypot(nx, ny);
  if (n < 1) {
    nx = -(b.y - a.y);
    ny = b.x - a.x;
    n = Math.hypot(nx, ny) || 1;
  }
  const bow = length * 0.22;
  return { a, b, c: { x: mx + (nx / n) * bow, y: my + (ny / n) * bow } };
}
