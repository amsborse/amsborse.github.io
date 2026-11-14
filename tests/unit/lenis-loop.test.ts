import { describe, expect, it } from "vitest";
import { startLenisLoop, type LenisLike } from "@/lib/lenisLoop";

/** A stand-in for Lenis that glides for a fixed number of advanced milliseconds. */
function fakeLenis(glideMs = 100) {
  const listeners: Array<() => void> = [];
  const lenis = {
    isScrolling: false as LenisLike["isScrolling"],
    clocks: [] as number[],
    startedAt: 0,
    raf(time: number) {
      this.clocks.push(time);
      if (this.isScrolling === "smooth" && time - this.startedAt >= glideMs)
        this.isScrolling = false;
    },
    scrollTo() {
      this.isScrolling = "smooth";
      this.startedAt = this.clocks.at(-1) ?? 0;
    },
    on(_event: "virtual-scroll", cb: () => void) {
      listeners.push(cb);
      return () => listeners.splice(listeners.indexOf(cb), 1);
    },
    wheel() {
      listeners.forEach((cb) => cb());
      this.scrollTo();
    },
  };
  return lenis;
}

function fakeFrames() {
  let queue: Array<(t: number) => void> = [];
  let now = 0;
  return {
    requestFrame: (cb: (t: number) => void) => (queue.push(cb), queue.length),
    cancelFrame: () => {
      queue = [];
    },
    pending: () => queue.length,
    /** Advance `ms` of wall time, running every frame the loop asks for on a 60 Hz cadence. */
    run(ms: number) {
      const end = now + ms;
      while (now < end) {
        now += 1000 / 60;
        const due = queue;
        queue = [];
        due.forEach((cb) => cb(now));
      }
    },
    idle(ms: number) {
      now += ms;
    },
  };
}

describe("startLenisLoop", () => {
  it("requests no frames while nothing is scrolling", () => {
    const lenis = fakeLenis();
    const frames = fakeFrames();
    startLenisLoop(lenis, frames);
    frames.run(1000);
    expect(frames.pending()).toBe(0);
    expect(lenis.clocks).toHaveLength(0);
  });

  it("runs while a wheel glide is in flight, then stops", () => {
    const lenis = fakeLenis(100);
    const frames = fakeFrames();
    const loop = startLenisLoop(lenis, frames);
    lenis.wheel();
    expect(loop.isRunning()).toBe(true);
    frames.run(500);
    expect(lenis.isScrolling).toBe(false);
    expect(loop.isRunning()).toBe(false);
    expect(frames.pending()).toBe(0);
    expect(lenis.clocks.length).toBeGreaterThanOrEqual(6);
  });

  it("wakes on programmatic scrollTo (anchor links, route changes)", () => {
    const lenis = fakeLenis(50);
    const frames = fakeFrames();
    const loop = startLenisLoop(lenis, frames);
    lenis.scrollTo();
    expect(loop.isRunning()).toBe(true);
    frames.run(300);
    expect(lenis.clocks.length).toBeGreaterThan(0);
    expect(loop.isRunning()).toBe(false);
  });

  it("never hands Lenis an idle gap as one giant frame", () => {
    const lenis = fakeLenis(30);
    const frames = fakeFrames();
    startLenisLoop(lenis, frames);
    lenis.wheel();
    frames.run(200);
    frames.idle(60_000);
    lenis.wheel();
    frames.run(200);
    const steps = lenis.clocks.slice(1).map((t, i) => t - lenis.clocks[i]);
    expect(Math.max(...steps)).toBeLessThan(20);
  });

  it("holds the glide while held and resumes it without a jump", () => {
    const lenis = fakeLenis(100);
    const frames = fakeFrames();
    let held = false;
    startLenisLoop(lenis, { ...frames, isHeld: () => held });
    lenis.wheel();
    frames.run(50);
    held = true;
    const before = lenis.clocks.length;
    frames.run(500);
    expect(lenis.clocks.length).toBe(before);
    held = false;
    frames.run(500);
    const steps = lenis.clocks.slice(1).map((t, i) => t - lenis.clocks[i]);
    expect(Math.max(...steps)).toBeLessThan(20);
    expect(lenis.isScrolling).toBe(false);
  });

  it("stop() restores scrollTo and cancels a pending frame", () => {
    const lenis = fakeLenis();
    const original = lenis.scrollTo;
    const frames = fakeFrames();
    const loop = startLenisLoop(lenis, frames);
    lenis.wheel();
    loop.stop();
    expect(lenis.scrollTo).toBe(original);
    expect(frames.pending()).toBe(0);
  });
});
