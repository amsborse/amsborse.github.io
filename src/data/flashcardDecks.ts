export const FLASHCARD_DECK_IDS = ["coding-challenge", "system-design", "sanskrit"] as const;

export type FlashcardDeckId = (typeof FLASHCARD_DECK_IDS)[number];

export type FlashcardDeck = {
  id: FlashcardDeckId;
  title: string;
  description: string;
  path: string;
};

export const FLASHCARD_DECKS: FlashcardDeck[] = [
  {
    id: "coding-challenge",
    title: "Coding Challenge",
    description: "Algorithm and data-structure prompts for quick revision.",
    path: "/learning/flashcards/coding-challenge",
  },
  {
    id: "system-design",
    title: "System Design",
    description: "Architecture, scaling, and distributed-system concepts for interview prep.",
    path: "/learning/flashcards/system-design",
  },
  {
    id: "sanskrit",
    title: "Sanskrit",
    description: "Vocabulary, grammar, and verse recall for Sanskrit study.",
    path: "/learning/flashcards/sanskrit",
  },
];

export function getFlashcardDeck(id: string): FlashcardDeck | undefined {
  return FLASHCARD_DECKS.find((deck) => deck.id === id);
}

export function isFlashcardDeckId(id: string): id is FlashcardDeckId {
  return FLASHCARD_DECK_IDS.includes(id as FlashcardDeckId);
}
