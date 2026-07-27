import bundledFlashcards from "@/data/flashcards.json";
import type { Flashcard, FlashcardWritePayload } from "@/types/flashcard";

export const flashcardsEditable = import.meta.env.DEV;

function normalizeFlashcard(card: Flashcard): Flashcard {
  return {
    ...card,
    deck: card.deck ?? "coding-challenge",
  };
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

/** Load flashcards — dev API in development, bundled JSON in production. */
export async function fetchFlashcards(): Promise<Flashcard[]> {
  if (import.meta.env.DEV) {
    const res = await fetch("/api/flashcards");
    return parseJsonResponse<Flashcard[]>(res).then((cards) => cards.map(normalizeFlashcard));
  }
  return (bundledFlashcards as Flashcard[]).map(normalizeFlashcard);
}

export async function createFlashcard(payload: FlashcardWritePayload): Promise<Flashcard> {
  const res = await fetch("/api/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Flashcard>(res);
}

export async function updateFlashcard(
  id: string,
  payload: FlashcardWritePayload
): Promise<Flashcard> {
  const res = await fetch(`/api/flashcards/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<Flashcard>(res);
}

export async function deleteFlashcard(id: string): Promise<void> {
  const res = await fetch(`/api/flashcards/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseJsonResponse<{ ok: boolean }>(res);
}
