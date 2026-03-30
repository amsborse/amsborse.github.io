import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Delay before this block animates (ms). Ignored when `stagger` is true. */
  delayMs?: number;
  /**
   * When true, descendants with class `reveal-stagger-item` animate in sequence.
   * Set `--reveal-index` (0, 1, 2, …) on each item via inline style.
   */
  stagger?: boolean;
  /** Milliseconds between each stagger step (default 72). */
  staggerMs?: number;
};

/**
 * Fade/slide-in when scrolled into view. Optional stagger for child items.
 * Respects prefers-reduced-motion via CSS.
 */
export function Reveal({
  children,
  className = "",
  delayMs = 0,
  stagger = false,
  staggerMs = 72,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const visibleClass = stagger
    ? visible
      ? "reveal-group--visible"
      : ""
    : visible
      ? "reveal-on-scroll--visible"
      : "";

  const baseClass = stagger ? "reveal-group" : "reveal-on-scroll";

  const style: CSSProperties | undefined = stagger
    ? ({ ["--stagger-ms" as string]: `${staggerMs}ms` } as CSSProperties)
    : delayMs > 0
      ? { transitionDelay: `${delayMs}ms` }
      : undefined;

  return (
    <div ref={ref} className={`${baseClass} ${visibleClass} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
