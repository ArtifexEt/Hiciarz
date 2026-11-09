import { describe, expect, it } from 'vitest';
import { createExampleDeck, examplePlaylists } from './examples';
import { cardUrl, mergeSongs, readQR, validateDeck } from './model';

describe('bundled playlist examples', () => {
  it('contains the complete ordered Christmas snapshot and valid playable card sources', () => {
    const p = examplePlaylists.find((p) => p.id === 'christmas-hits')!;
    expect(p).toBeDefined();
    expect(new Set(examplePlaylists.map((p) => p.id)).size).toBe(examplePlaylists.length);
    expect(validateDeck(p.deck).songs).toHaveLength(151);
    expect(p.deck.songs[0].sources.spotify).toBe('2EjXfH91m7f8HiJN1yQg97');
    expect(new Set(p.deck.songs.map((s) => s.sources.spotify)).size).toBe(151);
    for (const song of p.deck.songs) {
      expect(song.review).toBe(true);
      const qr = readQR(cardUrl(song, p.deck.theme, 'https://example.com/Hiciarz/'));
      expect(qr.kind).toBe('card');
      if (qr.kind === 'card') expect(qr.card.sources).toEqual(song.sources);
    }
  });

  it('creates independent copies without changing the template or previously printed cards', () => {
    const a = createExampleDeck('christmas-hits');
    const b = createExampleDeck('christmas-hits');
    expect(a.id).not.toBe(b.id);
    expect(a.songs[0].id).not.toBe(b.songs[0].id);
    const title = b.songs[0].title;
    a.songs[0].title = 'Własna poprawka';
    a.songs[0].sources.spotify = undefined;
    a.print.style = 'laser';
    expect(b.songs[0].title).toBe(title);
    const c = createExampleDeck('christmas-hits');
    expect(c.songs[0].title).toBe(title);
    expect(c.songs[0].sources.spotify).toBeTruthy();
    expect(c.print.style).toBe('theme');
  });

  it('preserves manual corrections when appending an example again', () => {
    const original = createExampleDeck('christmas-hits');
    original.songs[0].title = 'Poprawiony tytuł';
    original.songs[0].year = 1958;
    original.songs[0].review = false;
    const merged = mergeSongs(original.songs, createExampleDeck('christmas-hits').songs, 'append');
    expect(merged.songs).toHaveLength(151);
    expect(merged.skipped).toBe(151);
    expect(merged.songs[0]).toEqual(original.songs[0]);
    expect(() => createExampleDeck('unknown')).toThrow('Nie znaleziono');
  });
});
