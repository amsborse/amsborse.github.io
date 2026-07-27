/** Page-wide animation priority while a flashcard is expanding, flipping, or focused. */
export type FlashcardAnimationPriority = {
  motion: boolean;
  focused: boolean;
};

export function syncFlashcardAnimationPriority({
  motion,
  focused,
}: FlashcardAnimationPriority): void {
  document.documentElement.classList.toggle("flashcard-motion", motion);
  document.documentElement.classList.toggle("flashcard-focused", focused);
}

export function readFlashcardAnimationPriority(): FlashcardAnimationPriority {
  const root = document.documentElement;
  return {
    motion: root.classList.contains("flashcard-motion"),
    focused: root.classList.contains("flashcard-focused"),
  };
}
