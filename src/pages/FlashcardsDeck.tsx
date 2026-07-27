import { Navigate, useParams } from "react-router-dom";
import { getFlashcardDeck, isFlashcardDeckId } from "@/data/flashcardDecks";
import { FlashcardsDeckView } from "@/components/learning/flashcards/FlashcardsDeckView";

export default function FlashcardsDeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const deck = deckId && isFlashcardDeckId(deckId) ? getFlashcardDeck(deckId) : undefined;

  if (!deck) {
    return <Navigate to="/learning#flashcards" replace />;
  }

  return <FlashcardsDeckView deckId={deck.id} />;
}
