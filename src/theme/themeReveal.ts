/**
 * Theme switch as a circular reveal from the toggle (the Manthan report's motion): the new theme
 * grows out of the button over the old one inside a view transition. Reduced motion, browsers
 * without view transitions, or a failed capture switch at once.
 */
type Transition = {
  finished: Promise<void>;
  ready: Promise<void>;
  skipTransition: () => void;
};
type StartViewTransition = (update: () => void) => Transition;

export const THEME_REVEAL_MS = 1600;

let active: Transition | null = null;
let listening = false;

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A click while the reveal plays would hit the transition overlay; finish it and deliver the
 * click to what is under the pointer. Keyboard activations (detail 0) belong to the focused
 * control and pass through untouched. */
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener(
    "click",
    (event) => {
      const playing = active;
      if (!playing || !event.isTrusted || event.detail === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      playing.skipTransition();
      void playing.finished
        .catch(() => {})
        .finally(() =>
          requestAnimationFrame(() => {
            const target = document.elementFromPoint(event.clientX, event.clientY);
            const control = target?.closest<HTMLElement>(
              "a,button,summary,label,[role=button],[tabindex]"
            );
            control?.click();
          })
        );
    },
    true
  );
  window.addEventListener("resize", () => active?.skipTransition(), { passive: true });
}

export function revealTheme(origin: Element | null | undefined, update: () => void) {
  const root = document.documentElement;
  const start = (document as Document & { startViewTransition?: StartViewTransition })
    .startViewTransition;
  active?.skipTransition();
  if (!start || reducedMotion()) {
    update();
    return;
  }
  const box = origin?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : window.innerWidth;
  const y = box ? box.top + box.height / 2 : 0;
  root.style.setProperty("--reveal-x", `${x}px`);
  root.style.setProperty("--reveal-y", `${y}px`);
  root.style.setProperty(
    "--reveal-r",
    `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`
  );
  root.dataset.themeMotion = "reveal";
  listen();
  let transition: Transition;
  try {
    transition = start.call(document, update);
  } catch (error) {
    delete root.dataset.themeMotion;
    console.error("Theme reveal could not start; switching without it", error);
    update();
    return;
  }
  active = transition;
  transition.ready.catch((error: unknown) => {
    if ((error as { name?: string })?.name !== "AbortError")
      console.error("Theme reveal could not capture the page", error);
  });
  void transition.finished
    .catch(() => {})
    .finally(() => {
      if (active !== transition) return;
      active = null;
      delete root.dataset.themeMotion;
    });
}
