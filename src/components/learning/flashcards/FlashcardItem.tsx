import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import type { Flashcard } from "@/types/flashcard";
import { PrecisionFlashcard } from "@/components/arsenal/PrecisionTaskCard";
import { flashcardAriaLabel } from "./flashcardContentUtils";
import { readFitSnapshot, toCardRect } from "@/lib/expandedFlashcardGeometry";
import {
  closedFlashcardExpansion,
  ExpandedFlashcard,
  type ExpandedFlashcardState,
} from "./ExpandedFlashcard";
import styles from "./expanded-flashcard.module.css";

type FlashcardItemProps = {
  card: Flashcard;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReadOnlyAction?: () => void;
};

export function FlashcardItem({
  card,
  editable,
  onEdit,
  onDelete,
  onReadOnlyAction,
}: FlashcardItemProps) {
  const [expansion, setExpansion] = useState<ExpandedFlashcardState>(closedFlashcardExpansion);
  const sourceRef = useRef<HTMLDivElement>(null);
  const flipId = useId();
  const isExpanded = expansion.selectedCardId === card.id;
  const cardLabel = flashcardAriaLabel(card.front, card.back);

  useEffect(() => {
    setExpansion(closedFlashcardExpansion);
  }, [card.id]);

  const openCard = useCallback(() => {
    if (!sourceRef.current || expansion.selectedCardId) return;

    setExpansion({
      selectedCardId: card.id,
      phase: "opening",
      sourceRect: toCardRect(sourceRef.current.getBoundingClientRect()),
      fitSnapshot: readFitSnapshot(sourceRef.current),
    });
  }, [card.id, expansion.selectedCardId]);

  const beginClose = useCallback(() => {
    setExpansion((current) => {
      if (!current.selectedCardId) return current;
      const currentSource = sourceRef.current?.getBoundingClientRect();

      return {
        ...current,
        phase: "closing",
        sourceRect: currentSource ? toCardRect(currentSource) : current.sourceRect,
      };
    });
  }, []);

  const finishClose = useCallback(() => {
    setExpansion(closedFlashcardExpansion);
    window.requestAnimationFrame(() => sourceRef.current?.focus({ preventScroll: true }));
  }, []);

  const changePhase = useCallback((phase: ExpandedFlashcardState["phase"]) => {
    setExpansion((current) => ({ ...current, phase }));
  }, []);

  const handleSourceKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      openCard();
    }
  };

  return (
    <article className="flashcard-item flex flex-col gap-3">
      <span id={`${flipId}-label`} className="sr-only">
        {cardLabel} — click to reveal the back in an expanded card.
      </span>

      <div className={styles.cardCell}>
        <div
          ref={sourceRef}
          className={styles.cardSource}
          role="button"
          tabIndex={isExpanded ? -1 : 0}
          aria-label={`Reveal back for ${cardLabel}`}
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? `${card.id}-expanded-label` : undefined}
          data-expanded={isExpanded ? "true" : "false"}
          onClick={openCard}
          onKeyDown={handleSourceKeyDown}
        >
          <PrecisionFlashcard
            id={card.id}
            front={card.front}
            back={card.back}
            fitTextActive={!isExpanded}
          />
        </div>
      </div>

      {isExpanded ? (
        <ExpandedFlashcard
          card={card}
          state={expansion}
          editable={editable}
          onPhaseChange={changePhase}
          onBeginClose={beginClose}
          onClosed={finishClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onReadOnlyAction={onReadOnlyAction}
        />
      ) : null}
    </article>
  );
}
