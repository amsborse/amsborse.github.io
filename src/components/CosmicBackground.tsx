/**
 * CosmicBackground — Shared animated background used by dark "cosmic" themed pages.
 *
 * Renders a subtle grid overlay and soft gradient orbs that create depth.
 * Used by: MotionLab, Algorithms, and any future cosmic-themed pages.
 *
 * @example
 * <CosmicBackground />
 * <CosmicBackground gridOpacity={0.06} orbs={[{ position: "top-left", color: "accent" }]} />
 */

type OrbConfig = {
  /** CSS position classes (e.g., "top-[-10%] left-[-15%]"). */
  position: string;
  /** Size classes (e.g., "w-[60vw] h-[60vw]"). */
  size: string;
  /** Gradient direction (e.g., "from-[var(--color-accent)]/10 to-transparent"). */
  gradient: string;
  /** Blur radius (default: "blur-[120px]"). */
  blur?: string;
};

type CosmicBackgroundProps = {
  /** Opacity of the grid overlay lines (0–1). Default: 0.04. */
  gridOpacity?: number;
  /** Whether to show the grid pattern. Default: true. */
  showGrid?: boolean;
  /** Custom gradient orb configurations. Uses defaults if not provided. */
  orbs?: OrbConfig[];
};

const DEFAULT_ORBS: OrbConfig[] = [
  {
    position: "top-[-10%] left-[-15%]",
    size: "w-[60vw] h-[60vw]",
    gradient: "bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent",
    blur: "blur-[120px]",
  },
  {
    position: "bottom-[-10%] right-[-15%]",
    size: "w-[50vw] h-[50vw]",
    gradient: "bg-gradient-to-bl from-[var(--color-gold)]/8 to-transparent",
    blur: "blur-[100px]",
  },
];

export function CosmicBackground({
  gridOpacity = 0.04,
  showGrid = true,
  orbs = DEFAULT_ORBS,
}: CosmicBackgroundProps) {
  return (
    <>
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(24,58,111,${gridOpacity}) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(24,58,111,${gridOpacity}) 1.5px, transparent 1.5px)`,
            backgroundSize: "40px 40px",
          }}
        />
      )}
      {orbs.map((orb, i) => (
        <div
          key={i}
          className={`absolute rounded-full pointer-events-none ${orb.position} ${orb.size} ${orb.gradient} ${orb.blur ?? "blur-[120px]"}`}
        />
      ))}
    </>
  );
}
