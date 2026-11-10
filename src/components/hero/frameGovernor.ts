/**
 * Watches how fast the hero's ambient frames arrive. When a device cannot hold about 30fps
 * (a phone without much GPU, or a browser drawing WebGL in software), every frame becomes a
 * long task that blocks taps and scrolling. The plate then settles on a still frame and only
 * animates for things the user starts, such as a request.
 */
export interface FrameGovernor {
  /** True once the device was judged too slow for ambient motion; stays true for the page. */
  readonly slow: boolean;
  /** Record a frame timestamp; returns `slow`. */
  record(now: number): boolean;
  /** Forget the last timestamp, e.g. after a pause, so the gap is not counted as a frame. */
  reset(): void;
}

export interface FrameGovernorOptions {
  /** Frames ignored at the start while the shader warms up. */
  warmup?: number;
  /** Frame gaps per judgement. */
  window?: number;
  /** Median frame gap, in ms, above which motion settles. 34ms is just under 30fps. */
  budgetMs?: number;
}

export function createFrameGovernor({
  warmup = 2,
  window = 8,
  budgetMs = 34,
}: FrameGovernorOptions = {}): FrameGovernor {
  let last: number | null = null;
  let seen = 0;
  let gaps: number[] = [];
  let slow = false;

  return {
    get slow() {
      return slow;
    },
    record(now: number) {
      if (slow) return true;
      seen += 1;
      if (last !== null && seen > warmup) gaps.push(now - last);
      last = now;
      // Three frames in a row at more than twice the budget: no need to wait for the window,
      // every further frame would be another long task.
      const recent = gaps.slice(-3);
      if (recent.length === 3 && recent.every((gap) => gap > budgetMs * 2)) {
        slow = true;
        return slow;
      }
      if (gaps.length >= window) {
        const sorted = [...gaps].sort((a, b) => a - b);
        slow = sorted[Math.floor(sorted.length / 2)] > budgetMs;
        gaps = [];
      }
      return slow;
    },
    reset() {
      last = null;
    },
  };
}
