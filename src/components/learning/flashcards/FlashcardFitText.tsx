import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type FlashcardFitTextProps = {
  text: string;
  as?: "h2" | "pre";
  className?: string;
  id?: string;
  minFontPx?: number;
  maxFontPx?: number;
  active?: boolean;
  controlledFontPx?: number;
};

function fitTextToContainer(
  textEl: HTMLElement,
  containerEl: HTMLElement,
  minFontPx: number,
  maxFontPx: number
) {
  let low = minFontPx;
  let high = maxFontPx;
  let best = minFontPx;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    textEl.style.fontSize = `${mid}px`;

    const overflows =
      textEl.scrollHeight > containerEl.clientHeight ||
      textEl.scrollWidth > containerEl.clientWidth;

    if (overflows) {
      high = mid - 1;
    } else {
      best = mid;
      low = mid + 1;
    }
  }

  textEl.style.fontSize = `${best}px`;

  const stillOverflows =
    textEl.scrollHeight > containerEl.clientHeight || textEl.scrollWidth > containerEl.clientWidth;

  containerEl.dataset.overflows = stillOverflows ? "true" : "false";
}

export function FlashcardFitText({
  text,
  as: Tag = "pre",
  className,
  id,
  minFontPx = 11,
  maxFontPx = 32,
  active = true,
  controlledFontPx,
}: FlashcardFitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLPreElement | HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    let retryFrame = 0;
    let retriesLeft = 8;

    const runFit = () => {
      if (cancelled) return;

      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;

      if (controlledFontPx != null) {
        textEl.style.fontSize = `${controlledFontPx}px`;
        container.dataset.overflows = "false";
        return;
      }

      if (!active) return;

      if (container.clientWidth < 1 || container.clientHeight < 1) {
        if (retriesLeft > 0) {
          retriesLeft -= 1;
          retryFrame = window.requestAnimationFrame(runFit);
        }
        return;
      }

      fitTextToContainer(textEl, container, minFontPx, maxFontPx);
    };

    runFit();

    if (controlledFontPx != null) {
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(retryFrame);
      };
    }

    if (!active) {
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(retryFrame);
      };
    }

    const container = containerRef.current;
    if (!container) {
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(retryFrame);
      };
    }

    const observer = new ResizeObserver(() => runFit());
    observer.observe(container);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(retryFrame);
      observer.disconnect();
    };
  }, [active, controlledFontPx, maxFontPx, minFontPx, text]);

  const contentClass = cn("precision-flashcard__fit-text-content", className);

  return (
    <div ref={containerRef} className="precision-flashcard__fit-text">
      {Tag === "h2" ? (
        <h2 ref={textRef as React.RefObject<HTMLHeadingElement>} id={id} className={contentClass}>
          {text}
        </h2>
      ) : (
        <pre ref={textRef as React.RefObject<HTMLPreElement>} id={id} className={contentClass}>
          {text}
        </pre>
      )}
    </div>
  );
}
