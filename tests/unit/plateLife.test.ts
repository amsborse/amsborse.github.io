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
