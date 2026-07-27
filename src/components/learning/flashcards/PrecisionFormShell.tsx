import { type CSSProperties, type PointerEvent, type ReactNode, useId } from "react";
import {
  rarityColors,
  resolveTaskCardFloatTiming,
  type TaskEnergy,
  type TaskRarity,
} from "@/components/arsenal/PrecisionTaskCard";
import { cn } from "@/lib/cn";
import { useTheme } from "@/theme/ThemeProvider";

interface PrecisionCardStyle extends CSSProperties {
  "--card-accent": string;
  "--energy-color": string;
  "--card-pointer-x": string;
  "--card-pointer-y": string;
}

type PrecisionFormShellProps = {
  id: string;
  eyebrow: string;
  title: string;
  hint?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  rarity?: TaskRarity;
  energy?: TaskEnergy;
};

export function PrecisionFormShell({
  id,
  eyebrow,
  title,
  hint,
  footer,
  children,
  className,
  rarity = "rare",
  energy = "medium",
}: PrecisionFormShellProps) {
  const { cardScheme } = useTheme();
  const titleId = `${id}-form-title`;
  const floatTiming = resolveTaskCardFloatTiming(id);
  const style: PrecisionCardStyle = {
    "--card-accent": rarityColors[rarity],
    "--energy-color": energy === "low" ? "#43A68B" : energy === "high" ? "#E56855" : "#D79A3B",
    "--card-pointer-x": "50%",
    "--card-pointer-y": "30%",
  };

  const resetPointerLighting = (element: HTMLElement) => {
    element.style.setProperty("--card-pointer-x", "50%");
    element.style.setProperty("--card-pointer-y", "30%");
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (
      event.pointerType === "touch" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const normalizedX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const normalizedY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

    card.style.setProperty("--card-pointer-x", `${normalizedX * 100}%`);
    card.style.setProperty("--card-pointer-y", `${normalizedY * 100}%`);
  };

  return (
    <article
      className={cn("precision-task-card precision-form-card", className)}
      data-border-theme="minimal"
      data-color-scheme={cardScheme}
      data-surface-theme="minimal"
      aria-labelledby={titleId}
      onPointerMove={handlePointerMove}
      onPointerLeave={(event) => resetPointerLighting(event.currentTarget)}
      style={style}
    >
      <div className="precision-task-card__ambient-layer">
        <div className="precision-task-card__motion-layer">
          <div className="precision-task-card__surface precision-form-card__surface">
            <header className="precision-task-card__header precision-form-card__header">
              <span className="precision-task-card__eyebrow" aria-hidden="true">
                {eyebrow}
              </span>
            </header>

            <div className="precision-task-card__body precision-form-card__body">
              <div className="precision-form-card__intro">
                <h2 className="precision-form-card__title" id={titleId}>
                  {title}
                </h2>
                {hint ? <p className="precision-form-card__hint">{hint}</p> : null}
              </div>
              {children}
            </div>

            {footer ? <footer className="precision-form-card__footer">{footer}</footer> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function PrecisionFormPanel({
  label,
  children,
  side = "front",
}: {
  label: string;
  children: ReactNode;
  side?: "front" | "back";
}) {
  const panelId = useId();

  return (
    <section
      className={cn("precision-form-panel", side === "back" && "precision-form-panel--back")}
      aria-labelledby={panelId}
    >
      <header className="precision-form-panel__header">
        <span className="precision-form-panel__eyebrow" id={panelId}>
          {label}
        </span>
      </header>
      <div className="precision-form-panel__body">{children}</div>
    </section>
  );
}

export function PrecisionFormActions({
  onCancel,
  submitLabel,
  submitting,
}: {
  onCancel: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  return (
    <>
      <span className="precision-form-card__actions">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="precision-form-card__button precision-form-card__button--ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="precision-form-card__button precision-form-card__button--primary"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </span>
    </>
  );
}
