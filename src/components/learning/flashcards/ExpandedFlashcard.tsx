import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PrecisionFlashcard,
  rarityColors,
  type TaskRarity,
} from "@/components/arsenal/PrecisionTaskCard";
import {
  getExpandedCardRect,
  readViewportMetrics,
  scaleSnapshotFont,
  type CardRect,
  type FlashcardFitSnapshot,
  type ViewportMetrics,
} from "@/lib/expandedFlashcardGeometry";
import { syncFlashcardAnimationPriority } from "@/lib/flashcardAnimationPriority";
import type { Flashcard } from "@/types/flashcard";
import styles from "./expanded-flashcard.module.css";

export type CardExpansionPhase = "closed" | "opening" | "open" | "closing";

export interface ExpandedFlashcardState {
  selectedCardId: string | null;
  phase: CardExpansionPhase;
  sourceRect: CardRect | null;
  fitSnapshot: FlashcardFitSnapshot | null;
}

interface ExpansionShellStyle extends CSSProperties {
  "--expanded-accent": string;
}

type ExpandedFlashcardProps = {
  card: Flashcard;
  state: ExpandedFlashcardState;
  editable: boolean;
  rarity?: TaskRarity;
  onPhaseChange: (phase: CardExpansionPhase) => void;
  onBeginClose: () => void;
  onClosed: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReadOnlyAction?: () => void;
};

const EXPAND_MS = 640;
const CLOSE_MS = 540;

function useViewportMetrics() {
  const [viewport, setViewport] = useState<ViewportMetrics>(() => readViewportMetrics());
  const frozenRef = useRef<ViewportMetrics>(viewport);

  useEffect(() => {
    const update = () => setViewport(readViewportMetrics());
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
    };
  }, []);

  const freezeViewport = useCallback(() => {
    frozenRef.current = readViewportMetrics();
  }, []);

  const getLayoutViewport = useCallback(
    (phase: CardExpansionPhase) => (phase === "open" ? viewport : frozenRef.current),
    [viewport]
  );

  return { viewport, freezeViewport, getLayoutViewport };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function ExpandedFlashcard({
  card,
  state,
  editable,
  rarity = "rare",
  onPhaseChange,
  onBeginClose,
  onClosed,
  onEdit,
  onDelete,
  onReadOnlyAction,
}: ExpandedFlashcardProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { freezeViewport, getLayoutViewport } = useViewportMetrics();
  const reducedMotion = useReducedMotion();
  const [motionActive, setMotionActive] = useState(false);
  const [focusActive, setFocusActive] = useState(false);
  const sourceRect = state.sourceRect;
  const settled = state.phase === "open";
  const closing = state.phase === "closing";
  const layoutViewport = getLayoutViewport(state.phase);
  const expandedRect = getExpandedCardRect(layoutViewport);

  useEffect(() => {
    if (state.phase === "opening") {
      freezeViewport();
      setMotionActive(true);
      setFocusActive(false);

      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          onPhaseChange("open");
        });
      });

      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }

    if (state.phase === "closing") {
      freezeViewport();
      setMotionActive(true);
      setFocusActive(false);
    }

    return undefined;
  }, [freezeViewport, onPhaseChange, state.phase]);

  useEffect(() => {
    if (!motionActive) return;

    const duration =
      state.phase === "closing"
        ? reducedMotion
          ? 220
          : CLOSE_MS
        : reducedMotion
          ? 220
          : EXPAND_MS;

    const timer = window.setTimeout(() => {
      setMotionActive(false);
      if (state.phase === "open") {
        setFocusActive(true);
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [motionActive, reducedMotion, state.phase]);

  useEffect(() => {
    syncFlashcardAnimationPriority({ motion: motionActive, focused: focusActive });
    return () => syncFlashcardAnimationPriority({ motion: false, focused: false });
  }, [focusActive, motionActive]);

  useEffect(() => {
    if (!settled) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [settled]);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(onClosed, reducedMotion ? 220 : CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [closing, onClosed, reducedMotion]);

  const requestClose = useCallback(() => {
    if (closing) return;
    onBeginClose();
  }, [closing, onBeginClose]);

  const handleEdit = () => {
    if (!editable) {
      onReadOnlyAction?.();
      return;
    }
    onClosed();
    onEdit();
  };

  const handleDelete = () => {
    if (!editable) {
      onReadOnlyAction?.();
      return;
    }
    onClosed();
    onDelete();
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose]);

  if (!sourceRect || state.selectedCardId !== card.id) return null;

  const shellRect = settled ? expandedRect : sourceRect;

  const scaledFrontFonts: FlashcardFitSnapshot | undefined = state.fitSnapshot
    ? {
        title:
          state.fitSnapshot.title != null
            ? scaleSnapshotFont(state.fitSnapshot.title, sourceRect, shellRect, 14, 52)
            : undefined,
        body:
          state.fitSnapshot.body != null
            ? scaleSnapshotFont(state.fitSnapshot.body, sourceRect, shellRect, 11, 24)
            : undefined,
      }
    : undefined;

  const shellStyle: ExpansionShellStyle = {
    top: shellRect.top,
    left: shellRect.left,
    width: shellRect.width,
    height: shellRect.height,
    "--expanded-accent": rarityColors[rarity],
  };

  const backFooter =
    editable && settled ? (
      <>
        <button
          type="button"
          className={styles.cardActionButton}
          onClick={handleEdit}
          disabled={closing}
        >
          Edit
        </button>
        <button
          type="button"
          className={`${styles.cardActionButton} ${styles.cardActionButtonDanger}`}
          onClick={handleDelete}
          disabled={closing}
        >
          Delete
        </button>
      </>
    ) : undefined;

  return createPortal(
    <div
      className={styles.portal}
      data-phase={state.phase}
      data-focused={focusActive ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <div className={styles.backdrop} aria-hidden="true" onPointerDown={requestClose} />

      <div
        className={styles.transformCard}
        data-phase={state.phase}
        data-focused={focusActive ? "true" : "false"}
        data-motion={motionActive ? "active" : "idle"}
        style={shellStyle}
      >
        <div
          className={styles.dialog}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${card.id}-expanded-label`}
        >
          <button
            className={styles.closeButton}
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            disabled={closing}
            aria-label="Close flashcard"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          <div className={styles.inner}>
            <div className={styles.frontFace} aria-hidden={settled ? "true" : "false"}>
              <PrecisionFlashcard
                id={`${card.id}-expanded`}
                front={card.front}
                back={card.back}
                sideLabel="Front"
                contentLayout="expanded"
                className={styles.expandedFrontCard}
                controlledFonts={scaledFrontFonts}
                fitTextActive={!scaledFrontFonts && !settled}
                disablePointerLighting
              />
            </div>

            <div className={styles.backFace} aria-hidden={settled ? "false" : "true"}>
              <PrecisionFlashcard
                id={`${card.id}-expanded-back`}
                front={card.back}
                sideLabel="Back"
                contentLayout="expanded"
                className={styles.expandedBackCard}
                footer={backFooter}
                fitTextActive={settled}
                disablePointerLighting
              />
              <span id={`${card.id}-expanded-label`} className="sr-only">
                Back
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const closedFlashcardExpansion: ExpandedFlashcardState = {
  selectedCardId: null,
  phase: "closed",
  sourceRect: null,
  fitSnapshot: null,
};
