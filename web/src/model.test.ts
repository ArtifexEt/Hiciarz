import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import {
  cardUrl,
  readQR,
  backPosition,
  demoDeck,
  mergeSongs,
  parseImport,
  csvExport,
  validateDeck,
  validateSong,
  findDeckForCard,
  themes,
} from './model';
describe('self contained cards', () => {
  it('preserves film and game modes without leaking their answers into QR or losing them in files', () => {
    for (const gameMode of ['movie', 'game'] as const) {
      const song = validateSong({ ...demoDeck().songs[0], gameMode, answer: 'Sekretna odpowiedź' });
      const url = cardUrl(song, 'classic', 'https://example.com/');
      const decoded = readQR(url);
      expect(decoded.kind === 'card' && decoded.card.gameMode).toBe(gameMode);
      expect(url).not.toContain('Sekretna');
      expect(decoded.kind === 'card' && 'answer' in decoded.card).toBe(false);
      const imported = parseImport(csvExport([song]), 'songs.csv');
      expect(Array.isArray(imported) && imported[0].answer).toBe(song.answer);
      expect(Array.isArray(imported) && imported[0].gameMode).toBe(gameMode);
      expect(() => validateSong({ ...song, answer: '' })).toThrow('nazwę filmu lub gry');
      const legacy =
        'https://example.com/#card=' +
        btoa(JSON.stringify(decoded.kind === 'card' ? decoded.card : {}));
      expect(readQR(legacy)).toEqual(decoded);
    }
  });
  it('round trips sources and theme without a shared database', () => {
    const d = demoDeck(),
      s = d.songs[1];
    expect(readQR(cardUrl(s, d.theme, 'https://example.org/Hiciarz/'))).toEqual({
      kind: 'card',
      card: {
        v: 1,
        id: `q2f:s${s.sources.spotify}y${s.sources.youtube}`,
        theme: 'fish',
        sources: s.sources,
      },
    });
  });
  it('rejects foreign QR and malformed pairing codes', () => {
    expect(() => readQR('https://example.org/#pair=abc&token=oops')).toThrow();
    expect(() => readQR('javascript:alert(1)')).toThrow();
  });
  it('reads previously printed version 1 cards without changing their identity', () => {
    const old =
      'https://artifexet.github.io/Hiciarz/#card=eyJ2IjoxLCJpZCI6ImNocmlzdG1hcy0yRWpYZkg5MW03ZjhIaUpOMXlRZzk3IiwidGhlbWUiOiJmaXNoIiwic291cmNlcyI6eyJzcG90aWZ5IjoiMkVqWGZIOTFtN2Y4SGlKTjF5UWc5NyJ9fQ';
    expect(readQR(old)).toEqual({
      kind: 'card',
      card: {
        v: 1,
        id: 'christmas-2EjXfH91m7f8HiJN1yQg97',
        theme: 'fish',
        sources: { spotify: '2EjXfH91m7f8HiJN1yQg97' },
      },
    });
  });
  it('round trips every skin with Spotify, YouTube or both sources', () => {
    const song = demoDeck().songs[1];
    for (const theme of themes)
      for (const sources of [
        { spotify: song.sources.spotify },
        { youtube: song.sources.youtube },
        song.sources,
      ]) {
        const result = readQR(
          cardUrl({ ...song, theme: undefined, sources }, theme, 'https://example.com/'),
        );
        expect(result.kind === 'card' && result.card.sources).toEqual(sources);
        expect(result.kind === 'card' && result.card.theme).toBe(theme);
      }
  });
  it('generates a less dense self-contained Spotify code without card metadata or configuration', () => {
    const song = { ...demoDeck().songs[1], sources: { spotify: '2EjXfH91m7f8HiJN1yQg97' } };
    const url = cardUrl(song, 'fish', 'https://artifexet.github.io/Hiciarz/');
    expect(url.length).toBe(62);
    expect(QRCode.create(url, { errorCorrectionLevel: 'M' }).modules.size).toBeLessThanOrEqual(33);
    expect(
      cardUrl(
        { ...song, id: 'different', title: 'Spoiler', artist: 'Hidden', year: 2001 },
        'fish',
        'https://artifexet.github.io/Hiciarz/',
      ),
    ).toBe(url);
    expect(url).not.toContain('client');
    expect(url).not.toContain('card=');
  });
  it('rejects malformed compact cards rather than guessing a source or skin', () => {
    for (const hash of [
      '#2fsabc',
      '#2zsyoutube',
      '#3fs2EjXfH91m7f8HiJN1yQg97',
      '#2f',
      '#2fyE8gmARGvPlIs2EjXfH91m7f8HiJN1yQg97',
    ])
      expect(() => readQR('https://example.com/' + hash)).toThrow();
  });
  it('keeps the local custom reverse when matching a compact card to its source and skin', () => {
    const deck = demoDeck();
    deck.back = 'custom-image';
    const result = readQR(cardUrl(deck.songs[1], deck.theme, 'https://example.com/'));
    expect(result.kind === 'card' && findDeckForCard([deck], result.card)?.back).toBe(
      'custom-image',
    );
    const other = {
      ...deck,
      id: 'other',
      back: 'other-image',
      songs: deck.songs.map((s) => ({ ...s, theme: undefined })),
      theme: 'winter' as const,
    };
    expect(result.kind === 'card' && findDeckForCard([other, deck], result.card)?.back).toBe(
      'custom-image',
    );
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
