import { describe, it, expect } from 'vitest';
import {
  cardUrl,
  readQR,
  backPosition,
  demoDeck,
  mergeSongs,
  parseImport,
  csvExport,
  validateDeck,
} from './model';
describe('self contained cards', () => {
  it('round trips sources and theme without a shared database', () => {
    const d = demoDeck(),
      s = d.songs[1];
    expect(readQR(cardUrl(s, d.theme, 'https://example.org/Hiciarz/'))).toEqual({
      kind: 'card',
      card: { v: 1, id: s.id, theme: 'fish', sources: s.sources },
    });
  });
  it('rejects foreign QR and malformed pairing codes', () => {
    expect(() => readQR('https://example.org/#pair=abc&token=oops')).toThrow();
    expect(() => readQR('javascript:alert(1)')).toThrow();
  });
});
describe('duplex imposition', () => {
  it('maps all 12 long edge positions to mirrored columns', () => {
    for (let i = 0; i < 12; i++) {
      const p = backPosition(i, 'long');
      expect(p.col + (i % 3)).toBe(2);
      expect(p.row).toBe(Math.floor(i / 3));
    }
  });
  it('maps short edge positions to mirrored rows including partial sheets', () => {
    expect(backPosition(0, 'short')).toEqual({ col: 0, row: 3 });
    expect(backPosition(4, 'short')).toEqual({ col: 1, row: 2 });
  });
});
describe('portable projects and imports', () => {
  it('keeps the QR theme when the low toner print preset is selected', () => {
    const deck = demoDeck();
    deck.theme = 'fish';
    deck.print.style = 'laser';
    const restored = validateDeck(JSON.parse(JSON.stringify(deck)));
    expect(restored.print.style).toBe('laser');
    const qr = readQR(cardUrl(restored.songs[0], restored.theme, 'https://example.com/'));
    expect(qr.kind === 'card' && qr.card.theme).toBe('fish');
  });
  it('round trips Polish CSV with commas and line breaks', () => {
    const s = { ...demoDeck().songs[0], title: 'Żółć, „piosenka”\nczęść 2' };
    const result = parseImport(csvExport([s]), 'songs.csv');
    expect(Array.isArray(result) && result[0].title).toBe(s.title);
  });
  it('preserves edited existing records on append and replaces on request', () => {
    const s = demoDeck().songs[0],
      edited = { ...s, title: 'Poprawiony tytuł' };
    expect(mergeSongs([edited], [s], 'append').songs[0].title).toBe('Poprawiony tytuł');
    expect(mergeSongs([edited], [s], 'replace').songs[0].title).toBe(s.title);
  });
  it('rejects invalid sources and duplicate ids', () => {
    const d = demoDeck();
    expect(() => validateDeck({ ...d, songs: [d.songs[0], d.songs[0]] })).toThrow();
    expect(() =>
      parseImport(
        JSON.stringify([
          { title: 'x', artist: 'y', year: 2000, sources: { youtube: 'javascript:alert(1)' } },
        ]),
        'x.json',
      ),
    ).toThrow();
  });
});
