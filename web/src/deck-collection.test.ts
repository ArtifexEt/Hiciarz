import { describe, expect, it } from 'vitest';
import { removeDeck } from './deck-collection';
import { defaultPrint, demoDeck, newDeck } from './model';

function collection() {
  return [
    { ...demoDeck(), id: 'first', name: 'First deck' },
    { ...newDeck(), id: 'second', name: 'Second deck', theme: 'fish' as const },
    { ...demoDeck(), id: 'third', name: 'Third deck', back: 'custom-card-background' },
  ];
}

describe('deck collection removal', () => {
  it('ignores a missing target without changing the collection or active deck', () => {
    const decks = collection();
    const result = removeDeck(decks, 'third', 'missing');
    expect(result.decks).toBe(decks);
    expect(result.activeId).toBe('third');

    const empty: typeof decks = [];
    const emptyResult = removeDeck(empty, 'missing-active', 'missing');
    expect(emptyResult.decks).toBe(empty);
    expect(emptyResult.activeId).toBe('missing-active');
  });

  it('removes an inactive deck while preserving the active deck, survivor data and input', () => {
    const decks = collection();
    const before = JSON.stringify(decks);
    const result = removeDeck(decks, 'third', 'second');

    expect(result.decks.map((deck) => deck.id)).toEqual(['first', 'third']);
    expect(result.activeId).toBe('third');
    expect(result.decks[0]).toBe(decks[0]);
    expect(result.decks[1]).toBe(decks[2]);
    expect(result.decks[1].songs).toBe(decks[2].songs);
    expect(result.decks[1].print).toBe(decks[2].print);
    expect(JSON.stringify(decks)).toBe(before);
  });

  it('selects the first remaining deck when the active deck is removed', () => {
    const decks = collection();
    const result = removeDeck(decks, 'second', 'second');

    expect(result.decks).toEqual([decks[0], decks[2]]);
    expect(result.activeId).toBe('first');
  });

  it('recovers a missing active deck by selecting an existing survivor', () => {
    const decks = collection();
    const result = removeDeck(decks, 'missing-active', 'first');

    expect(result.decks).toEqual([decks[1], decks[2]]);
    expect(result.activeId).toBe('second');
  });

  it('replaces the final removed deck with a new empty deck instead of reusing deleted data', () => {
    const deleted = collection()[2];
    const decks = [deleted];
    const before = JSON.stringify(decks);
    const result = removeDeck(decks, deleted.id, deleted.id);

    expect(result.decks).toHaveLength(1);
    expect(result.decks[0]).not.toBe(deleted);
    expect(result.decks[0].id).not.toBe(deleted.id);
    expect(result.decks[0]).toMatchObject({
      version: 1,
      theme: 'classic',
      songs: [],
      print: defaultPrint,
    });
    expect(result.decks[0].back).toBeUndefined();
    expect(result.activeId).toBe(result.decks[0].id);
    expect(JSON.stringify(decks)).toBe(before);
  });
});
