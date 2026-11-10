/**
 * One way to move the page to an element from anywhere in the app. When the global Lenis
 * smooth scroll is running it glides there (same feel as in-page anchor links); otherwise it
 * falls back to native scrolling, instant under reduced motion.
 */
type Glide = (target: HTMLElement) => void;

let glide: Glide | null = null;

/** RootLayout registers Lenis here while it is alive, and clears it on teardown. */
export function registerGlide(next: Glide | null) {
  glide = next;
}

export function glideTo(target: HTMLElement | null) {
  if (!target) return;
  if (glide) {
    glide(target);
    return;
  }
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
