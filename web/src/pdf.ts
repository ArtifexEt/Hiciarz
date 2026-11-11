import { t as translate, createTranslator } from './i18n';
import { jsPDF } from 'jspdf';
import { createCardArtwork, type CardArtwork } from './card-artwork';
import { type Deck, type Song, backPosition } from './model';
import { asset, themeArt } from './themes';
let fontPromise: Promise<string> | undefined;
export function pdfFont() {
  return (fontPromise ??= fetch(asset('fonts/NotoSans-Regular.ttf'))
    .then((r) => {
      if (!r.ok) throw new Error(translate('pdf.fontFailed'));
      return r.arrayBuffer();
    })
    .then((b) => {
      let s = '';
      for (const n of new Uint8Array(b)) s += String.fromCharCode(n);
      return btoa(s);
    })
    .catch((error) => {
      fontPromise = undefined;
      throw error;
    }));
}
export function centerSquareCrop(width: number, height: number) {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}
async function raster(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 900;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 900, 900);
      const crop = centerSquareCrop(image.naturalWidth, image.naturalHeight);
      // A viewBox-only SVG can report a default intrinsic size (150px) while
      // Canvas interprets a source rectangle in its original viewBox units.
      // Square artwork needs no source crop, so let the browser scale it whole.
      if (!crop.x && !crop.y) ctx.drawImage(image, 0, 0, 900, 900);
      else ctx.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, 900, 900);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    image.onerror = () => reject(new Error(translate('pdf.backgroundFailed')));
    image.src = url;
  });
}
async function artworkDocument() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans.ttf', await pdfFont());
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
  return doc;
}

export async function createCardPreviewArtwork(
  song: Song,
  deck: Deck,
  back: boolean,
  base: string,
): Promise<CardArtwork> {
  const translate = createTranslator();
  const doc = await artworkDocument();
  return createCardArtwork(doc, song, deck, back, base, translate);
}

/** Draw the exact layout used by the SVG preview at a sheet's card origin. */
export function drawCardArtwork(
  doc: jsPDF,
  artwork: CardArtwork,
  x: number,
  y: number,
  images: ReadonlyMap<string, string> = new Map(),
) {
  for (const element of artwork.elements) {
    if (element.type === 'text') {
      doc.setFontSize(element.fontSize);
      doc.setTextColor(element.fill);
      for (const [index, line] of element.lines.entries()) {
        let textX = x + element.x;
        let align = element.align;
        if (element.charSpaceMm && align !== 'left') {
          // jsPDF measures charSpace as points when aligning, but draws it in
          // document units. Resolve tracked text here in millimetres, as SVG does.
          const width = doc.getTextWidth(line) + Array.from(line).length * element.charSpaceMm;
          textX -= align === 'center' ? width / 2 : width;
          align = 'left';
        }
        doc.text(line, textX, y + element.y + index * element.lineHeightMm, {
          align,
          baseline: 'alphabetic',
          charSpace: element.charSpaceMm,
        });
      }
      continue;
    }
    if (element.type === 'image') {
      const image = images.get(element.src);
      doc.addImage(
        image || element.src,
        image ? 'JPEG' : 'PNG',
        x + element.x,
        y + element.y,
        element.width,
        element.height,
        undefined,
        'FAST',
      );
      continue;
    }
    if (element.stroke) {
      doc.setDrawColor(element.stroke);
      doc.setLineWidth(element.strokeWidth || 0.2);
    }
    if (element.type === 'line') {
      doc.line(x + element.x1, y + element.y1, x + element.x2, y + element.y2);
      continue;
    }
    if (element.fill) doc.setFillColor(element.fill);
    const style = element.fill ? (element.stroke ? 'FD' : 'F') : 'S';
    if (element.type === 'rect') {
      if (element.radius)
        doc.roundedRect(
          x + element.x,
          y + element.y,
          element.width,
          element.height,
          element.radius,
          element.radius,
          style,
        );
      else doc.rect(x + element.x, y + element.y, element.width, element.height, style);
    } else if (element.type === 'ellipse') {
      doc.ellipse(x + element.cx, y + element.cy, element.rx, element.ry, style);
    } else {
      const first = element.points[0];
      const segments = element.points
        .slice(1)
        .map((point, index) => [
          point.x - element.points[index].x,
          point.y - element.points[index].y,
        ]);
      doc.lines(segments, x + first.x, y + first.y, [1, 1], style, true);
    }
  }
}
export type PDFProgress = {
  phase: 'preparing' | 'fronts' | 'backs' | 'saving';
  completed: number;
  total: number;
  percent: number;
};
type PDFOptions = {
  onProgress?: (progress: PDFProgress) => void;
  onTextShortened?: (song: Song) => void;
  signal?: AbortSignal;
};
export const yieldForPDF = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function cuts(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor('#a0a0a0');
  doc.setLineWidth(0.15);
  for (const dx of [0, 60])
    for (const dy of [0, 60]) {
      doc.line(x + dx - 2, y + dy, x + dx + 2, y + dy);
      doc.line(x + dx, y + dy - 2, x + dx, y + dy + 2);
    }
}
export async function buildPDF(
  deck: Deck,
  songs: Song[],
  base: string,
  options: PDFOptions = {},
): Promise<jsPDF> {
  const translate = createTranslator();
  if (!songs.length) throw new Error(translate('pdf.chooseCards'));
  const checkAbort = () => options.signal?.throwIfAborted();
  const report = (phase: PDFProgress['phase'], completed: number, sides: number) =>
    options.onProgress?.({
      phase,
      completed,
      total: songs.length,
      percent: 5 + Math.floor((sides / (songs.length * 2)) * 90),
    });
  checkAbort();
  options.onProgress?.({ phase: 'preparing', completed: 0, total: songs.length, percent: 0 });
  await yieldForPDF();
  const doc = await artworkDocument();
  checkAbort();
  const arts = new Map<string, string>();
  const laser = deck.print.style === 'laser';
  for (const s of laser ? [] : songs) {
    checkAbort();
    const url = deck.back || themeArt(s.theme || deck.theme);
    if (!arts.has(url)) arts.set(url, await raster(url));
  }
  for (let start = 0; start < songs.length; start += 12) {
    if (start) doc.addPage();
    const sheet = songs.slice(start, start + 12);
    doc.setFontSize(8);
    doc.setTextColor('#777777');
    doc.text(
      translate('pdf.frontSheet', { name: deck.name, sheet: Math.floor(start / 12) + 1 }),
      15,
      15,
    );
    for (let i = 0; i < sheet.length; i++) {
      checkAbort();
      const s = sheet[i],
        x = 15 + (i % 3) * 60,
        y = 28 + Math.floor(i / 3) * 60;
      const artwork = createCardArtwork(doc, s, deck, false, base, translate);
      drawCardArtwork(doc, artwork, x, y, arts);
      if (artwork.shortened) options.onTextShortened?.(s);
      if (deck.print.cuts) cuts(doc, x, y);
      report('fronts', start, start * 2 + i + 1);
      await yieldForPDF();
    }
    doc.addPage();
    doc.setFontSize(8);
    doc.setTextColor('#777777');
    doc.text(
      translate('pdf.backSheet', {
        name: deck.name,
        edge: translate('pdf.edge.' + deck.print.edge),
      }),
      15,
      15,
    );
    for (let i = 0; i < sheet.length; i++) {
      checkAbort();
      const s = sheet[i],
        pos = backPosition(i, deck.print.edge),
        x = 15 + pos.col * 60 + deck.print.offsetX,
        y = 28 + pos.row * 60 + deck.print.offsetY;
      drawCardArtwork(doc, createCardArtwork(doc, s, deck, true, base, translate), x, y, arts);
      if (deck.print.cuts) cuts(doc, x, y);
      report('backs', start + i + 1, start * 2 + sheet.length + i + 1);
      await yieldForPDF();
    }
  }
  checkAbort();
  report('saving', songs.length, songs.length * 2);
  return doc;
}
export async function calibrationPDF(edge: 'long' | 'short') {
  const translate = createTranslator();
  const d = new jsPDF({ unit: 'mm', format: 'a4' });
  d.setFontSize(12);
  d.text(translate('pdf.calibrationHeading'), 15, 15);
  for (let i = 0; i < 12; i++) {
    const x = 15 + (i % 3) * 60,
      y = 28 + Math.floor(i / 3) * 60;
    cuts(d, x, y);
    d.setFontSize(25);
    d.text(String(i + 1), x + 30, y + 33, { align: 'center' });
    d.circle(x + 8, y + 8, 3);
  }
  d.addPage();
  d.setFontSize(12);
  d.text(translate('pdf.calibrationBack', { edge: translate('pdf.edge.' + edge) }), 15, 15);
  for (let i = 0; i < 12; i++) {
    const p = backPosition(i, edge),
      x = 15 + p.col * 60,
      y = 28 + p.row * 60;
    cuts(d, x, y);
    d.setFontSize(25);
    d.text(String(i + 1), x + 30, y + 33, { align: 'center' });
    d.circle(x + (edge === 'long' ? 52 : 8), y + (edge === 'short' ? 52 : 8), 3);
  }
  d.save('hiciarz-kalibracja.pdf');
}
