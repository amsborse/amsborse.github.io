/**
 * The hero's live layers on top of the art plate: lake ripples, waterfall flow, ring light,
 * core sparkle, beam pulse, module glow, failure and recovery, and the
 * request packet. The shader and renderer come from the arsenal-scene package (one draw call
 * per frame, WebGL 1); this file fixes the hero's preset and module count.
 */
import {
  buildFragment,
  COMPONENTS,
  createSceneRenderer,
  HERO_PLATE,
  type SceneRenderer,
} from "@amsborse/arsenal-scene";

export const MODULE_COUNT = 7;

/**
 * Every package layer except the analytic orbit lights. The painted glass rings are not true
 * ellipses, so lights moved along fitted ellipses drifted off the glass; the `rings` layer
 * already sweeps light along the glass itself (gated by the plate's own pixels), so it stays.
 */
const COMPONENT_NAMES = COMPONENTS.map((c) => c.name).filter((name) => name !== "orbits");
const OPTIONS = { modules: MODULE_COUNT, components: COMPONENT_NAMES };

export interface PlateFrame {
  time: number;
  light: boolean;
  /** 0..1 how much of the scene is dimmed by an outage. */
  outage: number;
  /** Per module: x, y (plate px), amber highlight 0..1, failure 0..1. */
  modules: Float32Array;
  /** Per module: recovery glow 0..1. */
  recovery: Float32Array;
  /** Packet x, y (plate px), visibility 0..1, blocked 0/1. */
  packet: Float32Array;
}

export interface PlateRenderer extends SceneRenderer {
  render(frame: PlateFrame): void;
}

/** The hero's full fragment shader source, for tests and the package's parity fixture. */
export const FRAGMENT = buildFragment(HERO_PLATE, OPTIONS);

/** Throws when WebGL is unavailable or the shader fails, so the caller can fall back loudly. */
export function createPlateRenderer(canvas: HTMLCanvasElement): PlateRenderer {
  return createSceneRenderer(canvas, HERO_PLATE, OPTIONS);
}
