type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionHeading({ eyebrow, title, subtitle }: SectionHeadingProps) {
  return (
    <div className="mb-12 max-w-2xl lg:mb-14">
      {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
      <h2 className="mt-5 font-display text-[1.85rem] font-semibold tracking-[-0.025em] text-[var(--color-ink)] sm:text-[2.1rem] lg:text-[2.35rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-6 text-[0.9375rem] leading-[1.82] text-[var(--color-ink-muted)] sm:text-base sm:leading-[1.85]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
