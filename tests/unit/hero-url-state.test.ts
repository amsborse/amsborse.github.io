import { describe, expect, it } from "vitest";
import { parseHeroUrl } from "@/components/hero/heroUrlState";

describe("parseHeroUrl", () => {
  it("pins time and accepts only supported cameras", () => {
    expect(parseHeroUrl("?heroTime=12.5&heroCamera=node")).toMatchObject({
      fixedTime: 12.5,
      camera: "node",
      state: { mode: "idle" },
    });
    expect(parseHeroUrl("?heroCamera=telephoto").camera).toBe("wide");
  });

  it("builds deterministic hover, request, failure and recovery states", () => {
    expect(parseHeroUrl("?heroState=hover:storage").state.hovered).toBe("storage");
    expect(parseHeroUrl("?heroTime=8&heroState=request:2").state).toMatchObject({
      mode: "request",
      startedAt: 6,
    });
    expect(parseHeroUrl("?heroState=failure:policy").state).toMatchObject({
      mode: "failure",
      failed: "policy",
    });
    expect(parseHeroUrl("?heroTime=10&heroState=recover:ingest").state).toMatchObject({
      mode: "recovering",
      recovering: "ingest",
      failed: null,
    });
  });

  it("ignores malformed, negative, unknown and non-finite values", () => {
    expect(parseHeroUrl("?heroTime=-1&heroState=hover:fake")).toMatchObject({
      fixedTime: null,
      state: { mode: "idle", hovered: null },
    });
    expect(parseHeroUrl("?heroTime=Infinity").fixedTime).toBeNull();
    expect(parseHeroUrl("?heroState=request:NaN").state.mode).toBe("idle");
  });

  it("defaults to the art plate and opts into the 3D scene with hero=3d", () => {
    expect(parseHeroUrl("").scene).toBe("plate");
    expect(parseHeroUrl("?hero=3d").scene).toBe("3d");
    expect(parseHeroUrl("?hero=webgl").scene).toBe("plate");
  });
});
