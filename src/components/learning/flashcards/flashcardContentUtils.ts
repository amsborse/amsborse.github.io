import type { FlashcardSide } from "@/types/flashcard";

export type ContentAreaValue = {
  text: string;
  imagePreview: string | null;
  imageData: string | null;
  existingImagePath: string | null;
  removeImage: boolean;
};

export function emptyContentArea(): ContentAreaValue {
  return {
    text: "",
    imagePreview: null,
    imageData: null,
    existingImagePath: null,
    removeImage: false,
  };
}

export function contentAreaFromSide(side: { text?: string; imagePath?: string }): ContentAreaValue {
  return {
    text: side.text ?? "",
    imagePreview: side.imagePath ?? null,
    imageData: null,
    existingImagePath: side.imagePath ?? null,
    removeImage: false,
  };
}

export function contentAreaToPayload(value: ContentAreaValue) {
  const payload: {
    text?: string;
    imagePath?: string;
    imageData?: string;
    removeImage?: boolean;
  } = {};

  if (value.text.trim()) payload.text = value.text;
  if (value.imageData) {
    payload.imageData = value.imageData;
  } else if (value.existingImagePath && !value.removeImage) {
    payload.imagePath = value.existingImagePath;
  }
  if (value.removeImage) payload.removeImage = true;

  return payload;
}

export function validateContentArea(value: ContentAreaValue, label: string): string | null {
  const hasText = value.text.trim().length > 0;
  const hasImage =
    Boolean(value.imageData) || (Boolean(value.existingImagePath) && !value.removeImage);
  if (!hasText && !hasImage) {
    return `${label} needs text and/or an image`;
  }
  return null;
}

const MAX_DERIVED_TITLE_LENGTH = 200;

/** Internal label for storage and screen readers — derived from front content. */
export function deriveFlashcardTitle(front: FlashcardSide): string {
  const line = front.text?.trim().split(/\r?\n/)[0]?.trim();
  if (line) return line.slice(0, MAX_DERIVED_TITLE_LENGTH);
  if (front.imagePath) return "Image card";
  return "Flashcard";
}

/** First line as card title; remaining lines as body text. */
export function splitFlashcardFrontDisplay(text?: string): {
  title: string | null;
  body: string | null;
} {
  if (!text?.trim()) return { title: null, body: null };

  const lines = text.split(/\r?\n/);
  const title = lines[0]?.trim().slice(0, MAX_DERIVED_TITLE_LENGTH) || null;
  const body = lines.slice(1).join("\n").trim() || null;

  return { title, body };
}

export function flashcardAriaLabel(front: FlashcardSide, back: FlashcardSide): string {
  const preview = front.text?.trim().split(/\r?\n/)[0]?.trim();
  if (preview) return preview;
  if (front.imagePath && back.imagePath) return "Flashcard with front and back images";
  if (front.imagePath) return "Flashcard with front image";
  return "Flashcard";
}
