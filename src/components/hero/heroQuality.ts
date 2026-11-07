export type HeroQuality = "high" | "medium" | "low";

/** Initial/slow-frame tier policy; geometry decisions are consumed by HeroCanvas. */
export function qualityForViewport(width: number, frameRate = 60): HeroQuality {
  if (width < 700 || frameRate < 24) return "low";
  if (width <= 1100 || frameRate < 45) return "medium";
  return "high";
}
