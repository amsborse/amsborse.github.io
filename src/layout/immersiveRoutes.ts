/** Routes that use a fixed viewport (no page scroll, footer hidden). */
const IMMERSIVE_PREFIXES = [
  "/arsenal/celestial-grid",
  "/arsenal/particle-core",
  "/arsenal/anomaly-matrix",
  "/arsenal/gravity-well",
  "/arsenal/quantum-mesh",
];

export function isImmersiveSandbox(pathname: string): boolean {
  return IMMERSIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Disable Lenis + background particles on heavy or fixed-viewport routes. */
export function shouldDisableGlobalEffects(pathname: string): boolean {
  return isImmersiveSandbox(pathname) || pathname.startsWith("/arsenal/algorithm");
}
