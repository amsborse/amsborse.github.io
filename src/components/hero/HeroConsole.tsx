import { useEffect, useId, useRef, useState, type Ref } from "react";
import { SERVICES, type ServiceId } from "./topology";

export interface HeroConsoleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failed: boolean;
  caption: string;
  inspectButtonRef: Ref<HTMLButtonElement>;
  onSend: () => void;
  onInspect: (id: ServiceId) => void;
  onFail: (id: ServiceId) => void;
  onRecover: () => void;
}

interface ActionTileProps {
  step: string;
  title: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}

function ActionTile({ step, title, detail, onClick, disabled, buttonRef }: ActionTileProps) {
  const id = useId();
  return (
    <li>
      <button
        ref={buttonRef}
        type="button"
        className="hero-console-tile"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-detail`}
        onClick={onClick}
        disabled={disabled}
      >
        <span className="hero-console-step" aria-hidden="true">
          {step}
        </span>
        <span id={`${id}-title`} className="hero-console-tile-title">
          {title}
        </span>
        <span id={`${id}-detail`} className="hero-console-tile-detail">
          {detail}
        </span>
      </button>
    </li>
  );
}

/**
 * "Explore the system": a small trigger that opens the simulation console. Every action
 * dispatches into the hero's deterministic state machine, so the sculpture and the caption
 * always describe the same state.
 */
export function HeroConsole({
  open,
  onOpenChange,
  failed,
  caption,
  inspectButtonRef,
  onSend,
  onInspect,
  onFail,
  onRecover,
}: HeroConsoleProps) {
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<ServiceId>("inference");

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() =>
      panelRef.current?.querySelector<HTMLElement>(".hero-console-tile")?.focus()
    );
  }, [open]);

  const close = () => {
    onOpenChange(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div
      className="hero-console"
      data-open={String(open)}
      onKeyDown={(event) => {
        // A service dialog owns Escape while it is open; it sits outside this subtree.
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="hero-console-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : onOpenChange(true))}
      >
        <span className="hero-console-glyph" aria-hidden="true" />
        Explore the system
      </button>

      <div
        id={panelId}
        ref={panelRef}
        className="hero-console-panel"
        role="group"
        aria-label="System simulation"
        hidden={!open}
      >
        <div className="hero-console-head">
          <label className="hero-console-target">
            <span>Target service</span>
            <select
              className="hero-console-select"
              value={target}
              onChange={(event) => setTarget(event.target.value as ServiceId)}
            >
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="hero-console-close"
            aria-label="Close system console"
            onClick={close}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <ol className="hero-console-actions">
          <ActionTile
            step="01"
            title="Send a request"
            detail="Trace one request end to end."
            onClick={onSend}
          />
          <ActionTile
            step="02"
            title="Inspect a service"
            detail="What it does and how it fails."
            onClick={() => onInspect(target)}
            buttonRef={inspectButtonRef}
          />
          <ActionTile
            step="03"
            title="Simulate failure"
            detail="Take it down; traffic reroutes."
            onClick={() => onFail(target)}
          />
          <ActionTile
            step="04"
            title="Observe recovery"
            detail={failed ? "Bring it back online." : "Available after a failure."}
            onClick={onRecover}
            disabled={!failed}
          />
        </ol>

        <p className="hero-console-status" aria-hidden="true">
          {caption}
        </p>
      </div>

      {/* The announced copy of the status: always mounted, so changes made from the sculpture's
          hotspots are read out even while the console is closed. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only" data-testid="hero-caption">
        {caption}
      </p>
    </div>
  );
}
