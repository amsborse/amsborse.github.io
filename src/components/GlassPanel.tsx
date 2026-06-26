import type { ReactNode, ElementType } from "react";

/**
 * GlassPanel — Shared glassmorphic container used across dark-themed pages.
 *
 * Provides consistent styling for translucent panels with subtle borders
 * and backdrop blur effects. Used by: MotionLab, Algorithms, Home.
 *
 * @example
 * <GlassPanel>Content here</GlassPanel>
 * <GlassPanel variant="dark" className="p-8">Darker panel</GlassPanel>
 */

type GlassPanelProps = {
  children: ReactNode;
  /** Visual density of the panel. */
  variant?: "default" | "dark" | "elevated";
  /** Additional CSS classes. */
  className?: string;
  /** HTML element to render as (default: "div"). */
  as?: ElementType;
};

const VARIANTS = {
  default: "bg-[#0b0c13]/55 border border-white/5 rounded-2xl",
  dark: "bg-[#0b0c13]/75 border border-white/8 rounded-2xl backdrop-blur-md",
  elevated: "bg-[#0b0c13]/45 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl",
} as const;

export function GlassPanel({
  children,
  variant = "default",
  className = "",
  as: Tag = "div",
}: GlassPanelProps) {
  return (
    // @ts-expect-error — dynamic tag element
    <Tag className={`${VARIANTS[variant]} ${className}`.trim()}>
      {children}
    </Tag>
  );
}
