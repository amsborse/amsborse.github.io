import { describe, expect, it } from "vitest";
import { halftone, luminance, sobel, warmth } from "@/designs/plateArt";

const rgba = (...pixels: [number, number, number][]) =>
  new Uint8ClampedArray(pixels.flatMap(([r, g, b]) => [r, g, b, 255]));

describe("plateArt", () => {
  it("measures luminance from black to white", () => {
    const lum = luminance(rgba([0, 0, 0], [255, 255, 255], [0, 255, 0]), 3, 1);
    expect(lum[0]).toBe(0);
    expect(lum[1]).toBeCloseTo(1, 5);
    expect(lum[2]).toBeCloseTo(0.7152, 4);
  });

  it("scores warm pixels above cool ones", () => {
    const warm = warmth(rgba([240, 120, 40], [40, 120, 240], [128, 128, 128]), 3, 1);
    expect(warm[0]).toBe(1);
    expect(warm[1]).toBe(0);
    expect(warm[2]).toBe(0);
  });

  it("finds a vertical edge and normalises it to 1", () => {
    const width = 6;
    const height = 5;
    const gray = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) for (let x = 3; x < width; x += 1) gray[y * width + x] = 1;
    const edges = sobel(gray, width, height);
    expect(Math.max(...edges)).toBe(1);
    expect(edges[2 * width + 2]).toBe(1);
    expect(edges[2 * width + 1]).toBe(0);
    expect(edges[0]).toBe(0);
  });

  it("returns a flat field with no edges", () => {
    const edges = sobel(new Float32Array(16).fill(0.5), 4, 4);
    expect(edges.every((value) => value === 0)).toBe(true);
  });

  it("sizes halftone dots by tone and skips blank paper", () => {
    expect(halftone(100, 60, 10, 45, () => 0)).toHaveLength(0);
    const full = halftone(100, 60, 10, 45, () => 1);
    const quarter = halftone(100, 60, 10, 45, () => 0.25);
    expect(full.length).toBeGreaterThan(40);
    expect(full[0].r).toBeCloseTo(6.2, 5);
    expect(quarter[0].r).toBeCloseTo(3.1, 5);
    for (const dot of full) {
      expect(dot.x).toBeGreaterThanOrEqual(-10);
      expect(dot.x).toBeLessThanOrEqual(110);
      expect(dot.y).toBeGreaterThanOrEqual(-10);
      expect(dot.y).toBeLessThanOrEqual(70);
    }
  });
});
