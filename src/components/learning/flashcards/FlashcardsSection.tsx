import { useCallback, useEffect, useState } from "react";
import { LearningInteractiveCard } from "@/components/learning/LearningInteractiveCard";
import { HUB_CARD_GRID } from "@/components/InteractiveCard";
import { FLASHCARD_DECK_TOPICS } from "@/data/flashcardDeckTopics";
import type { Flashcard } from "@/types/flashcard";
import { fetchFlashcards } from "@/lib/flashcardsApi";

export function FlashcardsSection() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFlashcards();
      setCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flashcards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const countByDeck = (deckId: string) => cards.filter((card) => card.deck === deckId).length;

  return (
    <section
      className="mt-20 border-t theme-divider pt-16"
      aria-labelledby="flashcards-heading"
      id="flashcards"
    >
      <div className="mb-8">
        <p className="text-[0.6875rem] font-mono tracking-[0.25em] uppercase text-[var(--color-gold)]">
          Quick revision
        </p>
        <h2
          id="flashcards-heading"
          className="theme-heading mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Flashcards
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--color-body)]">
          Choose a deck for coding, system design, or Sanskrit — review with precision-styled flip
          cards.
        </p>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading decks…</p>
      ) : (
        <div className={HUB_CARD_GRID}>
          {FLASHCARD_DECK_TOPICS.map((topic, index) => {
            const cardCount = countByDeck(topic.id);
            const countLabel = `${cardCount} ${cardCount === 1 ? "card" : "cards"}`;

            return (
              <LearningInteractiveCard
                key={topic.id}
                topic={{
                  ...topic,
                  tags: [...topic.tags, countLabel],
                }}
                index={index}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
