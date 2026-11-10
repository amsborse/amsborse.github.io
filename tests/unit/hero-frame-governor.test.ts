import { describe, expect, it } from "vitest";
import { createFrameGovernor } from "@/components/hero/frameGovernor";

function feed(gapMs: number, frames: number, start = 0) {
  const governor = createFrameGovernor();
  let now = start;
  for (let i = 0; i < frames; i += 1) {
    governor.record(now);
    now += gapMs;
  }
  return governor;
}

describe("hero frame governor", () => {
  it("keeps ambient motion at 60fps", () => {
    expect(feed(16.7, 120).slow).toBe(false);
  });

  it("keeps ambient motion at 40fps", () => {
    expect(feed(25, 120).slow).toBe(false);
  });

  it("settles when frames arrive at 10fps", () => {
    expect(feed(100, 12).slow).toBe(true);
  });

  it("settles within six frames when every frame is far over budget", () => {
    // Each blocked frame is a long task; the fewer it takes to judge, the less the page stalls.
    expect(feed(110, 6).slow).toBe(true);
  });

  it("does not settle early on two slow frames among fast ones", () => {
    const governor = createFrameGovernor();
    const gaps = [16, 16, 16, 120, 120, 16, 16, 16, 16, 16, 16, 16, 16];
    let now = 0;
    for (const gap of gaps) {
      governor.record(now);
      now += gap;
    }
    expect(governor.slow).toBe(false);
  });

  it("ignores one long gap such as the page's first render", () => {
    const governor = createFrameGovernor();
    const gaps = [16, 16, 16, 900, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16];
    let now = 0;
    for (const gap of gaps) {
      governor.record(now);
      now += gap;
    }
    expect(governor.slow).toBe(false);
  });

  it("does not count a pause as a slow frame after reset", () => {
    const governor = createFrameGovernor({ warmup: 0, window: 4 });
    governor.record(0);
    governor.record(16);
    governor.reset();
    governor.record(5000);
    governor.record(5016);
    governor.record(5032);
    governor.record(5048);
    expect(governor.slow).toBe(false);
  });

  it("stays settled once judged slow", () => {
    const governor = feed(100, 12);
    for (let i = 0; i < 40; i += 1) governor.record(2000 + i * 16);
    expect(governor.slow).toBe(true);
  });
});
