import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Flashcard } from "@/types/flashcard";
import { getExpandedCardRect, readViewportMetrics } from "@/lib/expandedFlashcardGeometry";
import { FlashcardContentArea } from "./FlashcardContentArea";
import { PrecisionFormActions, PrecisionFormPanel, PrecisionFormShell } from "./PrecisionFormShell";
import {
  contentAreaFromSide,
  contentAreaToPayload,
  emptyContentArea,
  validateContentArea,
  type ContentAreaValue,
} from "./flashcardContentUtils";

type FlashcardFormModalProps = {
  open: boolean;
  mode: "add" | "edit";
  initial?: Flashcard;
  onCancel: () => void;
  onSave: (payload: {
    front: ReturnType<typeof contentAreaToPayload>;
    back: ReturnType<typeof contentAreaToPayload>;
  }) => Promise<void>;
};

interface FlashcardFormDialogStyle extends CSSProperties {
  "--flashcard-form-width": string;
  "--flashcard-form-height": string;
}

function useFlashcardFormSize(open: boolean) {
  const [size, setSize] = useState(() => {
    const rect = getExpandedCardRect(readViewportMetrics());
    return { width: rect.width, height: rect.height };
  });

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const rect = getExpandedCardRect(readViewportMetrics());
      setSize({ width: rect.width, height: rect.height });
    };

    update();
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
  }, [open]);

  return size;
}

export function FlashcardFormModal({
  open,
  mode,
  initial,
  onCancel,
  onSave,
}: FlashcardFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const [front, setFront] = useState<ContentAreaValue>(emptyContentArea());
  const [back, setBack] = useState<ContentAreaValue>(emptyContentArea());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const cardSize = useFlashcardFormSize(open);

  const dialogStyle: FlashcardFormDialogStyle = {
    "--flashcard-form-width": `${cardSize.width}px`,
    "--flashcard-form-height": `${cardSize.height}px`,
  };

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const { style } = document.body;
    style.overflow = "";
    style.position = "";
    style.top = "";
    style.width = "";

    dialog.showModal();
    setFront(initial ? contentAreaFromSide(initial.front) : emptyContentArea());
    setBack(initial ? contentAreaFromSide(initial.back) : emptyContentArea());
    setFormError(null);
    requestAnimationFrame(() => {
      if (window.matchMedia("(pointer: coarse)").matches) return;
      frontRef.current?.focus({ preventScroll: true });
    });

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const frontError = validateContentArea(front, "Front");
    const backError = validateContentArea(back, "Back");
    if (frontError || backError) {
      setFormError(frontError ?? backError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSave({
        front: contentAreaToPayload(front),
        back: contentAreaToPayload(back),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="flashcard-dialog precision-form-dialog"
      aria-labelledby={`flashcard-form-${mode}-form-title`}
      data-lenis-prevent
      style={dialogStyle}
    >
      <form onSubmit={handleSubmit} className="precision-form-dialog__form">
        <PrecisionFormShell
          id={`flashcard-form-${mode}`}
          eyebrow={mode === "add" ? "New card" : "Edit card"}
          title={mode === "add" ? "Add flashcard" : "Edit flashcard"}
          footer={
            <PrecisionFormActions onCancel={onCancel} submitLabel="Save" submitting={submitting} />
          }
        >
          <div className="precision-form-card__fields">
            <PrecisionFormPanel label="Front" side="front">
              <FlashcardContentArea
                ref={frontRef}
                label="Front"
                value={front}
                onChange={setFront}
                hideLabel
              />
            </PrecisionFormPanel>

            <PrecisionFormPanel label="Back" side="back">
              <FlashcardContentArea label="Back" value={back} onChange={setBack} hideLabel />
            </PrecisionFormPanel>

            {formError ? <p className="precision-form-card__error">{formError}</p> : null}
          </div>
        </PrecisionFormShell>
      </form>
    </dialog>
  );
}
