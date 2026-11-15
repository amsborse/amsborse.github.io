/** A source of uniform numbers in [0, 1). Injected everywhere so tests are seeded and exact. */
export type Rng = () => number;

/** Small, fast, seeded generator (mulberry32). Deterministic for a given seed. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform numbers from the platform's cryptographic source, for real visitors. */
export function cryptoRng(): Rng {
  const buffer = new Uint32Array(1);
  return () => {
    crypto.getRandomValues(buffer);
    return buffer[0] / 4294967296;
  };
}

function normal(rng: Rng): number {
  // Box-Muller; 1 - u keeps the log away from zero.
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Gamma(shape, 1) by Marsaglia and Tsang; shapes below 1 use the boost identity. */
export function sampleGamma(shape: number, rng: Rng): number {
  if (shape < 1) return sampleGamma(shape + 1, rng) * Math.pow(1 - rng(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - rng();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** Beta(a, b) as a ratio of gammas. */
export function sampleBeta(a: number, b: number, rng: Rng): number {
  const x = sampleGamma(a, rng);
  const y = sampleGamma(b, rng);
  return x / (x + y);
}
