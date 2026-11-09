import { describe, expect, it } from 'vitest';
import { frontDesign } from './front';
import { demoDeck, validateDeck } from './model';

describe('answer card colors', () => {
  it('keeps each color attached to its card after reordering', () => {
    const deck = demoDeck();
    const before = deck.songs.map((song) => frontDesign(song, deck).background);
    const reordered = { ...deck, songs: [...deck.songs].reverse() };
    expect(
      reordered.songs.map((song) => frontDesign(song, reordered).background).reverse(),
    ).toEqual(before);
    expect(new Set(before).size).toBeGreaterThan(2);
  });
  it('preserves the chosen color mode through project import and keeps laser backgrounds white', () => {
    const deck = demoDeck();
    deck.print.frontColors = 'theme';
    const imported = validateDeck(JSON.parse(JSON.stringify(deck)));
    expect(imported.print.frontColors).toBe('theme');
    imported.print.style = 'laser';
    expect(
      imported.songs.every((song) => frontDesign(song, imported).background === '#ffffff'),
    ).toBe(true);
  });
});
