/** Routes that use a fixed viewport (no page scroll, footer hidden). */
export function isImmersiveSandbox(pathname: string): boolean {
  return (
    pathname.includes("/learning/coding-patterns/sliding-window") ||
    pathname.startsWith("/aether-lab")
  );
}

/** Disable Lenis + background particles on heavy or fixed-viewport routes. */
export function shouldDisableGlobalEffects(pathname: string): boolean {
  return isImmersiveSandbox(pathname);
}
