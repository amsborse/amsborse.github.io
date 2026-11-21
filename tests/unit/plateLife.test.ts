import { describe, expect, it } from "vitest";
import { buildLifeFragment, createLifeGovernor } from "../../src/components/stage/plateLife";
import { PLATE_LIFE_MAPS, type LifeMap } from "../../src/components/stage/plateLifeMaps";

function assertMap(map: LifeMap) {
  const point = (x: number, y: number) => {
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(map.width);
    expect(y).toBeLessThanOrEqual(map.height);
  };
  const rect = (r: { x0: number; y0: number; x1: number; y1: number }) => {
    point(r.x0, r.y0);
    point(r.x1, r.y1);
    expect(r.x1).toBeGreaterThan(r.x0);
    expect(r.y1).toBeGreaterThan(r.y0);
  };
  expect([1671, 1672]).toContain(map.width);
  expect(map.height).toBe(941);
  point(0, map.horizon);
  map.lanterns.forEach((l) => {
    point(l.x - l.rx, l.y - l.ry);
    point(l.x + l.rx, l.y + l.ry);
    point(l.reflection.x, l.reflection.y);
    expect(l.reflection.y).toBeGreaterThan(map.horizon);
  });
  [...map.falls, ...map.mist, map.foliage].forEach(rect);
  map.land.forEach((polygon) => {
    expect(polygon.length).toBeGreaterThanOrEqual(3);
    polygon.forEach((p) => point(p.x, p.y));
  });
  map.rings.forEach((r) => {
    if (r.clip) rect(r.clip);
    const radians = (r.rot * Math.PI) / 180;
    const dx = Math.hypot(r.a * Math.cos(radians), r.b * Math.sin(radians));
    const dy = Math.hypot(r.a * Math.sin(radians), r.b * Math.cos(radians));
    point(r.cx - dx, r.cy - dy);
    point(r.cx + dx, r.cy + dy);
    expect(r.a > 0 && r.b > 0).toBe(true);
  });
  map.ripples.forEach((r) => {
    point(r.x, r.y);
    expect(r.radius).toBeGreaterThan(0);
  });
  if (map.orb) {
    point(map.orb.x - map.orb.r, map.orb.y - map.orb.r);
    point(map.orb.x + map.orb.r, map.orb.y + map.orb.r);
  }
}

describe("plate life maps and shader specialisation", () => {
  it("covers all seven scenes and both independent themes", () => {
    expect(Object.keys(PLATE_LIFE_MAPS).sort()).toEqual([
      "about",
      "contact",
      "experience",
      "horizon",
      "learning",
      "projects",
      "writing",
    ]);
  });
  for (const [name, themes] of Object.entries(PLATE_LIFE_MAPS)) {
    for (const theme of ["dark", "light"] as const) {
      it(`${name}/${theme}: keeps every measured point inside the plate and builds GLSL`, () => {
        const map = themes[theme];
        assertMap(map);
        const shader = buildLifeFragment(map, theme);
        expect(shader).toContain("void main()");
        expect(shader).toContain("gl_FragColor = vec4(col,1.0)");
        expect(shader).toContain("texture2D(uTex");
        expect(shader).not.toMatch(/NaN|Infinity|undefined/);
        expect(shader).not.toContain("for (");
        expect(shader.includes("vec2 mote")).toBe(theme === "dark");
      });
    }
    it(`${name}: uses separate compositions for each theme`, () => {
      expect(themes.dark).not.toEqual(themes.light);
      expect(buildLifeFragment(themes.dark, "dark")).not.toEqual(
        buildLifeFragment(themes.light, "light")
      );
    });
  }
});

describe("plate life frame governor", () => {
  const run = (gap: number) => {
    const governor = createLifeGovernor();
    return Array.from({ length: 40 }, (_, i) => governor.record(100 + i * gap));
  };
  it("allows normal 60Hz and 30Hz frame cadence", () => {
    expect(run(1000 / 60)).not.toContain(true);
    expect(run(1000 / 30)).not.toContain(true);
  });
  it("signals sustained slow frames", () => {
    expect(run(100)).toContain(true);
  });
  it("ignores isolated spikes and resets across an offscreen pause", () => {
    const governor = createLifeGovernor();
    let now = 100;
    for (let i = 0; i < 20; i++) expect(governor.record((now += 16))).toBe(false);
    expect(governor.record((now += 500))).toBe(false);
    governor.reset();
    expect(governor.record((now += 60000))).toBe(false);
    for (let i = 0; i < 40; i++) expect(governor.record((now += 16))).toBe(false);
  });
});

/**
 * Regression: About's dawn and night plates were painted with different compositions (the ring
 * 55 px apart, the tree and island shifted), so a theme switch visibly moved the scene. A plate's
 * two themes must keep their shared landmarks in place.
 */
/* Projects and learning were the last different paintings (islands laid out differently, the
 * lantern on the other side of the orb); their dawn plates are now Codex relights of the night
 * ones, so every plate is held to this check with no skips. */

describe("dawn and night plates share one composition", () => {
  for (const [name, themes] of Object.entries(PLATE_LIFE_MAPS)) {
    it(`${name} keeps its lanterns and rings in place across themes`, () => {
      const { dark, light } = themes;
      expect(light.lanterns.length).toBe(dark.lanterns.length);
      expect(light.rings.length).toBe(dark.rings.length);
      // Order in the map is not meaningful: each landmark must have a partner nearby.
      const nearest = (points: { x: number; y: number }[], x: number, y: number) =>
        Math.min(...points.map((q) => Math.hypot(q.x - x, q.y - y)));
      const lightRings = light.rings.map((r) => ({ x: r.cx, y: r.cy }));
      dark.lanterns.forEach((l) => expect(nearest([...light.lanterns], l.x, l.y)).toBeLessThan(12));
      dark.rings.forEach((r) => expect(nearest(lightRings, r.cx, r.cy)).toBeLessThan(12));
      if (dark.orb) {
        expect(light.orb).toBeDefined();
        expect(Math.hypot(light.orb!.x - dark.orb.x, light.orb!.y - dark.orb.y)).toBeLessThan(12);
      }
    });
  }

  /** Regression: the home horizon's dawn plate was a different painting (waterline ~40 px higher,
   * the bonsai island ~30 px right, the fourth lantern beside the third), so the "Creativity is a
   * choice" image jumped on a theme switch. Its waterline and island must stay put too. */
  it("horizon keeps its waterline and island in place across themes", () => {
    const { dark, light } = PLATE_LIFE_MAPS.horizon;
    expect(Math.abs(light.horizon - dark.horizon)).toBeLessThan(12);
    const centre = (poly: { x: number; y: number }[]) => ({
      x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
      y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
    });
    const [d, l] = [centre(dark.land[0]), centre(light.land[0])];
    expect(Math.hypot(d.x - l.x, d.y - l.y)).toBeLessThan(12);
  });
});
