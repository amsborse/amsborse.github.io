import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { FlashcardDeckId } from "@/data/flashcardDecks";
import { getFlashcardDeck } from "@/data/flashcardDecks";
import type { Flashcard } from "@/types/flashcard";
import { FLASHCARD_DEV_READONLY_MESSAGE } from "@/types/flashcard";
import {
  createFlashcard,
  deleteFlashcard,
  fetchFlashcards,
  flashcardsEditable,
  updateFlashcard,
} from "@/lib/flashcardsApi";
import { FlashcardFormModal } from "./FlashcardFormModal";
import { FlashcardItem } from "./FlashcardItem";
import { contentAreaToPayload, deriveFlashcardTitle } from "./flashcardContentUtils";

type FlashcardsDeckViewProps = {
  deckId: FlashcardDeckId;
};

export function FlashcardsDeckView({ deckId }: FlashcardsDeckViewProps) {
  const deck = getFlashcardDeck(deckId);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCard, setEditingCard] = useState<Flashcard | undefined>();

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFlashcards();
      setCards(data.filter((card) => card.deck === deckId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flashcards");
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  if (!deck) {
    return null;
  }

  const showReadOnlyNotice = () => {
    setToast(FLASHCARD_DEV_READONLY_MESSAGE);
    window.setTimeout(() => setToast(null), 4000);
  };

  const openAdd = () => {
    if (!flashcardsEditable) {
      showReadOnlyNotice();
      return;
    }
    setModalMode("add");
    setEditingCard(undefined);
    setModalOpen(true);
  };

  const openEdit = (card: Flashcard) => {
    if (!flashcardsEditable) {
      showReadOnlyNotice();
      return;
    }
    setModalMode("edit");
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleDelete = async (card: Flashcard) => {
    if (!flashcardsEditable) {
      showReadOnlyNotice();
      return;
    }
    const confirmed = window.confirm(
      `Delete "${deriveFlashcardTitle(card.front)}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteFlashcard(card.id);
      await loadCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleSave = async (payload: {
    front: ReturnType<typeof contentAreaToPayload>;
    back: ReturnType<typeof contentAreaToPayload>;
  }) => {
    if (!flashcardsEditable) {
      showReadOnlyNotice();
      throw new Error(FLASHCARD_DEV_READONLY_MESSAGE);
    }
    const title = deriveFlashcardTitle({
      text: payload.front.text,
      imagePath: payload.front.imagePath,
    });
    const writePayload = { deck: deckId, title, ...payload };
    if (modalMode === "add") {
      await createFlashcard(writePayload);
    } else if (editingCard) {
      await updateFlashcard(editingCard.id, writePayload);
    }
    setModalOpen(false);
    await loadCards();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 pb-[max(4rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
      <Link
        to="/learning#flashcards"
        className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]"
      >
        ← Back to Learning
      </Link>

      <div className="mt-8 mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)]">
            Flashcards
          </p>
          <h1 className="theme-heading mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {deck.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-body)]">{deck.description}</p>
        </div>
        {flashcardsEditable ? (
          <button
            type="button"
            onClick={openAdd}
            className="shrink-0 min-h-11 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-[var(--color-on-accent)] hover:bg-[var(--color-accent-bright)] touch-manipulation"
          >
            Add flashcard
          </button>
        ) : null}
      </div>

      {toast ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          {toast}
        </p>
      ) : null}

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading flashcards…</p>
      ) : cards.length === 0 ? (
        <p className="theme-panel rounded-xl border-dashed px-6 py-10 text-center text-sm text-[var(--color-ink-muted)]">
          {flashcardsEditable
            ? "No flashcards in this deck yet. Add one to start revising."
            : "No flashcards in this deck yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-10 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <FlashcardItem
                card={card}
                editable={flashcardsEditable}
                onEdit={() => openEdit(card)}
                onDelete={() => void handleDelete(card)}
                onReadOnlyAction={showReadOnlyNotice}
              />
            </li>
          ))}
        </ul>
      )}

      {flashcardsEditable ? (
        <FlashcardFormModal
          open={modalOpen}
          mode={modalMode}
          initial={editingCard}
          onCancel={() => setModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
