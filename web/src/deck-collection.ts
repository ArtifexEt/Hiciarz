import { newDeck, type Deck } from './model';

export function removeDeck(
  decks: Deck[],
  activeId: string,
  targetId: string,
): { decks: Deck[]; activeId: string } {
  if (!decks.some((deck) => deck.id === targetId)) return { decks, activeId };

  const remaining = decks.filter((deck) => deck.id !== targetId);
  const next = remaining.length ? remaining : [newDeck()];
  return {
    decks: next,
    activeId: next.some((deck) => deck.id === activeId) ? activeId : next[0].id,
  };
}
