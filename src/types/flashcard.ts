import type { FlashcardDeckId } from "@/data/flashcardDecks";

/** One side of a flashcard — plain text/code and/or an image path. */
export type FlashcardSide = {
  text?: string;
  imagePath?: string;
};

export type Flashcard = {
  id: string;
  deck: FlashcardDeckId;
  title: string;
  front: FlashcardSide;
  back: FlashcardSide;
  createdAt: string;
  updatedAt: string;
};

/** Payload sent to dev API when creating or updating a card. */
export type FlashcardWritePayload = {
  deck: FlashcardDeckId;
  title: string;
  front: FlashcardSideInput;
  back: FlashcardSideInput;
};

export type FlashcardSideInput = {
  text?: string;
  /** Existing public path, e.g. `/flashcards/uuid-front.png` */
  imagePath?: string;
  /** Base64 data URL from clipboard paste — saved to disk by dev API only */
  imageData?: string;
  /** When true, remove any existing image for this side */
  removeImage?: boolean;
};

export const FLASHCARD_DEV_READONLY_MESSAGE =
  "Flashcards can only be edited while the local development server is running.";
