/**
 * Drives Lenis only while a smooth scroll is in flight, instead of requesting a frame forever.
 *
 * A perpetual loop kept the page drawing ~60 frames a second while idle, even with every canvas
 * offscreen. Here a wheel or touch gesture (Lenis's `virtual-scroll` event) or a programmatic
 * `scrollTo` (anchor links, route changes) wakes the loop, and it stops on the first frame where
 * Lenis is no longer smooth-scrolling. The glide itself is unchanged: Lenis sees a clock that
 * advances by real frame time while the loop runs and by one frame on the first frame after a
 * wake, so an idle gap never turns into one huge jump.
 */
export type LenisLike = {
  raf: (time: number) => void;
  isScrolling: boolean | "smooth" | "native";
  scrollTo: (...args: never[]) => void;
  on: (event: "virtual-scroll", cb: () => void) => () => void;
};

export type LenisLoopOptions = {
  /** True while Lenis must not advance (tab hidden, a flashcard animation has priority). */
  isHeld?: () => boolean;
  requestFrame?: (cb: (time: number) => void) => number;
  cancelFrame?: (id: number) => void;
};

const FRAME_MS = 1000 / 60;

export function startLenisLoop(lenis: LenisLike, options: LenisLoopOptions = {}) {
  const isHeld = options.isHeld ?? (() => false);
  const requestFrame = options.requestFrame ?? ((cb) => requestAnimationFrame(cb));
  const cancelFrame = options.cancelFrame ?? ((id) => cancelAnimationFrame(id));

  let frameId = 0;
  let running = false;
  let lastFrame: number | null = null;
  let clock = 0;

  function frame(time: number) {
    frameId = 0;
    // A wheel or scrollTo between frames gets one frame of travel, as it did in a perpetual loop.
    const elapsed = lastFrame === null ? FRAME_MS : time - lastFrame;
    lastFrame = time;
    // While held, the glide stays where it is and resumes without a jump once the hold ends.
    if (!isHeld()) {
      clock += elapsed;
      lenis.raf(clock);
    }
    if (lenis.isScrolling === "smooth") {
      frameId = requestFrame(frame);
    } else {
      running = false;
      lastFrame = null;
    }
  }

  function wake() {
    if (running) return;
    running = true;
    lastFrame = null;
    frameId = requestFrame(frame);
  }

  const offVirtualScroll = lenis.on("virtual-scroll", wake);
  const scrollTo = lenis.scrollTo;
  lenis.scrollTo = ((...args: never[]) => {
    scrollTo.apply(lenis, args);
    wake();
  }) as LenisLike["scrollTo"];

  return {
    wake,
    isRunning: () => running,
    stop() {
      offVirtualScroll();
      lenis.scrollTo = scrollTo;
      if (frameId) cancelFrame(frameId);
      frameId = 0;
      running = false;
    },
  };
}
