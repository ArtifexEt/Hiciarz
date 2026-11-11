import type { jsPDF } from 'jspdf';
import { t, type TranslationParams } from './i18n';
import { frontDesign } from './front';
import { cardUrl, type Deck, type Song } from './model';
import { fitPrintText } from './print-text';
import { qrImage } from './qr';
import { themeArt, themeColors } from './themes';

type CardPaint = { fill?: string; stroke?: string; strokeWidth?: number };
export type CardElement =
  | ({
      type: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      radius?: number;
    } & CardPaint)
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      strokeWidth: number;
    }
  | ({ type: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & CardPaint)
  | ({ type: 'polygon'; points: { x: number; y: number }[] } & CardPaint)
  | { type: 'image'; src: string; x: number; y: number; width: number; height: number }
  | {
      type: 'text';
      lines: string[];
      x: number;
      /** Alphabetic baseline of the first line, in millimetres. */
      y: number;
      fontSize: number;
      lineHeightMm: number;
      charSpaceMm: number;
      align: 'left' | 'center' | 'right';
      fill: string;
    };

export type CardArtwork = { elements: CardElement[]; shortened: boolean };
type Translator = (key: string, params?: TranslationParams) => string;
const ptToMm = (size: number) => (size * 25.4) / 72;

/** One 60 × 60 mm layout, consumed by both the screen preview and PDF export. */
export function createCardArtwork(
  doc: jsPDF,
  song: Song,
  deck: Deck,
  back: boolean,
  base: string,
  translate: Translator = t,
): CardArtwork {
  const elements: CardElement[] = [];
  const text = (
    value: string,
    x: number,
    y: number,
    fontSize: number,
    fill: string,
    align: 'left' | 'center' | 'right' = 'center',
    charSpaceMm = 0,
  ) =>
    elements.push({
      type: 'text',
      lines: [value],
      x,
      y,
      fontSize,
      lineHeightMm: ptToMm(fontSize) * 1.15,
      charSpaceMm,
      align,
      fill,
    });
  const laser = deck.print.style === 'laser';
  const theme = song.theme || deck.theme;

  if (!back) {
    const design = frontDesign(song, deck);
    elements.push({ type: 'rect', x: 0, y: 0, width: 60, height: 60, fill: design.background });
    for (const shape of design.shapes) {
      const paint = { stroke: shape.color, strokeWidth: 0.2 };
      if (shape.type === 'line')
        elements.push({
          type: 'line',
          x1: shape.x,
          y1: shape.y,
          x2: shape.x2,
          y2: shape.y2,
          ...paint,
        });
      else if (shape.type === 'ellipse')
        elements.push({
          type: 'ellipse',
          cx: shape.x,
          cy: shape.y,
          rx: shape.rx,
          ry: shape.ry,
          ...paint,
        });
      else
        elements.push({
          type: 'rect',
          x: shape.inset,
          y: shape.inset,
          width: 60 - shape.inset * 2,
          height: 60 - shape.inset * 2,
          radius: shape.radius,
          ...paint,
        });
    }
    text('HICIARZ', 7, 8, 5, design.ink, 'left', 0.4);
    text(
      song.gameMode === 'movie'
        ? translate('cards.film')
        : song.gameMode === 'game'
          ? translate('cards.game')
          : String(song.year),
      30,
      22,
      song.gameMode && song.gameMode !== 'music' ? 22 : 34,
      design.ink,
    );
    const fitted = (
      value: string,
      top: number,
      height: number,
      maximum: number,
      minimum: number,
    ) => {
      const layout = fitPrintText(doc, value, 50, height, maximum, minimum);
      // Match the previous PDF's top-baseline conversion, then store the resulting
      // alphabetic baseline explicitly so SVG and PDF never infer it differently.
      const y =
        top + (height - layout.lines.length * layout.lineHeight) / 2 + ptToMm(layout.size) * 0.85;
      elements.push({
        type: 'text',
        lines: layout.lines,
        x: 30,
        y,
        fontSize: layout.size,
        lineHeightMm: layout.lineHeight,
        charSpaceMm: 0,
        align: 'center',
        fill: design.ink,
      });
      return layout.shortened;
    };
    const shortTitle = fitted(
      song.gameMode && song.gameMode !== 'music' ? song.answer || song.title : song.title,
      27,
      14,
      12,
      7,
    );
    const shortArtist = fitted(
      song.gameMode && song.gameMode !== 'music' ? song.title : song.artist,
      42,
      8.5,
      9,
      6.5,
    );
    text(song.id.slice(0, 12), 30, 54.8, 5, design.ink);
    return { elements, shortened: shortTitle || shortArtist };
  }

  const colors = themeColors[laser ? 'laser' : theme];
  elements.push({ type: 'rect', x: 0, y: 0, width: 60, height: 60, fill: '#ffffff' });
  if (laser) {
    const outline = { stroke: '#638876', strokeWidth: 0.22 };
    elements.push(
      { type: 'line', x1: 4.4, y1: 2.4, x2: 4.4, y2: 7.2, ...outline },
      { type: 'ellipse', cx: 5.8, cy: 8.4, rx: 1.7, ry: 1.1, ...outline },
      {
        type: 'polygon',
        points: [
          { x: 7.5, y: 8.4 },
          { x: 8.6, y: 7.5 },
          { x: 8.6, y: 9.3 },
        ],
        ...outline,
      },
      { type: 'line', x1: 55.6, y1: 57.6, x2: 55.6, y2: 52.8, ...outline },
      { type: 'ellipse', cx: 54.2, cy: 51.6, rx: 1.7, ry: 1.1, ...outline },
      {
        type: 'polygon',
        points: [
          { x: 52.5, y: 51.6 },
          { x: 51.4, y: 50.7 },
          { x: 51.4, y: 52.5 },
        ],
        ...outline,
      },
      {
        type: 'ellipse',
        cx: 5.1,
        cy: 8.1,
        rx: 0.15,
        ry: 0.15,
        stroke: '#b56e58',
        strokeWidth: 0.22,
      },
      {
        type: 'ellipse',
        cx: 54.9,
        cy: 51.3,
        rx: 0.15,
        ry: 0.15,
        stroke: '#b56e58',
        strokeWidth: 0.22,
      },
    );
  } else {
    elements.push({
      type: 'image',
      src: deck.back || themeArt(theme),
      x: 0,
      y: 0,
      width: 60,
      height: 60,
    });
  }
  elements.push(
    {
      type: 'rect',
      x: 2.5,
      y: 2.5,
      width: 55,
      height: 55,
      radius: 3,
      stroke: colors.accent,
      strokeWidth: 0.4,
    },
    {
      type: 'rect',
      x: 3.7,
      y: 3.7,
      width: 52.6,
      height: 52.6,
      radius: 2.3,
      stroke: colors.accent,
      strokeWidth: 0.15,
    },
    {
      type: 'rect',
      x: 18,
      y: 3,
      width: 24,
      height: 6.5,
      radius: 2,
      fill: laser ? '#ffffff' : colors.dark,
    },
  );
  text('HICIARZ', 30, 7.5, 7, laser ? '#26332e' : colors.accent, 'center', 0.8);
  elements.push(
    {
      type: 'rect',
      x: 9,
      y: 10,
      width: 42,
      height: 42,
      radius: 3,
      fill: '#ffffff',
      stroke: laser ? '#b56e58' : colors.accent,
      strokeWidth: 0.3,
    },
    {
      type: 'image',
      src: qrImage(cardUrl(song, deck.theme, base), 8),
      x: 10,
      y: 11,
      width: 40,
      height: 40,
    },
    {
      type: 'rect',
      x: 9,
      y: 52.5,
      width: 42,
      height: 4,
      radius: 1,
      fill: laser ? '#ffffff' : colors.dark,
    },
  );
  text(
    song.gameMode === 'movie'
      ? translate('cards.guessFilm')
      : song.gameMode === 'game'
        ? translate('cards.guessGame')
        : translate('cards.scanListenGuess'),
    30,
    55.2,
    4.5,
    laser ? '#26332e' : '#ffffff',
  );
  return { elements, shortened: false };
}
