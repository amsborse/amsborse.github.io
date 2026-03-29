type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionHeading({ eyebrow, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-12 max-w-2xl lg:mb-14">
      {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
      <h2 className="mt-3 font-display text-2xl font-medium tracking-tight text-[var(--color-ink)] sm:text-3xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-[0.9375rem]">{subtitle}</p>
      ) : null}
    </div>
  );
}
