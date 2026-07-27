/**
 * PageHeader — Shared header component for dark "cosmic" themed pages.
 *
 * Renders a centered eyebrow label, gradient title, and optional subtitle.
 * Used by: MotionLab, Algorithms, and future cosmic-themed pages.
 *
 * For editorial pages (About, Experience, etc.), use SectionHeading instead.
 *
 * @example
 * <PageHeader
 *   eyebrow="Kinetic Playground // Interactive Systems"
 *   title="Motion Lab"
 *   subtitle="Interact with the physical laws of our system."
 * />
 */

type PageHeaderProps = {
  /** Small uppercase label above the title. */
  eyebrow: string;
  /** Main page title — rendered with gradient text. */
  title: string;
  /** Optional description paragraph below the title. */
  subtitle?: string;
  /** Additional CSS classes for the header container. */
  className?: string;
};

export function PageHeader({ eyebrow, title, subtitle, className = "" }: PageHeaderProps) {
  return (
    <header className={`text-center mb-8 ${className}`.trim()}>
      <p className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)] mb-3">
        {eyebrow}
      </p>
      <h1 className="hub-title text-[2.25rem] sm:text-[3.25rem]">{title}</h1>
      {subtitle && (
        <p className="mt-4 text-sm max-w-lg mx-auto text-[var(--color-body)] leading-relaxed font-sans">
          {subtitle}
        </p>
      )}
    </header>
  );
}
