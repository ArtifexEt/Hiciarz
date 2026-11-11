import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createExampleDeck } from './examples';
import { buildPDF, type PDFProgress } from './pdf';

// Exercise real pagination, fonts and progress; the canvas QR renderer has browser E2E coverage.
vi.mock('./qr', async () => {
  const QRCode = await import('qrcode');
  const image = await QRCode.toDataURL('PDF test', { width: 96 });
  return { qrImage: () => image };
});
const bytes = readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url));
vi.stubGlobal('fetch', async () => new Response(bytes));
afterAll(() => vi.unstubAllGlobals());

describe('large PDF exports', () => {
  it('finishes all 151 Christmas cards on 26 duplex pages and reports monotonic progress', async () => {
    const deck = createExampleDeck('christmas-hits');
    deck.print.style = 'laser';
    const original = JSON.stringify(deck);
    const progress: PDFProgress[] = [];
    const shortened: string[] = [];
    const doc = await buildPDF(deck, deck.songs, 'https://example.com/Hiciarz/', {
      onProgress: (p) => progress.push(p),
      onTextShortened: (s) => shortened.push(s.id),
    });
    expect(doc.getNumberOfPages()).toBe(26);
    expect(shortened).toEqual([]);
    expect(progress[0]).toMatchObject({ phase: 'preparing', percent: 0 });
    expect(progress.at(-1)).toEqual({ phase: 'saving', completed: 151, total: 151, percent: 95 });
    expect(progress.some((p) => p.phase === 'backs' && p.completed === 37)).toBe(true);
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i].percent).toBeGreaterThanOrEqual(progress[i - 1].percent);
      expect(progress[i].completed).toBeGreaterThanOrEqual(progress[i - 1].completed);
    }
    expect(JSON.stringify(deck)).toBe(original);
  });
  it('can cancel between cards and start another export afterwards', async () => {
    const deck = createExampleDeck('christmas-hits');
    deck.print.style = 'laser';
    const controller = new AbortController();
    await expect(
      buildPDF(deck, deck.songs, 'https://example.com/', {
        signal: controller.signal,
        onProgress: (p) => {
          if (p.completed === 3) controller.abort();
        },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    const retry = await buildPDF(deck, deck.songs.slice(0, 1), 'https://example.com/');
    expect(retry.getNumberOfPages()).toBe(2);
  });
});
