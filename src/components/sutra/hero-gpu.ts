import {
  ADDITIVE,
  BLOOM,
  BLOOM_LEVELS,
  BLOOM_STRENGTH,
  BLOOM_TAIL,
  BLOOM_WEIGHT,
  createKit,
  DOWNSAMPLE,
  FLOAT,
  HALF,
  openGpu,
  PREFILTER,
  TONE,
  UPSAMPLE,
} from "./gpu-stage.ts";
import type { StoryObjectKind } from "./story-object-geometry.ts";
import { nextTier, TIERS, type Tier } from "./hero-quality.ts";

/**
 * The SUTRA hero as a WebGPU scene (#402, #462): an oblique ring of glass and brushed gold around
 * a hot filament, faint signals flowing into it, and one path out to each module. Geometry is
 * generated in the shaders from vertex and instance indices; there are no vertex buffers, textures
 * or images. The scene is rendered as linear light into a half-float target, bloomed and tone
 * mapped onto the canvas. The page owns the words and the controls; this module only draws light
 * behind them, from a layout the page measures.
 */

/** Scene space: y runs -1..1 over the canvas height, x runs -aspect..aspect. */
export interface HeroLayout {
  aspect: number;
  /** One CSS pixel in scene units, so line widths stay the same on every screen. */
  px: number;
  /** Ring centre and radius. */
  ring: readonly [number, number, number];
  /**
   * Per module: label anchor x, y, brightness 0..1, and flow: 1 carries moving light, 0 is a still
   * thread, -1 is a dormant, dotted thread for a module that does not exist yet.
   */
  modules: readonly (readonly [number, number, number, number])[];
  /** Right edge of the headline, where incoming signals dim so the words stay readable. */
  copyEdge: number;
  /** Vertical spread of the incoming signals around the ring. */
  spread: number;
  /** Radius of each module's emblem, drawn where its label's symbol sits. */
  iconRadius: number;
  /** Optional thread-story bounds in scene units; Home retains its original geometry. */
  storyBox?: readonly [number, number, number, number];
}

export interface HeroScene {
  readonly elapsed: number;
  update(layout: HeroLayout): void;
  /** Pointer position -1..1 over the hero; the ring turns toward it slightly, with easing. */
  pointer(x: number, y: number): void;
  /** Starts the frame loop; a no-op while it is running. */
  start(): void;
  /** Stops the frame loop and keeps the last frame on screen. */
  stop(): void;
  /** Draws one frame without starting the loop, for a quiet map. */
  still(): void;
  /** Settles if the GPU device is lost, e.g. after a driver reset; the page then goes static. */
  readonly lost: Promise<void>;
  dispose(): void;
}

const RING_SEGMENTS = 180;
const RING_ALONG = 8;
const PATH_SEGMENTS = 96;
const THREADS = 40;
/** Vertices per emblem part: enough for the largest, the pedestal's two rings. */
const EMBLEM_VERTICES = 320 * 6;
/** How far the ring turns toward the pointer at the hero's edges: yaw and pitch, radians. */
const TURN = [0.34, 0.14] as const;
/** Texels per row of the signals' state textures. */
const STATE_WIDTH = 64;
/**
 * What the incoming signals read as, up close: a few words from many fields in many languages,
 * drawn once into a texture (one row each). Topics, not claims: nothing here pretends to be news.
 */
const PHRASES = [
  "protein folding",
  "monetary policy",
  "संगीत और गणित",
  "量子计算",
  "气候模型",
  "الذكاء الاصطناعي",
  "нейронные сети",
  "βιολογία κυττάρων",
  "économie circulaire",
  "arquitectura sostenible",
  "Datenschutz",
  "海洋生態系",
  "기후 변화",
  "ciência de materiais",
  "storia dell'arte",
  "sleep and memory",
  "supply chains",
  "ভাষাতত্ত্ব",
  "தொல்லியல்",
  "प्राचीन दर्शन",
  "astronomía",
  "gene editing",
  "urban design",
  "ريادة الأعمال",
  "עיצוב גרפי",
  "การแพทย์",
  "kvantfysik",
  "rynki finansowe",
  "psicología cognitiva",
  "dil bilimi",
  "vật lý học",
  "energy storage",
  "मौसम विज्ञान",
  "public health",
  "philosophie des sciences",
  "how cells repair DNA",
  "¿cómo aprenden las máquinas?",
  "comment dort le cerveau",
  "wie Sterne entstehen",
  "星はどう生まれるか",
  "ग्रहों की खोज",
  "why cities grow",
  "音声認識",
  "新材料",
  "Wasserstoffwirtschaft",
  "ספרות עברית",
  "open-source tools",
  "cybersecurity",
] as const;
/** Shared illustrative thread timing: the model reacts to the exact rendered pulse. */
function threadHash(n: number) {
  const value = Math.sin(n * 12.9898 + 4.1414) * 43758.5453;
  return value - Math.floor(value);
}
const threadSpeed = (index: number) => Number((0.09 + threadHash(index + 4.7) * 0.045).toFixed(6));
const threadOffset = (index: number) => Number(threadHash(index + 2.3).toFixed(6));
export function storyThreadPhase(time: number, index = 0, along = 1) {
  return (((along - time * threadSpeed(index) + threadOffset(index)) % 1) + 1) % 1;
}
const PHRASE_W = 512;
const PHRASE_H = 24;
/** One signal in this many carries a phrase instead of a streak. */
const PHRASE_SHARE = "0.045";
/** Pulses per second along a live path, as a fraction of its length. */
const PULSE_SPEED = "0.07";
/** Seconds into the opening when the first pulse leaves the ring. */
const FIRST_PULSE = "2.3";
/** When the opening has settled; a scene first drawn still starts here. */
const SETTLED = 3.5;
/** The filament's peak brightness, in linear light. */
const FILAMENT = "9.0";
const EXPOSURE = 2.4;
/** Frames per second while the scene runs. */
const FPS = 30;
const SHAFT_STRENGTH = 0.12;
const STREAK_STRENGTH = 0.35;
const FLOOR_RINGS = 20;
const FLOOR_SEGMENTS = 72;

const HEAD = /* wgsl */ `
struct Scene {
  view: vec4f,   // aspect, px, time, bloom prefilter reach
  ring: vec4f,   // cx, cy, radius, turn toward the pointer (yaw, radians)
  m0: vec4f,     // anchor x, y, level, flow
  m1: vec4f,
  m2: vec4f,
  extra: vec4f,  // copy edge, spread, turn toward the pointer (pitch, radians), exposure
  motion: vec4f, // seconds since the last frame, particle reset (1 stream in, 2 in flow), eased pointer x, y
  band: vec4f,   // the ring's layer: a box around the ring, centre x, y and half size x, y
  quality: vec4f, // shafts, streaks, refraction (each 0 or 1), the ring layer's size in pixels
  icons: vec4f,   // the emblems' radius in scene units, unused
  story: vec4f,   // optional story bounds: left, bottom, right, top
}
@group(0) @binding(0) var<uniform> scene: Scene;
`;

const COMMON = /* wgsl */ `
const TAU = 6.2831853;

fn hash(n: f32) -> f32 { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }

// Smooth value noise and a three-octave sum of it, for haze and turbulence.
fn noise(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let n = dot(i, vec3f(1.0, 57.0, 113.0));
  return mix(
    mix(mix(hash(n), hash(n + 1.0), u.x), mix(hash(n + 57.0), hash(n + 58.0), u.x), u.y),
    mix(mix(hash(n + 113.0), hash(n + 114.0), u.x), mix(hash(n + 170.0), hash(n + 171.0), u.x), u.y),
    u.z);
}

fn fbm(p: vec3f) -> f32 {
  return noise(p) * 0.55 + noise(p * 2.03 + 17.1) * 0.3 + noise(p * 4.1 + 31.7) * 0.15;
}

// Scene units from a top-origin uv, and back.
fn fromUv(uv: vec2f) -> vec2f { return vec2f((uv.x * 2.0 - 1.0) * scene.view.x, 1.0 - uv.y * 2.0); }
fn toUv(p: vec2f) -> vec2f { return vec2f((p.x / scene.view.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); }

// Layers shift with the pointer by their depth; amount is the shift in scene units at the edge.
fn parallax(amount: f32) -> vec2f { return vec2f(scene.motion.z, -scene.motion.w) * amount; }

// Where the words are, light is held back: 0 over the headline, 1 clear of it.
fn clearOfCopy(x: f32) -> f32 { return smoothstep(scene.extra.x - 0.1, scene.extra.x + 0.4, x); }

fn clip(p: vec2f) -> vec4f { return vec4f(p.x / scene.view.x, p.y, 0.0, 1.0); }

// Turns ring-local 3D (radius 1, axis along z) to face the camera, which sits at z = 5. It is a
// pure rotation, so it turns normals and tangents too.
fn orient(q: vec3f) -> vec3f {
  // The camera is never quite still: a slow drift of a degree or two, on incommensurate periods.
  let t = scene.view.z;
  let yaw = 1.02 + scene.ring.w + 0.04 * sin(t * 0.11) + 0.018 * sin(t * 0.067 + 1.7);
  let cy = cos(yaw);
  let sy = sin(yaw);
  let p = vec3f(q.x * cy + q.z * sy, q.y, -q.x * sy + q.z * cy);
  let pitch = 0.24 + scene.extra.z + 0.022 * sin(t * 0.083 + 0.6);
  let cp = cos(pitch);
  let sp = sin(pitch);
  return vec3f(p.x, p.y * cp - p.z * sp, p.y * sp + p.z * cp);
}

// Perspective from the oriented ring to scene units.
// It breathes: the ring swells by about a percent and settles, every half minute or so.
fn screen(p: vec3f) -> vec2f {
  let breath = 1.0 + 0.012 * sin(scene.view.z * 0.19);
  return scene.ring.xy + p.xy * (5.0 / (5.0 - p.z)) * scene.ring.z * breath;
}

// Eased curves for everything that starts or settles; nothing moves linearly.
fn easeOut(x: f32) -> f32 { let u = 1.0 - clamp(x, 0.0, 1.0); return 1.0 - u * u * u; }
fn easeInOut(x: f32) -> f32 {
  let c = clamp(x, 0.0, 1.0);
  return select(1.0 - pow(2.0 - 2.0 * c, 3.0) * 0.5, 4.0 * c * c * c, c < 0.5);
}

// The opening, on first view: the ring kindles out of darkness, wavering gently as a filament
// warms, slow enough to stay smooth at 30 frames a second.
fn kindle() -> f32 {
  let t = scene.view.z;
  let k = easeInOut((t - 0.2) / 2.0);
  return k * (1.0 + 0.12 * sin(t * 7.0) * (1.0 - k));
}

// Then the threads draw in along their length.
fn reveal(delay: f32) -> f32 { return easeInOut((scene.view.z - delay) / 1.5); }

// The water's surface, just under the ring, in ring-local height, and where it meets the screen.
const WATER = -1.18;
fn waterY() -> f32 { return project(vec3f(0.0, WATER, 0.0)).y; }

// Ring-local 3D to scene units; z is kept for depth shading.
fn project(q: vec3f) -> vec3f {
  let p = orient(q);
  return vec3f(screen(p), p.z);
}

fn moduleAt(k: u32) -> vec4f {
  if (k == 0u) { return scene.m0; }
  if (k == 1u) { return scene.m1; }
  return scene.m2;
}

fn moduleColor(k: u32) -> vec3f {
  if (k == 0u) { return vec3f(1.0, 0.76, 0.40); }
  if (k == 1u) { return vec3f(0.42, 0.92, 0.82); }
  return vec3f(0.86, 0.80, 0.68);
}

// A module path leaves from inside the ring and arrives level with its label.
fn pathPoint(k: u32, t: f32) -> vec2f {
  let a = (1.0 - f32(k)) * 0.95;
  let p0 = project(vec3f(cos(a) * 0.72, sin(a) * 0.72, 0.22)).xy;
  let p3 = moduleAt(k).xy;
  let dx = p3.x - p0.x;
  let p1 = p0 + vec2f(dx * 0.38, (p3.y - p0.y) * 0.05);
  let p2 = p3 - vec2f(dx * 0.42, 0.0);
  return bezier(p0, p1, p2, p3, t);
}

fn bezier(p0: vec2f, p1: vec2f, p2: vec2f, p3: vec2f, t: f32) -> vec2f {
  let u = 1.0 - t;
  return u * u * u * p0 + 3.0 * u * u * t * p1 + 3.0 * u * t * t * p2 + t * t * t * p3;
}

// Where an incoming signal enters the ring: its own point in the opening.
fn goal(seed: f32) -> vec2f {
  let angle = hash(seed + 3.1) * TAU;
  let radius = sqrt(hash(seed + 5.3)) * 0.6;
  return project(vec3f(cos(angle) * radius, sin(angle) * radius, 0.0)).xy;
}

// A faint thread's route from the left edge into the ring's opening. Deeper routes (depth near
// 1) sit further back: they drift more slowly under the pointer.
fn lane(seed: f32, t: f32, depth: f32) -> vec2f {
  let y0 = scene.ring.y + (hash(seed + 1.7) * 2.0 - 1.0) * scene.extra.y;
  let start = vec2f(-scene.view.x - 0.15, y0);
  let angle = hash(seed + 3.1) * TAU;
  let radius = sqrt(hash(seed + 5.3)) * 0.7;
  let end = project(vec3f(cos(angle) * radius, sin(angle) * radius, -0.12)).xy;
  let c1 = vec2f(mix(start.x, end.x, 0.42), y0);
  let c2 = vec2f(end.x - scene.ring.z * 1.1, mix(y0, end.y, 0.85));
  let drift = parallax(0.06) * (1.0 - depth) * (1.0 - t);
  return bezier(start, c1, c2, end, t) + drift;
}

// One corner of a quad from a to b with the given half width; xy is the corner, z is across.
fn ribbon(a: vec2f, b: vec2f, halfWidth: f32, corner: u32) -> vec3f {
  var ends = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  var sides = array<f32, 6>(-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  let d = b - a;
  let n = normalize(vec2f(-d.y, d.x) + vec2f(1e-6, 0.0));
  let side = sides[corner];
  return vec3f(mix(a, b, ends[corner]) + n * side * halfWidth, side);
}

// A seamless strip: each vertex is offset along the curve's own normal at that point, so
// neighbouring quads share their edges and wide glows have no seams or spikes.
fn stripCorner(corner: u32) -> vec2f {
  var ends = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  var sides = array<f32, 6>(-1.0, -1.0, 1.0, 1.0, -1.0, 1.0);
  return vec2f(ends[corner], sides[corner]);
}

fn strip(p: vec2f, ahead: vec2f, side: f32, halfWidth: f32) -> vec2f {
  let d = ahead - p;
  return p + normalize(vec2f(-d.y, d.x) + vec2f(1e-7, 0.0)) * side * halfWidth;
}
`;

// The ring's hot filament, inside its glass and metal band (RING).
const FILAMENT_LINE = /* wgsl */ `
struct Out {
  @builtin(position) position: vec4f,
  @location(0) intensity: f32,
  @location(1) across: f32, // -1..1
}

@vertex fn vs_main(@builtin(vertex_index) v: u32) -> Out {
  let c = stripCorner(v % 6u);
  let t = (f32(v / 6u) + c.x) / f32(${RING_SEGMENTS}) * TAU;
  let a = project(vec3f(cos(t), sin(t), 0.0) * 0.9);
  let ahead = project(vec3f(cos(t + 0.002), sin(t + 0.002), 0.0) * 0.9);
  let position = strip(a.xy, ahead.xy, c.y, 2.2 * scene.view.y * 1.6);
  // A slow surge of heat travels around it; the far side is dimmer.
  let travel = pow(max(cos(t - scene.view.z * 0.45), 0.0), 18.0);
  var out: Out;
  out.position = clip(position);
  out.intensity = ${FILAMENT} * kindle() * mix(0.32, 1.0, smoothstep(-1.1, 1.1, a.z)) * (1.0 + travel * 1.6);
  out.across = c.y;
  return out;
}

// White-hot at its core, then gold, then amber at its edges.
@fragment fn fs_main(v: Out) -> @location(0) vec4f {
  let heat = exp(-v.across * v.across * 2.4);
  let ember = mix(vec3f(0.95, 0.24, 0.03), vec3f(1.0, 0.6, 0.18), smoothstep(0.05, 0.5, heat));
  return vec4f(mix(ember, vec3f(1.0, 0.94, 0.84), smoothstep(0.55, 1.0, heat)) * heat * v.intensity, 0.0);
}
`;

// The air: faint drifting haze that the ring lights from within, a low fog over the floor, and
// little over the words. It is soft and far below the bloom threshold, so it is drawn at the
// effects' scale and added in the final pass.
const HAZE = /* wgsl */ `
fn hazeAt(uv: vec2f) -> vec3f {
  // The haze sits a little nearer than the ring, so it drifts slightly further under the pointer.
  let p = fromUv(uv) + parallax(0.015);
  let rel = (p - scene.ring.xy) / scene.ring.z;
  let time = scene.view.z;
  let body = fbm(vec3f(p * 1.3 + vec2f(time * 0.025, time * 0.008), time * 0.04));
  // Light scattered by the air around the ring falls off with distance, carried by the haze.
  let scatter = kindle() / (1.0 + dot(rel, rel) * 2.5);
  let floorY = waterY();
  let fog = exp(-pow((p.y - floorY) / (scene.ring.z * 0.9), 2.0)) * smoothstep(-0.2, 0.8, body);
  var light = vec3f(1.0, 0.66, 0.32) * scatter * (0.006 + 0.03 * body * body);
  light += vec3f(0.32, 0.5, 0.5) * (fog * 0.008 + body * body * 0.002);
  return light * mix(0.15, 1.0, clearOfCopy(p.x));
}
`;

// The water under the ring catches its light: a warm pool, slow rings of ripples spreading from
// beneath it, and faint moving caustics. Its reflection is added in the final pass.
const FLOOR = /* wgsl */ `
struct Ground {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) x: f32,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32) -> Ground {
  let quad = v / 6u;
  let c = stripCorner(v % 6u);
  let r = (f32(quad / ${FLOOR_SEGMENTS}u) + c.y * 0.5 + 0.5) / f32(${FLOOR_RINGS}) * 2.8;
  let theta = (f32(quad % ${FLOOR_SEGMENTS}u) + c.x) / f32(${FLOOR_SEGMENTS}) * TAU;
  let local = vec2f(cos(theta), sin(theta)) * r;
  let p = project(vec3f(local.x, WATER, local.y));
  var out: Ground;
  out.position = clip(p.xy);
  out.local = local;
  out.x = p.x;
  return out;
}

@fragment fn fs_main(g: Ground) -> @location(0) vec4f {
  // A caustic web: the iterated light-bending pattern popularised by joltz0r's water caustic.
  let t = scene.view.z * 0.25 + 23.0;
  let p = g.local * 3.4 - vec2f(250.0);
  var q = p;
  var sum = 1.0;
  for (var k = 0; k < 4; k++) {
    let tk = t * (1.0 - 3.5 / f32(k + 1));
    q = p + vec2f(cos(tk - q.x) + sin(tk + q.y), sin(tk - q.y) + cos(tk + q.x));
    sum += 1.0 / length(vec2f(p.x / (sin(q.x + tk) / 0.005), p.y / (cos(q.y + tk) / 0.005)));
  }
  let caustic = pow(abs(1.17 - pow(sum / 4.0, 1.4)), 8.0);
  let r = length(g.local);
  let pool = (exp(-pow((r - 0.85) / 0.3, 2.0)) + 0.3 * exp(-r * r / 0.4)) * kindle();
  var ripples = 0.0;
  for (var k = 0; k < 3; k++) {
    let front = fract(scene.view.z * 0.045 + f32(k) / 3.0) * 2.6;
    ripples += exp(-pow((r - front) / 0.018, 2.0)) * (1.0 - front / 2.6);
  }
  let fade = exp(-r * r / 1.6) * clearOfCopy(g.x);
  let light = pool * (0.015 + 0.1 * caustic) + ripples * 0.05 * (0.4 + caustic) * kindle();
  return vec4f(vec3f(1.0, 0.7, 0.36) * light * fade, 0.0);
}
`;

// The band itself, drawn as a material into its own layer: a short glass cylinder between two
// brushed-gold rims. Metal takes an anisotropic (Ward) highlight brushed
// around the ring from a key light that circles slowly, light from the filament inside, and a
// cool rim light from where the signals arrive. Glass shows the scene behind it refracted, with
// a little dispersion. The layer holds the change the band makes to the light behind it, so
// adding it to the scene replaces what the band covers.
const RING = /* wgsl */ `
@group(0) @binding(1) var behind: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;

struct Surface {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) tangent: vec3f,
  @location(3) inward: vec3f,
  @location(4) @interpolate(flat) metal: u32,
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Surface {
  let quad = v / 6u;
  let c = stripCorner(v % 6u);
  let theta = (f32(quad % ${RING_SEGMENTS}u) + c.x) / f32(${RING_SEGMENTS}) * TAU;
  let phi = (f32(quad / ${RING_SEGMENTS}u) + c.y * 0.5 + 0.5) / f32(${RING_ALONG});
  let radial = vec3f(cos(theta), sin(theta), 0.0);
  var q: vec3f;
  var n: vec3f;
  if (i == 0u) {
    // The glass band.
    q = radial + vec3f(0.0, 0.0, mix(-0.16, 0.16, phi));
    n = radial;
  } else {
    // A rim: a thin tube around each edge of the band.
    let psi = phi * TAU;
    n = cos(psi) * radial + vec3f(0.0, 0.0, sin(psi));
    q = radial * 1.01 + vec3f(0.0, 0.0, select(-0.17, 0.17, i == 2u)) + n * 0.032;
  }
  let world = orient(q);
  var out: Surface;
  // The layer covers only a box around the ring, so its cost follows the ring's size.
  out.position = vec4f((screen(world) - scene.band.xy) / scene.band.zw, 0.5 - world.z * 0.2, 1.0);
  out.world = world;
  out.normal = orient(n);
  out.tangent = orient(vec3f(-sin(theta), cos(theta), 0.0));
  out.inward = -orient(radial);
  out.metal = select(1u, 0u, i == 0u);
  return out;
}

// Ward's anisotropic highlight: smooth along the brushing, rough across it.
fn ward(n: vec3f, t: vec3f, b: vec3f, l: vec3f, v: vec3f, along: f32, across: f32) -> f32 {
  let nl = dot(n, l);
  if (nl <= 0.0) { return 0.0; }
  let h = normalize(l + v);
  let x = dot(h, t) / along;
  let y = dot(h, b) / across;
  let hn = max(dot(h, n), 1e-3);
  return exp(-(x * x + y * y) / (hn * hn)) * nl
    / (12.566 * along * across * sqrt(max(nl * dot(n, v), 1e-4)));
}

@fragment fn fs_main(s: Surface) -> @location(0) vec4f {
  let view = normalize(vec3f(0.0, 0.0, 5.0) - s.world);
  var n = normalize(s.normal);
  if (dot(n, view) < 0.0) { n = -n; }
  let t = normalize(s.tangent);
  let b = cross(n, t);
  let nv = max(dot(n, view), 1e-3);
  let rim = pow(1.0 - nv, 5.0);
  let local = s.position.xy / scene.quality.w;
  let uv = toUv(scene.band.xy + vec2f(local.x * 2.0 - 1.0, 1.0 - local.y * 2.0) * scene.band.zw);
  let direct = textureSampleLevel(behind, linear, uv, 0.0).rgb;

  let a = scene.view.z * 0.19;
  let key = normalize(vec3f(cos(a) * 0.8, 0.55, 0.45 + sin(a) * 0.5));
  let heat = kindle();
  let keyColor = vec3f(1.0, 0.9, 0.76) * 4.0 * (0.35 + 0.65 * heat);
  let back = normalize(vec3f(-0.9, 0.2, -0.45));
  let backColor = vec3f(0.3, 0.72, 0.7) * 1.4;
  // The filament lights whatever faces the ring's axis.
  let inward = normalize(s.inward);
  let fire = vec3f(1.0, 0.62, 0.24) * ${FILAMENT} * 0.35 * heat * max(dot(n, inward), 0.0);

  if (s.metal == 1u) {
    let gold = vec3f(1.0, 0.76, 0.42);
    let fresnel = gold + (1.0 - gold) * rim;
    var light = keyColor * ward(n, t, b, key, view, 0.05, 0.3);
    light += backColor * ward(n, t, b, back, view, 0.08, 0.5);
    light += fire * (0.08 + 0.35 * ward(n, t, b, inward, view, 0.1, 0.5));
    return vec4f(fresnel * light + gold * 0.01 - direct, 0.0);
  }

  // Thin glass: the scene behind, bent most toward the band's edges, where the view grazes it.
  let bend = n.xy * vec2f(1.0, -1.0) * (0.004 + 0.022 * (1.0 - nv)) * scene.quality.z;
  let seen = vec3f(
    textureSampleLevel(behind, linear, uv + bend, 0.0).r,
    textureSampleLevel(behind, linear, uv + bend * 1.08, 0.0).g,
    textureSampleLevel(behind, linear, uv + bend * 1.16, 0.0).b);
  let fresnel = 0.04 + 0.96 * rim;
  let glint = keyColor * pow(max(dot(n, normalize(key + view)), 0.0), 220.0) * 6.0;
  let sky = mix(vec3f(0.01, 0.02, 0.025), vec3f(0.09, 0.07, 0.045), reflect(-view, n).y * 0.5 + 0.5);
  // Filament light scatters inside the glass, so the band glows warm from within.
  let glow = fire * 0.035 + backColor * rim * 0.4;
  let tint = vec3f(1.0, 0.93, 0.82);
  return vec4f(seen * tint * (1.0 - fresnel) + fresnel * (sky + glint) + glow - direct, 0.0);
}
`;

// Adds the ring's layer into the scene.
const MERGE = /* wgsl */ `
@group(0) @binding(1) var band: texture_2d<f32>;
@group(0) @binding(2) var linear: sampler;
// Drawn in a viewport over the ring's box, so uv runs across the box.
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  return vec4f(textureSampleLevel(band, linear, uv, 0.0).rgb, 0.0);
}
`;

// The modules' emblems, where each label's symbol sits: a glass dome on a gold pedestal around a
// small object that stands for the module and slowly sways: Manthan's gold leaves of discovery,
// Smriti's panes of memory, Kriya's crystal. A lit module's emblem glows from within in its
// colour; an unlit one is dim glass and gold, and Kriya, which does not exist yet, never glows.
// Each time a pulse on a live path reaches its module, the emblem flares and settles.
const EMBLEMS = /* wgsl */ `
// How recently a pulse reached module k's emblem: 1 on arrival, fading over about a second. A
// pulse arrives where pulses() fades it out, at about 0.95 along the path.
fn arrived(k: u32) -> f32 {
  let m = moduleAt(k);
  if (m.w < 0.5) { return 0.0; }
  let at = 1.0 / 1.1;
  var flare = 0.0;
  for (var j = 0; j < 3; j++) {
    let u = (scene.view.z - ${FIRST_PULSE}) * ${PULSE_SPEED} + 0.05 - f32(j) / 3.0;
    if (u < at) { continue; }
    flare = max(flare, exp(-fract(u - at) / (${PULSE_SPEED} * 0.8)));
  }
  return flare * m.z;
}

struct Emblem {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) local: vec3f,
  @location(2) @interpolate(flat) kind: vec2u, // module, part (0 dome, 1 pedestal, 2 object)
}

const PI = 3.1415927;

// A point on the part's surface and its normal, from the vertex index; w = 0 drops the vertex.
fn domePoint(v: u32) -> array<vec4f, 2> {
  let q = v / 6u;
  let c = stripCorner(v % 6u);
  let theta = (f32(q % 20u) + c.x) / 20.0 * TAU;
  // The dome is a sphere cut just below its equator, where it meets the pedestal.
  let phi = (f32(q / 20u) + c.y * 0.5 + 0.5) / 12.0 * PI * 0.64;
  let n = vec3f(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
  return array<vec4f, 2>(vec4f(n, select(0.0, 1.0, q < 240u)), vec4f(n, 0.0));
}

fn pedestalPoint(v: u32) -> array<vec4f, 2> {
  // Two gold rings: a slim one holding the dome and a broader foot below it.
  let q = v / 6u;
  let lower = q >= 160u;
  let k = q % 160u;
  let c = stripCorner(v % 6u);
  let theta = (f32(k % 20u) + c.x) / 20.0 * TAU;
  let psi = (f32(k / 20u) + c.y * 0.5 + 0.5) / 8.0 * TAU;
  let big = select(0.92, 0.72, lower);
  let small = select(0.07, 0.13, lower);
  let y = select(-0.38, -0.58, lower);
  let radial = vec3f(cos(theta), 0.0, sin(theta));
  let n = cos(psi) * radial + vec3f(0.0, sin(psi), 0.0);
  let p = radial * big + vec3f(0.0, y, 0.0) + n * small;
  return array<vec4f, 2>(vec4f(p, 1.0), vec4f(n, 0.0));
}

fn objectPoint(k: u32, v: u32) -> array<vec4f, 2> {
  if (v >= 18u) { return array<vec4f, 2>(vec4f(0.0), vec4f(0.0)); }
  let face = v / 6u;
  let c = stripCorner(v % 6u);
  if (k == 2u) {
    // A square crystal pyramid: four sloped faces and a two-triangle base, three at a time.
    var apex = vec3f(0.0, 0.52, 0.0);
    var corners = array<vec3f, 4>(
      vec3f(-0.4, -0.32, -0.4), vec3f(0.4, -0.32, -0.4), vec3f(0.4, -0.32, 0.4), vec3f(-0.4, -0.32, 0.4));
    let t = v / 3u;
    let j = v % 3u;
    var a: vec3f; var b: vec3f; var d: vec3f;
    if (t < 4u) { a = apex; b = corners[t]; d = corners[(t + 1u) % 4u]; }
    else if (t == 4u) { a = corners[0]; b = corners[1]; d = corners[2]; }
    else { a = corners[0]; b = corners[2]; d = corners[3]; }
    var pts = array<vec3f, 3>(a, b, d);
    return array<vec4f, 2>(vec4f(pts[j], 1.0), vec4f(normalize(cross(b - a, d - a)), 0.0));
  }
  // Three leaves (Manthan) or panes (Smriti), each a quad, fanned or stacked.
  let spread = f32(face) - 1.0;
  let across = (c.x - 0.5) * select(0.5, 0.58, k == 1u);
  let up = (c.y * 0.5 + 0.5) * select(0.78, 0.66, k == 1u) - 0.32;
  var p = vec3f(across, up, 0.0);
  var n = vec3f(0.0, 0.0, 1.0);
  if (k == 0u) {
    let a = spread * 0.85;
    p = vec3f(p.x * cos(a), p.y + abs(spread) * -0.04, p.x * sin(a) + spread * 0.02);
    n = vec3f(-sin(a), 0.0, cos(a));
  } else {
    p += vec3f(spread * 0.14, spread * 0.05, spread * 0.2);
  }
  return array<vec4f, 2>(vec4f(p, 1.0), vec4f(n, 0.0));
}

// The emblem is seen a little from above, turning slightly with the pointer as the ring does.
fn view(p: vec3f) -> vec3f {
  let yaw = scene.motion.z * 0.3;
  let q = vec3f(p.x * cos(yaw) + p.z * sin(yaw), p.y, -p.x * sin(yaw) + p.z * cos(yaw));
  let pitch = 0.32 + scene.motion.w * 0.1;
  return vec3f(q.x, q.y * cos(pitch) - q.z * sin(pitch), q.y * sin(pitch) + q.z * cos(pitch));
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Emblem {
  let k = i / 3u;
  let part = i % 3u;
  var surface: array<vec4f, 2>;
  if (part == 0u) { surface = domePoint(v); }
  else if (part == 1u) { surface = pedestalPoint(v); }
  else {
    surface = objectPoint(k, v);
    // The object sways slowly, each at its own pace, never turning edge-on.
    let a = sin(scene.view.z * (0.35 + f32(k) * 0.07) + f32(k) * 2.1) * 0.7;
    let r = mat3x3f(vec3f(cos(a), 0.0, -sin(a)), vec3f(0.0, 1.0, 0.0), vec3f(sin(a), 0.0, cos(a)));
    surface = array<vec4f, 2>(vec4f(r * surface[0].xyz, surface[0].w), vec4f(r * surface[1].xyz, 0.0));
  }
  let m = moduleAt(k);
  let radius = scene.icons.x;
  let centre = vec2f(m.x + scene.view.y * 4.0 + radius, m.y);
  let p = view(surface[0].xyz);
  var out: Emblem;
  out.position = select(vec4f(-9.0, -9.0, 0.0, 1.0), clip(centre + p.xy * radius * (4.0 / (4.0 - p.z))),
    surface[0].w > 0.5 && m.x != 0.0);
  out.normal = view(surface[1].xyz);
  out.local = surface[0].xyz;
  out.kind = vec2u(k, part);
  return out;
}

@fragment fn fs_main(e: Emblem) -> @location(0) vec4f {
  let k = e.kind.x;
  let part = e.kind.y;
  let m = moduleAt(k);
  var n = normalize(e.normal);
  if (n.z < 0.0) { n = -n; }
  let facing = n.z;
  let rim = pow(1.0 - facing, 3.0);
  let key = normalize(vec3f(-0.5, 0.7, 0.6));
  let glint = pow(max(dot(reflect(vec3f(0.0, 0.0, -1.0), n), key), 0.0), 60.0);
  // Honest light: only a lit module glows, and Kriya never does.
  let lit = select(m.z, 0.0, m.w < -0.5) * kindle();
  let flare = arrived(k);
  let colour = moduleColor(k);
  let gold = vec3f(1.0, 0.74, 0.4);
  var light: vec3f;
  if (part == 0u) {
    // Glass: a rim of reflected light, one bright glint, and the object's glow caught inside.
    light = vec3f(0.55, 0.7, 0.72) * rim * 0.16 + vec3f(1.0, 0.95, 0.88) * glint * 1.4;
    light += colour * rim * lit * 0.5 + colour * 0.02 * lit;
    light += colour * flare * (rim * 2.4 + 0.2);
  } else if (part == 1u) {
    // Brushed gold, brighter where it faces up toward the light inside.
    light = gold * (0.03 + 0.35 * glint + 0.12 * rim) + gold * max(n.y, 0.0) * 0.06;
    light += colour * max(n.y, 0.0) * (lit * 0.6 + flare * 1.2);
  } else {
    // The object: gold leaves, teal glass panes or a crystal, lit from within when the module is.
    let edge = smoothstep(0.75, 1.0, max(abs(e.local.x) / 0.27, abs(e.local.y - 0.07) / 0.39));
    let body = select(gold * 0.18, colour * 0.12, k != 0u);
    light = body * (0.4 + facing) + vec3f(1.0, 0.95, 0.88) * glint * 1.2 + colour * rim * 0.2;
    light += colour * lit * (0.9 + 2.2 * edge + 1.2 * rim);
    light += mix(colour, vec3f(1.0, 0.97, 0.92), 0.4) * flare * (2.5 + 4.0 * edge);
  }
  return vec4f(light * mix(0.5, 1.0, m.z), 0.0);
}
`;

// Module paths and the faint incoming threads. A live module's path carries pulses of light out
// of the ring: a white-hot core in the module's colour, a halo, and a fading wake. A still path
// only glows; a module that is not built has a dotted thread that never carries light.
const PATHS = /* wgsl */ `
struct Path {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) shape: vec4f, // across -1..1, along 0..1, kind (0 path, 1 dotted, 2 thread), softness
  @location(2) @interpolate(flat) owner: vec2f, // module, halo
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Path {
  let c = stripCorner(v % 6u);
  let t = (f32(v / 6u) + c.x) / f32(${PATH_SEGMENTS});
  // The last vertex looks back instead of ahead; the side flips to keep the same normal.
  let back = t > 0.999;
  var out: Path;
  if (i >= 6u) {
    // A faint incoming thread, brightening as it reaches the ring.
    let seed = f32(i - 6u);
    let depth = hash(seed + 23.7);
    let p = lane(seed, t, depth);
    let ahead = lane(seed, select(t + 0.002, t - 0.002, back), depth);
    let position = strip(p, ahead, select(c.y, -c.y, back), mix(0.9, 0.6, depth) * scene.view.y * 1.6);
    var fade = smoothstep(0.0, 0.3, t) * (1.0 - smoothstep(0.93, 1.0, t)) * mix(0.35, 1.0, t);
    fade *= mix(0.25, 1.0, clearOfCopy(position.x)) * (1.0 - smoothstep(reveal(0.2) - 0.1, reveal(0.2), t));
    out.position = clip(position);
    out.color = mix(vec3f(0.95, 0.72, 0.42), vec3f(0.5, 0.86, 0.8), step(0.75, hash(seed + 15.7)))
      * fade * mix(0.2, 0.08, depth);
    out.shape = vec4f(c.y, t, 2.0, 2.6);
    return out;
  }
  let k = i / 2u;
  let halo = i % 2u == 1u;
  let m = moduleAt(k);
  let p = pathPoint(k, t);
  let ahead = pathPoint(k, select(t + 0.002, t - 0.002, back));
  let position = strip(p, ahead, select(c.y, -c.y, back), select(1.5, 14.0, halo) * scene.view.y * 1.6);
  // Light is strongest where it leaves the ring and settles as it reaches the label.
  out.position = clip(position);
  out.color = moduleColor(k) * m.z * mix(1.0, 0.72, t) * select(1.15, 0.2, halo);
  out.shape = vec4f(c.y, t, select(0.0, 1.0, m.w < -0.5 && !halo), select(2.6, 2.2, halo));
  out.owner = vec2f(f32(k), select(0.0, 1.0, halo));
  return out;
}

// Pulses travelling out along a live path, as brightness at a point t along it.
fn pulses(k: u32, t: f32, halo: bool) -> f32 {
  let m = moduleAt(k);
  if (m.w < 0.5) { return 0.0; }
  var sum = 0.0;
  for (var j = 0; j < 3; j++) {
    // The first pulse leaves as the opening ends.
    let u = (scene.view.z - ${FIRST_PULSE}) * ${PULSE_SPEED} + 0.05 - f32(j) / 3.0;
    if (u < 0.0) { continue; }
    let d = t - (fract(u) * 1.1 - 0.05);
    let core = exp(-d * d / select(0.00008, 0.0008, halo));
    let wake = select(0.0, exp(d / 0.08) * 0.3, d < 0.0);
    sum += core + wake;
  }
  return sum * m.z * (1.0 - smoothstep(0.9, 1.0, t)) * smoothstep(0.0, 0.04, t);
}

@fragment fn fs_main(v: Path) -> @location(0) vec4f {
  let across = v.shape.x * v.shape.x;
  var a = exp(-across * v.shape.w);
  if (v.shape.z > 0.5 && v.shape.z < 1.5) {
    a *= smoothstep(0.35, 0.5, abs(fract(v.shape.y * 46.0) - 0.5) * 2.0);
  }
  // Paths draw in from the ring once it has kindled.
  if (v.shape.z < 1.5) { a *= 1.0 - smoothstep(reveal(0.7) - 0.04, reveal(0.7), v.shape.y); }
  // Base colours are authored as display values; the HDR target holds linear light.
  var light = pow(v.color * a, vec3f(2.2)) * 2.2;
  if (v.shape.z < 0.5) {
    let k = u32(v.owner.x);
    let halo = v.owner.y > 0.5;
    let pulse = pulses(k, v.shape.y, halo);
    // The core runs white-hot; the halo keeps the module's colour.
    let hot = mix(moduleColor(k), vec3f(1.0, 0.97, 0.92), select(0.55, 0.0, halo));
    light += hot * pulse * select(exp(-across * 3.0) * 7.0, exp(-across * 6.0) * 0.6, halo);
  }
  return vec4f(light, 0.0);
}
`;

// The incoming signals, simulated on the GPU (SIM) and drawn here from its state: each is a
// streak stretched by its speed, softened by depth of field when it is near or far, fogged with
// distance, and brightening as it is drawn into the ring. A few catch the light as glints.
const SPARKS = /* wgsl */ `
// The simulation's state: one texel per signal in each of two float textures.
@group(0) @binding(1) var stateA: texture_2d<f32>; // position, depth, age
@group(0) @binding(2) var stateB: texture_2d<f32>; // velocity, seed, unused
@group(0) @binding(3) var phrases: texture_2d<f32>; // one phrase per row, white on clear
@group(0) @binding(4) var phraseSampler: sampler;

struct Spark {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) shape: vec4f, // across and along in px from the tail, half width, length
  @location(2) blur: f32,    // 0 in focus .. 1 a soft disc
}

@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Spark {
  let cell = vec2i(i32(i % ${STATE_WIDTH}u), i32(i / ${STATE_WIDTH}u));
  let pa = textureLoad(stateA, cell, 0);
  let pb = textureLoad(stateB, cell, 0);
  let seed = pb.z;
  let depth = pa.z;
  let px = scene.view.y;
  // Nearer signals move more under the pointer than farther ones.
  let pos = pa.xy + parallax(0.12) * (0.55 - depth);
  let speed = length(pb.xy);
  let dir = pb.xy / max(speed, 1e-5);
  // Depth of field: in focus around the ring's depth, soft in front and behind.
  let near = max(0.2 - depth, 0.0) / 0.2;
  let far = max(depth - 0.4, 0.0) / 0.6;
  let blur = near * near * 7.0 + far * far * 2.5;
  let signal = hash(seed + 11.9) < 0.07;
  let core = select(0.8, 1.5, signal) * mix(1.2, 0.75, depth);
  let width = core + blur;
  let tail = speed * 0.3 + 2.0 * px;
  let half = width * 0.9;
  let r = ribbon(pos - dir * (tail + half * px), pos + dir * half * px, half * px, v % 6u);

  var color = select(vec3f(1.0, 0.72, 0.36), vec3f(0.34, 0.86, 0.78), hash(seed + 15.7) < 0.22);
  color = mix(color, vec3f(0.32, 0.5, 0.52), far * 0.55);
  var level = select(0.02 + 0.06 * hash(seed + 17.9), 0.5, signal);
  // Spread over a wider disc when out of focus, so a blurred signal keeps its energy.
  level *= pow(core / width, 1.6) * exp(-depth * 0.8);
  let rel = (pos - scene.ring.xy) / scene.ring.z;
  level *= 1.0 + 3.0 * exp(-dot(rel, rel) * 1.5);
  // Entering the ring, a signal dissolves into its light.
  level *= smoothstep(scene.ring.z * 0.12, scene.ring.z * 0.45, length(goal(seed) - pa.xy));
  level *= mix(0.3, 1.0, smoothstep(0.0, 0.2, depth));
  // Faint where it enters at the left edge, gathering light as it travels toward the ring.
  let travelled = clamp((pos.x + scene.view.x) / max(scene.ring.x + scene.view.x, 0.1), 0.0, 1.0);
  level *= smoothstep(0.0, 0.55, travelled) * mix(0.5, 1.4, travelled);
  level *= smoothstep(0.0, 1.2, pa.w) * mix(0.25, 1.0, clearOfCopy(pos.x));
  // A rare glint: a short, very bright flash that the lens turns into a streak.
  if (hash(seed + 31.3) < 0.03) {
    level *= 1.0 + 60.0 * pow(max(sin(scene.view.z * (0.5 + hash(seed + 2.3)) + seed * 7.0), 0.0), 80.0);
  }
  var along = array<f32, 6>(0.0, 1.0, 0.0, 0.0, 1.0, 1.0);
  var out: Spark;
  out.position = clip(r.xy);
  out.color = color * level;
  let full = tail / px + half * 2.0;
  out.shape = vec4f(r.z * half, along[v % 6u] * full, half, full);
  out.blur = min(blur / 4.0, 1.0);
  // Some signals are words: a phrase from some field, in some language, level and readable, fading
  // as it leaves focus and dissolving as it enters the ring.
  if (hash(seed + 51.7) < ${PHRASE_SHARE} && hash(seed + 41.3) >= 0.035) {
    var corners = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));
    let c = corners[v % 6u];
    let h = 5.5 * mix(1.35, 0.8, depth) * px;
    let size = vec2f(h * ${(PHRASE_W / PHRASE_H).toFixed(4)}, h);
    out.position = clip(pos + c * size);
    let row = floor(hash(seed + 61.1) * ${PHRASES.length}.0);
    let entering = smoothstep(scene.ring.z * 0.6, scene.ring.z * 1.7, length(goal(seed) - pa.xy));
    let words = 0.3 * smoothstep(0.05, 0.45, travelled) * entering * smoothstep(0.0, 1.2, pa.w)
      * mix(0.03, 1.0, clearOfCopy(pos.x)) * (1.0 - min(blur / 1.5, 1.0));
    out.color = mix(vec3f(1.0, 0.86, 0.66), color, 0.3) * words;
    out.shape = vec4f(c.x * 0.5 + 0.5, 0.5 - c.y * 0.5, -2.0, row);
    return out;
  }
  // About one signal in thirty is a small page, an article seen face on, drifting in to be read.
  if (hash(seed + 41.3) < 0.035) {
    var corners = array<vec2f, 6>(
      vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
      vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0));
    let c = corners[v % 6u];
    let tilt = hash(seed + 5.9) * 0.6 - 0.3 + scene.view.z * 0.05;
    let card = (vec2f(6.0, 8.0) * mix(1.4, 0.7, depth) + vec2f(blur)) * px;
    let q = vec2f(c.x * card.x, c.y * card.y);
    out.position = clip(pos + vec2f(q.x * cos(tilt) - q.y * sin(tilt), q.x * sin(tilt) + q.y * cos(tilt)));
    out.color = mix(vec3f(1.0, 0.8, 0.52), color, 0.35) * level * 2.2;
    out.shape = vec4f(c, -1.0, 0.0);
  }
  return out;
}

// A bar of the page template, anti-aliased at any size: rows of text and the headline.
fn bar(q: vec2f, y: f32, x1: f32, thick: f32, aa: f32) -> f32 {
  return smoothstep(thick + aa, thick - aa, abs(q.y - y)) * smoothstep(x1 + aa, x1 - aa, q.x)
    * smoothstep(-0.72 - aa, -0.72 + aa, q.x);
}

@fragment fn fs_main(s: Spark) -> @location(0) vec4f {
  // Derivatives only in uniform control flow: taken here, used by the page's bars below.
  let aa = max(fwidth(s.shape.y), 0.02);
  if (s.shape.z < -1.5) {
    let a = textureSampleLevel(phrases, phraseSampler, vec2f(s.shape.x, (s.shape.w + s.shape.y) / ${PHRASES.length}.0), 0.0).a;
    return vec4f(s.color * a, 0.0);
  }
  if (s.shape.z < 0.0) {
    // A page: a thin bright frame, a headline, lines of text; out of focus, a soft glow.
    let q = s.shape.xy;
    let r = max(abs(q.x), abs(q.y));
    let edge = smoothstep(0.78, 0.9, r) * (1.0 - smoothstep(0.92, 1.0, r));
    let face = 0.14 * (1.0 - smoothstep(0.9, 1.0, r));
    var text = bar(q, 0.6, 0.42, 0.075, aa);
    for (var k = 0; k < 5; k++) {
      text = max(text, 0.55 * bar(q, 0.3 - f32(k) * 0.22, select(0.68, 0.36, k % 2 == 1), 0.035, aa));
    }
    let soft = 0.35 * (1.0 - smoothstep(0.4, 1.0, length(q)));
    return vec4f(s.color * mix(face + edge + text * 0.9, soft, s.blur), 0.0);
  }
  // A capsule: distance in px to the segment between the two round ends.
  let half = s.shape.z;
  let d = length(vec2f(s.shape.x, s.shape.y - clamp(s.shape.y, half, s.shape.w - half))) / half;
  // In focus a soft line; out of focus a flatter disc with a faint rim, as a lens renders it.
  let sharp = exp(-d * d * 3.0);
  let disc = (1.0 - smoothstep(0.7, 1.0, d)) * (0.75 + 0.25 * smoothstep(0.3, 0.85, d));
  // The tail fades: the streak is the path it moved along while the shutter was open.
  let fade = mix(0.12, 1.0, smoothstep(0.0, s.shape.w, s.shape.y));
  return vec4f(s.color * mix(sharp, disc, s.blur) * fade, 0.0);
}
`;

// The simulation step for the incoming signals, one texel per signal: a fragment pass reads last
// frame's state textures and writes this frame's (ping-pong). A render pass rather than a compute
// dispatch, so it rides in the frame's own command buffer: a dispatch is a submit of its own, and
// each cost the main thread about as much as all the frame's other passes together. Each is steered toward its own point in the ring's opening,
// carried by curl-noise turbulence while it is far away, swept into a spiral as it is captured,
// and reborn at the left edge once it has entered the ring.
const SIM = /* wgsl */ `
struct Particle { a: vec4f, b: vec4f } // position, depth, age | velocity, seed, unused
@group(0) @binding(1) var srcA: texture_2d<f32>;
@group(0) @binding(2) var srcB: texture_2d<f32>;

// Divergence-free turbulence: the curl of a slowly changing noise field.
fn curl(p: vec2f, t: f32) -> vec2f {
  let e = 0.04;
  let dy = fbm(vec3f(p + vec2f(0.0, e), t)) - fbm(vec3f(p - vec2f(0.0, e), t));
  let dx = fbm(vec3f(p + vec2f(e, 0.0), t)) - fbm(vec3f(p - vec2f(e, 0.0), t));
  return vec2f(dy, -dx) / (2.0 * e);
}

// A new signal at the left edge. \`along\` places it partway along its route instead, so the
// scene can start full; a negative age holds it back, invisible, for a staggered entrance.
fn spawn(seed: f32, along: f32, delay: f32) -> Particle {
  let depth = hash(seed + 23.7);
  let y = scene.ring.y + (hash(seed + 1.7) * 2.0 - 1.0) * scene.extra.y * mix(0.8, 1.3, depth);
  let start = vec2f(-scene.view.x - 0.05 - hash(seed + 2.9) * 0.15, y);
  let end = goal(seed);
  let u = hash(seed + 7.7) * along;
  let pos = mix(start, end, u) + vec2f(0.0, (start.y - end.y) * u * (1.0 - u) * 0.6);
  let speed = mix(0.12, 0.3, hash(seed + 9.1));
  var p: Particle;
  p.a = vec4f(pos, depth, -hash(seed + 4.4) * delay);
  p.b = vec4f(speed, 0.0, seed, 0.0);
  return p;
}

fn step(p: Particle, i: u32) -> Particle {
  let reset = scene.motion.y;
  if (reset > 0.5) {
    // 1: stream in from the left over the opening seconds; 2: already in flow.
    let first = f32(i) * 1.618 + 1.0;
    if (reset > 1.5) { return spawn(first, 1.0, 0.0); }
    return spawn(first, 0.45, 2.5);
  }
  let dt = scene.motion.x;
  let seed = p.b.z;
  let depth = p.a.z;
  var pos = p.a.xy;
  let toGoal = goal(seed) - pos;
  let dist = length(toGoal);
  let speed = mix(0.12, 0.3, hash(seed + 9.1)) * mix(1.15, 0.7, depth);
  // Drawn in, faster as it nears the ring.
  var want = toGoal / max(dist, 1e-4) * speed * (1.0 + 0.9 / (1.0 + dist * 4.0));
  want += curl(pos * 1.2 + vec2f(depth * 3.0, 0.0), scene.view.z * 0.04) * 0.03 * smoothstep(0.05, 0.7, dist);
  // Captured: a swirl around the ring's centre, in the ring's own foreshortened plane.
  let rel = (pos - scene.ring.xy) / scene.ring.z;
  let e = vec2f(rel.x / 0.55, rel.y);
  let capture = 1.0 - smoothstep(0.4, 1.5, length(e));
  want += vec2f(-e.y * 0.55, e.x) / max(length(e), 0.1) * capture * speed * 0.9;
  let vel = mix(p.b.xy, want, 1.0 - exp(-dt * 1.6));
  pos += vel * dt;
  let age = p.a.w + dt;
  if (dist < scene.ring.z * 0.12 || age > 90.0) { return spawn(seed + 101.37, 0.0, 0.0); }
  var next: Particle;
  next.a = vec4f(pos, depth, age);
  next.b = vec4f(vel, seed, 0.0);
  return next;
}

struct State {
  @location(0) a: vec4f,
  @location(1) b: vec4f,
}

@fragment fn fs_main(@builtin(position) at: vec4f) -> State {
  let cell = vec2i(at.xy);
  var p: Particle;
  p.a = textureLoad(srcA, cell, 0);
  p.b = textureLoad(srcB, cell, 0);
  let next = step(p, u32(cell.y) * ${STATE_WIDTH}u + u32(cell.x));
  return State(next.a, next.b);
}
`;

// Light shafts: each pixel gathers the bright light on the line back to the ring (a screen-space
// radial blur, after Mitchell in GPU Gems 3), broken into beams by slowly turning noise.
const SHAFTS = /* wgsl */ `
fn shaftsAt(uv: vec2f) -> vec3f {
  let d = uv - toUv(scene.ring.xy);
  let step = d * (0.9 / 24.0);
  var p = uv;
  var sum = vec3f(0.0);
  var w = 1.0;
  for (var i = 0; i < 24; i++) {
    p -= step;
    sum += textureSampleLevel(src, linear, p, 0.0).rgb * w;
    w *= 0.93;
  }
  let beams = pow(noise(vec3f(atan2(d.y, d.x * scene.view.x) * 12.0, scene.view.z * 0.06, 3.1)), 1.5);
  let reach = exp(-length(d * vec2f(scene.view.x, 1.0)) * 3.5);
  return sum / 11.0 * beams * reach * clearOfCopy(fromUv(uv).x);
}
`;

// Anamorphic streaks: only the brightest light (the filament's surges, pulses and glints),
// smeared horizontally, as a widescreen lens does.
const STREAKS = /* wgsl */ `
fn streaksAt(uv: vec2f) -> vec3f {
  let texel = 1.0 / f32(textureDimensions(src).x);
  var sum = vec3f(0.0);
  for (var i = -20; i <= 20; i++) {
    let x = f32(i);
    // Half a texel off, so linear filtering averages each pair and no texel is skipped.
    let c = textureSampleLevel(src, linear, uv + vec2f((x * 2.0 + 0.5) * texel, 0.0), 0.0).rgb;
    sum += max(c - vec3f(2.5), vec3f(0.0)) * exp(-abs(x) / 7.0);
  }
  return sum / 14.0;
}
`;

// Haze, shafts and streaks share one pass at the effects' scale, one attachment each.
const AIR = /* wgsl */ `
struct Air {
  @location(0) haze: vec4f,
  @location(1) shafts: vec4f,
  @location(2) streaks: vec4f,
}

@fragment fn fs_main(@location(0) uv: vec2f) -> Air {
  var out: Air;
  out.haze = vec4f(hazeAt(uv), 0.0);
  if (scene.quality.x > 0.5) { out.shafts = vec4f(shaftsAt(uv), 0.0); }
  if (scene.quality.y > 0.5) { out.streaks = vec4f(streaksAt(uv), 0.0); }
  return out;
}
`;

// Final pass: exposure, bloom and AgX tone mapping, so bright light rolls off to white instead of
// clipping to a flat colour. The canvas composites premultiplied over the page; alpha only darkens
// the page a little under strong light.
const COMPOSITE = /* wgsl */ `
@group(0) @binding(3) var bloom: texture_2d<f32>;
@group(0) @binding(4) var shafts: texture_2d<f32>;
@group(0) @binding(5) var streaks: texture_2d<f32>;
@group(0) @binding(6) var haze: texture_2d<f32>;
@group(0) @binding(7) var bloomNext: texture_2d<f32>;


@fragment fn fs_main(@location(0) uv: vec2f, @builtin(position) pixel: vec4f) -> @location(0) vec4f {
  // A faint chromatic fringe toward the frame's edges, as from a real lens: red and blue part.
  let d = uv - 0.5;
  let fringe = d * dot(d, d) * 0.007;
  var light = vec3f(
    textureSampleLevel(src, linear, uv - fringe, 0.0).r,
    textureSampleLevel(src, linear, uv, 0.0).g,
    textureSampleLevel(src, linear, uv + fringe, 0.0).b) * scene.extra.w;
  light += textureSampleLevel(haze, linear, uv, 0.0).rgb * scene.extra.w;
  // Energy-conserving: the bright part of each pixel is taken away and returned spread out.
  // The last step of the bloom's upsampling happens here, which saves a pass.
  let spread = (textureSampleLevel(bloom, linear, uv, 0.0).rgb
    + upsample(bloomNext, uv) * ${BLOOM_TAIL}) / ${BLOOM_WEIGHT};
  light += ${BLOOM_STRENGTH} * (spread - bright(light));
  light += textureSampleLevel(shafts, linear, uv, 0.0).rgb * ${SHAFT_STRENGTH} * scene.quality.x;
  light += textureSampleLevel(streaks, linear, uv, 0.0).rgb * vec3f(0.55, 0.85, 1.0) * ${STREAK_STRENGTH} * scene.quality.y;
  // The water mirrors the ring, the filament and the signals above it, broken by ripples and
  // fading with depth and away from the ring.
  let p = fromUv(uv);
  let surface = waterY();
  if (p.y < surface) {
    let below = surface - p.y;
    let t = scene.view.z;
    let wobble = (sin(p.y * 90.0 - t * 1.6 + sin(p.x * 13.0) * 1.5) * 0.6
      + sin(p.y * 57.0 + p.x * 31.0 - t * 1.1) * 0.4) * 0.005 * (0.3 + below * 3.0);
    let mirror = toUv(vec2f(p.x + wobble, 2.0 * surface - p.y));
    // Mostly the blurred light: water softens what it mirrors.
    let seen = textureSampleLevel(src, linear, mirror, 0.0).rgb * scene.extra.w * 0.55
      + textureSampleLevel(bloom, linear, mirror, 0.0).rgb / ${BLOOM_WEIGHT} * 1.2;
    let reach = exp(-below / (scene.ring.z * 0.8))
      * exp(-pow((p.x - scene.ring.x) / (scene.ring.z * 2.2), 2.0));
    light += seen * vec3f(0.75, 0.85, 0.9) * 0.34 * reach * clearOfCopy(p.x);
  }
  // A restrained grade: shadows lean teal, highlights gold.
  light *= mix(vec3f(0.9, 1.02, 1.05), vec3f(1.05, 1.0, 0.9), smoothstep(0.02, 1.5, luma(light)));
  var c = encode(agx(light));
  var alpha = max(c.r, max(c.g, c.b)) * 0.3;
  // A vignette darkens the page beneath the corners too, drawing the eye to the ring.
  let edge = smoothstep(0.35, 0.95, length(d * vec2f(1.0, 1.3)));
  c *= 1.0 - edge * 0.35;
  alpha = max(alpha, edge * 0.28);
  // Film grain, a new pattern each 24th of a second, strongest in the mid-tones.
  let n = fract(sin(dot(vec3f(floor(pixel.xy), floor(scene.view.z * 24.0)), vec3f(12.9898, 78.233, 37.719))) * 43758.5453) - 0.5;
  c = max(c + n * 0.045 * (0.2 + c * (1.0 - c) * 2.5), vec3f(0.0));
  alpha = clamp(alpha + n * 0.03, 0.0, 1.0);
  return vec4f(c, alpha);
}
`;

/**
 * Throws when the browser has no usable hardware WebGPU adapter or the scene fails to build; the
 * page keeps its static art. The scene talks to WebGPU directly: its pipelines, bind groups and
 * pass descriptors are built once and rebuilt only when the size or the quality tier changes, so
 * a frame is one command buffer of ten passes and costs the main thread little.
 */
export async function createHeroScene(
  canvas: HTMLCanvasElement,
  {
    small,
    captureOnly = false,
    focalObject = true,
    object,
    robot = false,
    robotReaction = true,
    storyPaths,
  }: {
    small: boolean;
    captureOnly?: boolean;
    focalObject?: boolean;
    object?: StoryObjectKind;
    robot?: boolean;
    robotReaction?: boolean;
    storyPaths?: readonly (readonly [number, number, number, number, number?])[];
  }
): Promise<HeroScene> {
  if (
    storyPaths &&
    (!storyPaths.length ||
      storyPaths.length > 32 ||
      storyPaths.some((path) =>
        path.some(
          (value) => value !== undefined && (!Number.isFinite(value) || value < 0 || value > 1)
        )
      ))
  ) {
    throw new Error("Invalid illustrative hero paths");
  }
  const robotGeometry = robot ? await import("./robot-geometry.ts") : null;
  const objectGeometry = object ? await import("./story-object-geometry.ts") : null;
  const gpu = await openGpu(canvas);
  const { device, context, format, timed, failed, fail } = gpu;
  try {
    return await build();
  } catch (error) {
    gpu.close();
    throw error;
  }

  async function build(): Promise<HeroScene> {
    let tier: Tier = small ? "half" : "full";
    let settings = TIERS[tier];
    canvas.dataset.tier = tier;

    // One uniform block for every pass, laid out as the Scene struct: ten vec4s.
    const values = new Float32Array(44);
    const sceneBuffer = device.createBuffer({
      size: values.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const put = (slot: number, ...v: number[]) => values.set(v, slot * 4);
    const linear = device.createSampler({ minFilter: "linear", magFilter: "linear" });

    const { pipeline, full, bind, texture, pass } = createKit(device);
    const add = [{ format: HALF, blend: ADDITIVE }];

    // Same Home material/HDR/quality lifecycle; only the internal story geometry differs.
    const storyCode = storyPaths
      ? `
struct StoryVertex {
  @builtin(position) position: vec4f,
  @location(0) along: f32,
  @location(1) across: f32,
  @location(2) @interpolate(flat) index: u32,
}
fn storyPoint(k: u32, t: f32) -> vec2f {
  var routes = array<vec4f, ${storyPaths.length}>(${storyPaths
    .map(
      (p) =>
        `vec4f(${p
          .slice(0, 4)
          .map((v) => v!.toFixed(6))
          .join(",")})`
    )
    .join(",")});
  let r = routes[k];
  let a = mix(scene.story.xy, scene.story.zw, vec2f(r.x, 1.0-r.y));
  let b = mix(scene.story.xy, scene.story.zw, vec2f(r.z, 1.0-r.w));
  let mid = (a.x+b.x)*0.5;
  return bezier(a,vec2f(mid,a.y),vec2f(mid,b.y),b,t);
}
@vertex fn vs_main(@builtin(vertex_index) v: u32, @builtin(instance_index) k: u32) -> StoryVertex {
  let c = stripCorner(v % 6u);
  let t = (f32(v/6u)+c.x)/${PATH_SEGMENTS}.0;
  let p = storyPoint(k,t);
  let next = storyPoint(k,min(1.0,t+0.002));
  let before = storyPoint(k,max(0.0,t-0.002));
  let tangent = normalize(next-before+vec2f(0.00001,0.0));
  var out: StoryVertex;
  out.position = clip(p + vec2f(-tangent.y,tangent.x)*c.y*scene.view.y*2.0);
  out.along = t;
  out.across = c.y;
  out.index = k;
  return out;
}
@fragment fn fs_main(p: StoryVertex) -> @location(0) vec4f {
  var levels = array<f32,${storyPaths.length}>(${storyPaths.map((p) => (p[4] ?? 1).toFixed(6)).join(",")});
  var colors = array<vec3f,5>(vec3f(.4,.86,.75),vec3f(.7,.57,1.),vec3f(1.,.76,.4),vec3f(.4,.75,1.),vec3f(1.,.57,.5));
  var speeds = array<f32,${storyPaths.length}>(${storyPaths.map((_, i) => threadSpeed(i).toFixed(6)).join(",")});
  var offsets = array<f32,${storyPaths.length}>(${storyPaths.map((_, i) => threadOffset(i).toFixed(6)).join(",")});
  let speed = speeds[p.index];
  let phase = fract(p.along-scene.view.z*speed+offsets[p.index]);
  // Phase increases ahead of the head; its wrapped negative distance is the trailing side.
  let distance = min(phase,1.0-phase);
  let tail = 1.0-phase;
  let pulse = exp(-pow(distance/.008,2.0)) + .32*exp(-tail/.055);
  let color = colors[u32(floor(hash(f32(p.index)+floor(scene.view.z*speed))*5.0))];
  let edge = exp(-p.across*p.across*5.0);
  let line = mix(vec3f(.32,.46,.48),color,pulse*.6);
  return vec4f(line*edge*(.22+pulse*3.5)*levels[p.index]*kindle(),0.0);
}`
      : PATHS;
    const code = {
      sim: HEAD + COMMON + SIM,
      floor: HEAD + COMMON + FLOOR,
      filament: HEAD + COMMON + FILAMENT_LINE,
      paths: HEAD + COMMON + storyCode,
      sparks: HEAD + COMMON + SPARKS,
      emblems: HEAD + COMMON + EMBLEMS,
      ring:
        HEAD +
        COMMON +
        (robotGeometry
          ? robotGeometry.ROBOT.replace(
              "const TASK_REACTION = true;",
              `const TASK_REACTION = ${robotReaction};`
            )
          : objectGeometry && object
            ? objectGeometry.objectShader(object)
            : RING),
      merge: HEAD + MERGE,
      prefilter: HEAD + COMMON + BLOOM + PREFILTER,
      down: HEAD + COMMON + BLOOM + DOWNSAMPLE,
      up: HEAD + COMMON + BLOOM + UPSAMPLE,
      air: HEAD + COMMON + BLOOM + HAZE + SHAFTS + STREAKS + AIR,
      composite: HEAD + COMMON + BLOOM + TONE + COMPOSITE,
    };
    // Building every pipeline now means a shader error shows the static art, not an empty canvas.
    const [
      sim,
      floor,
      filament,
      paths,
      sparks,
      emblems,
      ring,
      merge,
      prefilter,
      down,
      up,
      air,
      composite,
    ] = await Promise.all([
      full(code.sim, [{ format: FLOAT }, { format: FLOAT }]),
      pipeline(code.floor, add),
      pipeline(code.filament, add),
      pipeline(code.paths, add),
      pipeline(code.sparks, add),
      pipeline(code.emblems, add),
      pipeline(code.ring, [{ format: HALF }], { msaa: true, depth: true }),
      full(code.merge, add),
      full(code.prefilter, [{ format: HALF }]),
      full(code.down, [{ format: HALF }]),
      full(code.up, add),
      full(code.air, [{ format: HALF }, { format: HALF }, { format: HALF }]),
      full(code.composite, [{ format }]),
    ]);

    // The incoming signals live on the GPU, one texel each in two float textures (position and
    // velocity). Two such states alternate: a step reads one and writes the other, and the
    // signals are drawn from the one just written.
    const capacity = small ? 800 : 2400;
    const stateSize: [number, number] = [STATE_WIDTH, Math.ceil(capacity / STATE_WIDTH)];
    const states = [0, 1].map(() => [texture(stateSize, FLOAT), texture(stateSize, FLOAT)]);
    const stateViews = states.map((pair) => pair.map((t) => t.createView()));
    const simGroups = stateViews.map(([a, b]) =>
      bind(code.sim, { scene: { buffer: sceneBuffer }, srcA: a!, srcB: b! })
    );
    // The phrases, drawn once into a texture: white words on clear, one per row, centred.
    const words = document.createElement("canvas");
    words.width = PHRASE_W;
    words.height = PHRASE_H * PHRASES.length;
    const pen = words.getContext("2d")!;
    pen.font = `500 ${PHRASE_H * 0.7}px system-ui, "Segoe UI", "Noto Sans", sans-serif`;
    pen.textAlign = "center";
    pen.textBaseline = "middle";
    pen.fillStyle = "#fff";
    PHRASES.forEach((text, i) =>
      pen.fillText(text, PHRASE_W / 2, (i + 0.5) * PHRASE_H, PHRASE_W - 8)
    );
    const phraseTexture = device.createTexture({
      size: [words.width, words.height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: words }, { texture: phraseTexture }, [
      words.width,
      words.height,
    ]);
    const phrases = phraseTexture.createView();
    const sparkGroups = stateViews.map(([a, b]) =>
      bind(code.sparks, {
        scene: { buffer: sceneBuffer },
        stateA: a!,
        stateB: b!,
        phrases,
        phraseSampler: linear,
      })
    );
    const statePasses = stateViews.map((views) => pass(views));
    const sceneGroup = bind(code.floor, { scene: { buffer: sceneBuffer } });

    // Everything sized by the canvas and the tier; rebuilt together when either changes.
    let sized: ReturnType<typeof size> | null = null;
    let ringSize = 0;
    function size(width: number, height: number) {
      const hdr = texture([width, height], HALF);
      const level = (i: number): [number, number] => [
        Math.max(1, width >> (i + settings.effects)),
        Math.max(1, height >> (i + settings.effects)),
      ];
      const bloom = Array.from({ length: BLOOM_LEVELS }, (_, i) => texture(level(i), HALF));
      const airs = [0, 1, 2].map(() => texture(level(1), HALF));
      const band = texture([ringSize, ringSize], HALF, 4);
      const bandResolved = texture([ringSize, ringSize], HALF);
      const bandDepth = device.createTexture({
        size: [ringSize, ringSize],
        format: "depth24plus",
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
      const v = (t: GPUTexture) => t.createView();
      const scene = { buffer: sceneBuffer };
      const bloomViews = bloom.map(v);
      const airViews = airs.map(v);
      return {
        textures: [hdr, ...bloom, ...airs, band, bandResolved, bandDepth],
        hdr: pass([v(hdr)]),
        hdrLoad: pass([v(hdr)], "load"),
        ring: {
          colorAttachments: [
            {
              view: v(band),
              resolveTarget: v(bandResolved),
              loadOp: "clear",
              storeOp: "discard",
              clearValue: [0, 0, 0, 0],
            },
          ],
          depthStencilAttachment: {
            view: v(bandDepth),
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "discard",
          },
        } satisfies GPURenderPassDescriptor,
        bloom: bloomViews.map((view) => pass([view])),
        bloomLoad: bloomViews.map((view) => pass([view], "load")),
        air: pass(airViews),
        groups: {
          ring: bind(code.ring, { scene, behind: v(hdr), linear }),
          merge: bind(code.merge, { scene, band: v(bandResolved), linear }),
          prefilter: bind(code.prefilter, { scene, src: v(hdr), linear }),
          down: bloomViews.slice(0, -1).map((src) => bind(code.down, { scene, src, linear })),
          // Each level adds into the next larger one; the last step, into level 0, is in the
          // composite.
          up: bloomViews.slice(2).map((src) => bind(code.up, { scene, src, linear })),
          air: bind(code.air, { scene, src: bloomViews[1]!, linear }),
          composite: bind(code.composite, {
            scene,
            src: v(hdr),
            linear,
            bloom: bloomViews[0]!,
            bloomNext: bloomViews[1]!,
            haze: airViews[0]!,
            shafts: airViews[1]!,
            streaks: airViews[2]!,
          }),
        },
      };
    }

    let layout: HeroLayout | null = null;
    let time = 0;
    let last = 0;
    let loop = 0;
    let seeded = false;
    let latest = 0;
    let drawn = Math.round(capacity * settings.particles);
    let ringBox = [0, 0, 1, 1] as [number, number, number, number];
    // The pointer is followed with an exponential ease, so the ring's turn glides and settles.
    const aim: [number, number] = [0, 0];
    const eased: [number, number] = [0, 0];

    // Sizes follow the layout and the tier: the canvas at the tier's pixel ratio, and the ring's
    // layer, a box around the ring.
    const fit = () => {
      if (!layout) return;
      const height = 2 / layout.px;
      const ratio = Math.min(devicePixelRatio || 1, settings.dpr);
      const w = Math.max(1, Math.round(layout.aspect * height * ratio));
      const h = Math.max(1, Math.round(height * ratio));
      const [x, y, r] = layout.ring;
      const half = Math.ceil((r * 1.45 * h) / 2);
      const changed = !sized || canvas.width !== w || canvas.height !== h || ringSize !== half * 2;
      if (changed) {
        canvas.width = w;
        canvas.height = h;
        ringSize = half * 2;
        for (const t of sized?.textures ?? []) t.destroy();
        sized = size(w, h);
      }
      const left = Math.round(((x / layout.aspect + 1) / 2) * w) - half;
      const top = Math.round(((1 - y) / 2) * h) - half;
      ringBox = [left, top, half * 2, half * 2];
      put(
        7,
        (((left + half) / w) * 2 - 1) * layout.aspect,
        1 - ((top + half) / h) * 2,
        ringSize / h,
        ringSize / h
      );
      put(8, +settings.shafts, +settings.streaks, +settings.refraction, ringSize);
    };

    const useTier = (next: Tier) => {
      tier = next;
      settings = TIERS[next];
      drawn = Math.round(capacity * settings.particles);
      canvas.dataset.tier = next;
      for (const t of sized?.textures ?? []) t.destroy();
      sized = null;
      fit();
    };

    // Measure the GPU time of a few dozen frames with timestamps at the first pass's start and
    // the last pass's end, then keep the tier or step down and measure again. Timing stops once a
    // tier fits, so a settled scene pays nothing for it.
    const querySet = timed ? device.createQuerySet({ type: "timestamp", count: 2 }) : null;
    const resolved = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    const readbacks = [0, 1, 2].map(() =>
      device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST })
    );
    const samples: number[] = [];
    let warmup = 20;
    let measuring = false;
    const sample = (readback: GPUBuffer) =>
      readback.mapAsync(GPUMapMode.READ).then(
        () => {
          const [begin, end] = new BigInt64Array(readback.getMappedRange());
          readback.unmap();
          readbacks.push(readback);
          if (!measuring || begin === undefined || end === undefined) return;
          samples.push(Number(end - begin) / 1e6);
          if (samples.length < 45) return;
          measuring = false;
          const sorted = [...samples].sort((a, b) => a - b);
          canvas.dataset.gpuMs = sorted[sorted.length >> 1]!.toFixed(2);
          const next = nextTier(tier, samples);
          samples.length = 0;
          if (next !== tier) {
            useTier(next);
            warmup = 20;
          } else warmup = Infinity;
        },
        () => {}
      );

    const encode = () => {
      if (!sized) return;
      const s = sized;
      const readback = measuring && querySet ? readbacks.pop() : undefined;
      const encoder = device.createCommandEncoder();
      const run = (
        descriptor: GPURenderPassDescriptor,
        draw: (p: GPURenderPassEncoder) => void,
        timing?: GPURenderPassTimestampWrites
      ) => {
        const p = encoder.beginRenderPass(
          readback && timing ? { ...descriptor, timestampWrites: timing } : descriptor
        );
        draw(p);
        p.end();
      };
      const fullscreen = (
        p: GPURenderPassEncoder,
        pipe: GPURenderPipeline,
        group: GPUBindGroup
      ) => {
        p.setPipeline(pipe);
        p.setBindGroup(0, group);
        p.draw(3);
      };
      run(statePasses[latest]!, (p) => fullscreen(p, sim, simGroups[1 - latest]!), {
        querySet: querySet!,
        beginningOfPassWriteIndex: 0,
      });
      run(s.hdr, (p) => {
        p.setBindGroup(0, sceneGroup);
        if (!captureOnly) {
          p.setPipeline(floor);
          p.draw(FLOOR_RINGS * FLOOR_SEGMENTS * 6);
        }
        p.setPipeline(filament);
        if (focalObject && !robot) p.draw(RING_SEGMENTS * 6);
        // Memory supplies semantic fragments/relationships in SVG over this same capture ring.
        // Home keeps its original signal simulation, module paths and emblems.
        if (storyPaths) {
          p.setPipeline(paths);
          p.draw(PATH_SEGMENTS * 6, storyPaths.length);
        } else if (!captureOnly) {
          p.setPipeline(paths);
          p.draw(PATH_SEGMENTS * 6, 6 + (small ? 18 : THREADS));
          p.setPipeline(emblems);
          p.draw(EMBLEM_VERTICES, 9);
          p.setPipeline(sparks);
          p.setBindGroup(0, sparkGroups[latest]!);
          p.draw(6, drawn);
        }
      });
      run(s.ring, (p) => {
        p.setPipeline(ring);
        p.setBindGroup(0, s.groups.ring);
        if (robotGeometry) p.draw(robotGeometry.ROBOT_VERTICES, robotGeometry.ROBOT_PARTS);
        else if (object)
          p.draw(
            object === "prism" ? 24 : 36,
            object === "prism" ? 1 : object === "ledger" ? 3 : 5
          );
        else if (focalObject) p.draw(RING_SEGMENTS * RING_ALONG * 6, 3);
      });
      run(s.hdrLoad, (p) => {
        p.setViewport(...ringBox, 0, 1);
        fullscreen(p, merge, s.groups.merge);
      });
      run(s.bloom[0]!, (p) => fullscreen(p, prefilter, s.groups.prefilter));
      s.groups.down.forEach((group, i) => run(s.bloom[i + 1]!, (p) => fullscreen(p, down, group)));
      // Haze, shafts and streaks read the bright light before upsampling adds to it.
      run(s.air, (p) => fullscreen(p, air, s.groups.air));
      for (let i = s.groups.up.length - 1; i >= 0; i--) {
        run(s.bloomLoad[i + 1]!, (p) => fullscreen(p, up, s.groups.up[i]!));
      }
      run(
        pass([context.getCurrentTexture().createView()]),
        (p) => fullscreen(p, composite, s.groups.composite),
        { querySet: querySet!, endOfPassWriteIndex: 1 }
      );
      if (readback) {
        encoder.resolveQuerySet(querySet!, 0, 2, resolved, 0);
        encoder.copyBufferToBuffer(resolved, 0, readback, 0, 16);
      }
      device.queue.submit([encoder.finish()]);
      if (readback) void sample(readback);
    };

    const render = (animated: boolean, dt = 0) => {
      if (!layout) return;
      // The first frame places the signals: streaming in when animated, already in flow when still.
      const reset = seeded ? 0 : animated ? 1 : 2;
      seeded = true;
      const follow = animated ? 1 - Math.exp(-dt * 1.8) : 1;
      eased[0] += (aim[0] - eased[0]) * follow;
      eased[1] += (aim[1] - eased[1]) * follow;
      latest ^= 1;
      put(0, layout.aspect, layout.px, time, 2 ** (settings.effects - 1));
      // Over the hero, the ring turns toward the pointer; it settles back when the pointer leaves.
      put(1, ...layout.ring, eased[0] * TURN[0]);
      put(5, layout.copyEdge, layout.spread, eased[1] * TURN[1], EXPOSURE);
      put(6, dt, reset, eased[0], eased[1]);
      device.queue.writeBuffer(sceneBuffer, 0, values);
      encode();
    };

    const stop = () => {
      cancelAnimationFrame(loop);
      loop = 0;
    };

    return {
      lost: Promise.race([device.lost.then(() => undefined), failed]),
      update(next) {
        layout = next;
        const [a, b, c] = next.modules;
        put(2, ...(a ?? [0, 0, 0, 0]));
        put(3, ...(b ?? [0, 0, 0, 0]));
        put(4, ...(c ?? [0, 0, 0, 0]));
        put(9, next.iconRadius, 0, 0, 0);
        put(10, ...(next.storyBox ?? [0, 0, 0, 0]));
        fit();
        if (!loop) render(false);
      },
      pointer(x, y) {
        aim[0] = x;
        aim[1] = y;
      },
      start() {
        if (loop) return;
        last = performance.now();
        const tick = (now: number) => {
          loop = requestAnimationFrame(tick);
          // Frames are drawn at FPS; a millisecond of slack keeps an even cadence on displays
          // whose refresh rate is a multiple of it.
          if (now - last < 1000 / FPS - 1) return;
          // Time only advances while visible, so the scene resumes where it paused.
          const dt = Math.min(now - last, 100) / 1000;
          time += dt;
          last = now;
          if (querySet && !measuring && --warmup === 0) measuring = true;
          try {
            render(true, dt);
          } catch {
            stop();
            fail();
          }
        };
        loop = requestAnimationFrame(tick);
      },
      get elapsed() {
        return time;
      },
      stop,
      still() {
        stop();
        // A scene that is first seen still is shown settled, after its opening.
        if (!seeded) time = SETTLED;
        render(false);
      },
      dispose() {
        stop();
        context.unconfigure();
        device.destroy();
      },
    };
  }
}
