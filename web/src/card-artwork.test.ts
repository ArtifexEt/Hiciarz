import { readFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createCardArtwork, type CardElement } from './card-artwork';
import { createCardPreviewArtwork, centerSquareCrop, drawCardArtwork } from './pdf';
import { createExampleDeck } from './examples';
import { createTranslator, setLanguage } from './i18n';
import { demoDeck } from './model';
import { themeArt } from './themes';

vi.mock('./qr', async () => {
  const QRCode = await import('qrcode');
  const image = await QRCode.toDataURL('shared card artwork test', { width: 96 });
  return { qrImage: () => image };
});
const bytes = readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url));
vi.stubGlobal('fetch', async () => new Response(bytes));
afterAll(() => vi.unstubAllGlobals());
afterEach(() => setLanguage('pl'));

function documentWithFont() {
  const doc = new jsPDF({ unit: 'mm' });
  doc.addFileToVFS('NotoSans.ttf', bytes.toString('base64'));
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
  return doc;
}
const isText = (element: CardElement): element is Extract<CardElement, { type: 'text' }> =>
  element.type === 'text';
const isImage = (element: CardElement): element is Extract<CardElement, { type: 'image' }> =>
  element.type === 'image';
const base = 'https://example.com/Hiciarz/';

describe('shared screen and print artwork', () => {
  it('uses the same font metrics and complete long-title layout for preview and PDF', async () => {
    const deck = createExampleDeck('christmas-hits');
    const song = [...deck.songs].sort((a, b) => b.title.length - a.title.length)[0];
    const original = JSON.stringify(song);
    const doc = documentWithFont();
    const printed = createCardArtwork(doc, song, deck, false, base);
    const preview = await createCardPreviewArtwork(song, deck, false, base);
    expect(preview).toEqual(printed);
    expect(preview.shortened).toBe(false);
    const title = preview.elements.filter(isText)[2];
    expect(title.lines.join(' ')).toBe(song.title);
    expect(title.lines.length).toBeGreaterThan(2);
    expect(title.fontSize).toBeLessThan(12);
    expect(title.y).toBeGreaterThan(27);
    expect(title.y + (title.lines.length - 1) * title.lineHeightMm).toBeLessThan(41);
    doc.setFontSize(title.fontSize);
    for (const line of title.lines) expect(doc.getTextWidth(line)).toBeLessThanOrEqual(50.01);
    expect(JSON.stringify(song)).toBe(original);
  });

  it('shares the QR size, borders and opaque labels on a light custom card back', async () => {
    const deck = demoDeck();
    deck.back = 'data:image/jpeg;base64,custom-light-background';
    const artwork = await createCardPreviewArtwork(deck.songs[0], deck, true, base);
    expect(artwork).toEqual(createCardArtwork(documentWithFont(), deck.songs[0], deck, true, base));
    const [background, qr] = artwork.elements.filter(isImage);
    expect(background).toMatchObject({ src: deck.back, x: 0, y: 0, width: 60, height: 60 });
    expect(qr).toMatchObject({ x: 10, y: 11, width: 40, height: 40 });
    expect(qr.src).toMatch(/^data:image\/png;base64,/);
    const panels = artwork.elements.filter((element) => element.type === 'rect' && element.fill);
    expect(panels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 18, y: 3, width: 24, height: 6.5, fill: '#42334f' }),
        expect.objectContaining({ x: 9, y: 10, width: 42, height: 42, fill: '#ffffff' }),
        expect.objectContaining({ x: 9, y: 52.5, width: 42, height: 4, fill: '#42334f' }),
      ]),
    );
  });

  it('honors a card theme while laser output ignores artwork and custom backgrounds', () => {
    const deck = demoDeck();
    const song = deck.songs[1];
    const doc = documentWithFont();
    const themed = createCardArtwork(doc, song, deck, true, base);
    expect(themed.elements.filter(isImage)[0].src).toBe(themeArt('fish'));
    deck.back = 'data:image/jpeg;base64,custom-background';
    deck.print.style = 'laser';
    const laser = createCardArtwork(doc, song, deck, true, base);
    expect(laser.elements[0]).toMatchObject({
      type: 'rect',
      width: 60,
      height: 60,
      fill: '#ffffff',
    });
    expect(laser.elements.filter(isImage)).toHaveLength(1);
    expect(laser.elements.filter(isImage)[0].src).toMatch(/^data:image\/png;base64,/);
    expect(laser.elements.some((element) => element.type === 'polygon')).toBe(true);
    expect(createCardArtwork(doc, song, deck, false, base).elements[0]).toMatchObject({
      fill: '#ffffff',
    });
  });

  it('draws each stored alphabetic baseline without inferring a separate multiline layout', () => {
    const deck = demoDeck();
    const doc = documentWithFont();
    const artwork = createCardArtwork(doc, deck.songs[0], deck, false, base);
    const text = vi.spyOn(doc, 'text');
    drawCardArtwork(doc, artwork, 15, 28);
    const expected = artwork.elements.filter(isText).flatMap((element) =>
      element.lines.map((line, index) => [
        line,
        15 + element.x,
        28 + element.y + index * element.lineHeightMm,
        expect.objectContaining({
          baseline: 'alphabetic',
          align: element.align,
          charSpace: element.charSpaceMm,
        }),
      ]),
    );
    expect(text.mock.calls).toEqual(expected);
  });

  it('freezes card labels in the language captured for an asynchronous export', () => {
    setLanguage('pl');
    const translate = createTranslator();
    setLanguage('en');
    const deck = demoDeck();
    const song = { ...deck.songs[0], gameMode: 'game' as const, answer: 'Final Fantasy VII' };
    const artwork = createCardArtwork(documentWithFont(), song, deck, false, base, translate);
    expect(artwork.elements.filter(isText)[1].lines).toEqual(['GRA']);
    expect(artwork.elements.filter(isText)[2].lines).toEqual(['Final Fantasy VII']);
  });

  it('centers tracked back labels in millimetres instead of jsPDF point-based width alignment', () => {
    const deck = demoDeck();
    deck.print.style = 'laser';
    const doc = documentWithFont();
    const artwork = createCardArtwork(doc, deck.songs[0], deck, true, base);
    const label = artwork.elements.filter(isText)[0];
    doc.setFontSize(label.fontSize);
    const expectedX = 15 + label.x - (doc.getTextWidth('HICIARZ') + 7 * label.charSpaceMm) / 2;
    const text = vi.spyOn(doc, 'text');
    drawCardArtwork(doc, artwork, 15, 28);
    expect(text.mock.calls[0]).toEqual([
      'HICIARZ',
      expectedX,
      28 + label.y,
      expect.objectContaining({ align: 'left', charSpace: 0.8 }),
    ]);
  });

  it('uses centered square crops for imported backgrounds in either orientation', () => {
    expect(centerSquareCrop(1200, 600)).toEqual({ x: 300, y: 0, size: 600 });
    expect(centerSquareCrop(600, 1200)).toEqual({ x: 0, y: 300, size: 600 });
    expect(centerSquareCrop(600, 600)).toEqual({ x: 0, y: 0, size: 600 });
  });
});
