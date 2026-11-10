import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingReveal, ThemeConstellation } from "@/components/writing/home/ReadingMotion";

let container: HTMLDivElement;
let root: Root;
let media: EventTarget & { matches: boolean };
const observers: FakeObserver[] = [];
class FakeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  intersect(visible: boolean) {
    this.callback(
      [{ isIntersecting: visible } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  observers.length = 0;
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal("matchMedia", () => media);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 2000,
  } as DOMRect);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("reading-room motion lifecycle", () => {
  it("reveals below-fold sections once and disconnects observation", async () => {
    await act(async () => root.render(createElement(ReadingReveal, null, "An essay")));
    const element = container.firstElementChild as HTMLElement;
    expect(element.dataset.reveal).toBe("waiting");
    observers[0].intersect(true);
    expect(element.dataset.reveal).toBe("visible");
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
  });
  it("shows content immediately with reduced motion and responds to live preference changes", async () => {
    media.matches = true;
    await act(async () => root.render(createElement(ReadingReveal, null, "An essay")));
    expect(container.firstElementChild?.getAttribute("data-reveal")).not.toBe("waiting");
    expect(observers).toHaveLength(0);
    await act(async () => root.render(null));
    media.matches = false;
    await act(async () => root.render(createElement(ReadingReveal, null, "An essay")));
    expect(container.firstElementChild?.getAttribute("data-reveal")).toBe("waiting");
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(container.firstElementChild?.getAttribute("data-reveal")).toBe("visible");
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
  });
  it("pauses constellation work offscreen and in a hidden tab, while highlighting the chosen theme", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    await act(async () => root.render(createElement(ThemeConstellation, { selected: "growth" })));
    const svg = container.querySelector("svg")!;
    expect(svg.querySelectorAll('[data-selected="true"]')).toHaveLength(1);
    observers[0].intersect(true);
    expect(svg.dataset.live).toBe("true");
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(svg.dataset.live).toBe("false");
    hidden.mockReturnValue(false);
    observers[0].intersect(false);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(svg.dataset.live).toBe("false");
    await act(async () => root.render(null));
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
  });
});
