import { readFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';
import { createExampleDeck } from './examples';
import { fitPrintText } from './print-text';

function documentWithFont() {
  const doc = new jsPDF({ unit: 'mm' });
  doc.addFileToVFS(
    'NotoSans.ttf',
    readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url)).toString(
      'base64',
    ),
  );
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
  return doc;
}
describe('printed song names', () => {
  it('prints every complete Christmas title and artist inside its own area', () => {
    const doc = documentWithFont();
    const deck = createExampleDeck('christmas-hits');
    for (const song of deck.songs) {
      for (const [text, height, max, min] of [
        [song.title, 14, 12, 7],
        [song.artist, 8.5, 9, 6.5],
      ] as const) {
        const result = fitPrintText(doc, text, 50, height, max, min);
        expect(result.shortened, text).toBe(false);
        expect(result.lines.join(' '), text).toBe(text);
        expect(result.lines.length * result.lineHeight).toBeLessThanOrEqual(height);
        doc.setFontSize(result.size);
        for (const line of result.lines)
          expect(doc.getTextWidth(line), text).toBeLessThanOrEqual(50.01);
      }
    }
  });
  it('bounds exceptional names without changing their full saved value', () => {
    const doc = documentWithFont();
    const title = 'W'.repeat(200);
    const result = fitPrintText(doc, title, 50, 14, 12, 7);
    expect(result.shortened).toBe(true);
    expect(result.lines.at(-1)).toMatch(/…$/);
    expect(result.size).toBe(7);
    expect(result.lines.length * result.lineHeight).toBeLessThanOrEqual(14);
    for (const line of result.lines) expect(doc.getTextWidth(line)).toBeLessThanOrEqual(50.01);
    expect(title).toHaveLength(200);
  });
});
