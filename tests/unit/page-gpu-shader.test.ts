import { describe, expect, it } from "vitest";
import { motifs, toneCode } from "@/components/stage/page-gpu";

// WebGPU rejects a fragment entry point that receives @builtin(position) twice (once through the
// `Out` struct and once as its own parameter); the scene then silently falls back to static art.
describe("page stage tone shader", () => {
  it("reads the pixel position only once in fs_main", () => {
    const params = /fn fs_main\((.*?)\)->/.exec(toneCode)?.[1] ?? "";
    expect(params).toContain("i:Out");
    expect(params).not.toContain("@builtin(position)");
  });

  // A WGSL reserved word used as a name fails shader parsing (Writing used `active`).
  const reserved = [
    "active",
    "common",
    "filter",
    "handle",
    "input",
    "output",
    "resource",
    "self",
    "sample",
    "target",
    "texture",
    "unless",
    "using",
    "precision",
    "module",
    "new",
    "null",
    "of",
    "static",
    "this",
  ];
  it.each(Object.entries(motifs))("%s motif declares no WGSL reserved names", (_, code) => {
    const names = [...code.matchAll(/\b(?:let|var)\s+(\w+)/g)].map((m) => m[1]);
    expect(names.filter((n) => reserved.includes(n!))).toEqual([]);
  });
  // WGSL pow(x, y) is undefined for x < 0: Writing produced NaN pixels that bloom smeared into black blocks.
  it.each(Object.entries(motifs))(
    "%s motif avoids pow() on possibly negative values",
    (_, code) => {
      expect(code).not.toMatch(/(^|[^\w])pow\(/);
    }
  );
});
