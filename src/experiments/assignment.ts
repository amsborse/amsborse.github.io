import type { Rng } from "./random";

/** What the Worker serves at /weights.json. */
export type WeightsDoc = {
  /** Changes whenever the weights change; stored with each assignment. */
  version: string;
  updatedAt: string;
  /** auto: the bandit moves weights. frozen: weights held. forced: everyone gets `forced`. */
  mode: "auto" | "frozen" | "forced";
  forced?: string;
  weights: Record<string, number>;
};

/** A sticky automatic pick, kept in localStorage. */
export type Assignment = { design: string; at: number; version: string };

/** Where the visible design came from. Only "auto" visits count toward the bandit. */
export type DesignSource = "url" | "picker" | "auto" | "fallback" | "default";

/** Validates a weights document. Throws with a reason, so a bad file is loud, never guessed at. */
export function parseWeightsDoc(raw: unknown, designs: readonly string[]): WeightsDoc {
  if (!raw || typeof raw !== "object") throw new Error("weights.json is not an object");
  const doc = raw as Partial<WeightsDoc>;
  if (typeof doc.version !== "string" || !doc.version) throw new Error("weights.json: no version");
  if (doc.mode !== "auto" && doc.mode !== "frozen" && doc.mode !== "forced") {
    throw new Error(`weights.json: unknown mode ${String(doc.mode)}`);
  }
  if (doc.mode === "forced" && !designs.includes(doc.forced ?? "")) {
    throw new Error(`weights.json: forced design ${String(doc.forced)} is not registered`);
  }
  const weights: Record<string, number> = {};
  let total = 0;
  for (const id of designs) {
    const w = doc.weights?.[id];
    if (typeof w !== "number" || !Number.isFinite(w) || w < 0) {
      throw new Error(`weights.json: weight for ${id} is missing or invalid`);
    }
    weights[id] = w;
    total += w;
  }
  if (total <= 0) throw new Error("weights.json: weights sum to zero");
  return {
    version: doc.version,
    updatedAt: String(doc.updatedAt ?? ""),
    mode: doc.mode,
    forced: doc.forced,
    weights,
  };
}

/** Weighted random pick. Weights need not sum to one. A forced document always wins. */
export function pickDesign(doc: WeightsDoc, designs: readonly string[], rng: Rng): string {
  if (doc.mode === "forced" && doc.forced) return doc.forced;
  const total = designs.reduce((sum, id) => sum + (doc.weights[id] ?? 0), 0);
  let target = rng() * total;
  for (const id of designs) {
    target -= doc.weights[id] ?? 0;
    if (target < 0) return id;
  }
  // Only reachable through floating-point rounding at the very top of the range.
  return designs.filter((id) => (doc.weights[id] ?? 0) > 0).at(-1) ?? designs[0];
}

export function readAssignment(raw: string | null, designs: readonly string[]): Assignment | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Assignment>;
    if (typeof parsed.design !== "string" || !designs.includes(parsed.design)) return null;
    return {
      design: parsed.design,
      at: Number(parsed.at) || 0,
      version: String(parsed.version ?? ""),
    };
  } catch {
    return null;
  }
}

/**
 * Which design to show, in order: ?design= in the URL, then a choice made in the picker, then
 * the sticky automatic assignment, then the default.
 */
export function resolveDesign(input: {
  designs: readonly string[];
  fallback: string;
  fromUrl: string | null;
  fromPicker: string | null;
  assignment: Assignment | null;
}): { design: string; source: DesignSource } {
  const { designs, fallback, fromUrl, fromPicker, assignment } = input;
  if (fromUrl && designs.includes(fromUrl)) return { design: fromUrl, source: "url" };
  if (fromPicker && designs.includes(fromPicker)) return { design: fromPicker, source: "picker" };
  if (assignment) return { design: assignment.design, source: "auto" };
  return { design: fallback, source: "default" };
}
