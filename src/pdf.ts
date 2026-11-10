import { jsPDF } from 'jspdf';
import { qrImage } from './qr';
import { drawFront } from './front';
import { fitPrintText } from './print-text';
import { type Deck, type Song, backPosition, cardUrl } from './model';
import { asset, themeArt, themeColors } from './themes';
let fontPromise: Promise<string> | undefined;
function font() {
  return (fontPromise ??= fetch(asset('fonts/NotoSans-Regular.ttf'))
    .then((r) => {
      if (!r.ok) throw new Error('Nie udało się wczytać czcionki PDF.');
      return r.arrayBuffer();
    })
    .then((b) => {
      let s = '';
      for (const n of new Uint8Array(b)) s += String.fromCharCode(n);
      return btoa(s);
    }));
}
async function raster(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 900;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(image, 0, 0, 900, 900);
      resolve(c.toDataURL('image/jpeg', 0.92));
    };
    image.onerror = () => reject(new Error('Nie udało się wczytać tła kart.'));
    image.src = url;
  });
}
function textFit(
  doc: jsPDF,
  text: string,
  x: number,
  top: number,
  height: number,
  max: number,
  min: number,
) {
  const layout = fitPrintText(doc, text, 50, height, max, min);
  doc.setFontSize(layout.size);
  doc.text(layout.lines, x, top + (height - layout.lines.length * layout.lineHeight) / 2, {
    align: 'center',
    baseline: 'top',
    lineHeightFactor: 1.15,
  });
  return layout.shortened;
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
  if (!songs.length) throw new Error('Wybierz co najmniej jedną kartę.');
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
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans.ttf', await font());
  checkAbort();
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
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
    doc.text(`${deck.name} / odpowiedzi / arkusz ${Math.floor(start / 12) + 1}`, 15, 15);
    for (let i = 0; i < sheet.length; i++) {
      checkAbort();
      const s = sheet[i],
        x = 15 + (i % 3) * 60,
        y = 28 + Math.floor(i / 3) * 60;
      drawFront(doc, s, deck, x, y);
      doc.setFontSize(5);
      doc.text('HICIARZ', x + 7, y + 8, { charSpace: 0.4 });
      doc.setFontSize(s.gameMode && s.gameMode !== 'music' ? 22 : 34);
      doc.text(
        s.gameMode === 'movie' ? 'FILM' : s.gameMode === 'game' ? 'GRA' : String(s.year),
        x + 30,
        y + 22,
        { align: 'center' },
      );
      const shortTitle = textFit(
        doc,
        s.gameMode && s.gameMode !== 'music' ? s.answer || s.title : s.title,
        x + 30,
        y + 27,
        14,
        12,
        7,
      );
      const shortArtist = textFit(
        doc,
        s.gameMode && s.gameMode !== 'music' ? s.title : s.artist,
        x + 30,
        y + 42,
        8.5,
        9,
        6.5,
      );
      if (shortTitle || shortArtist) options.onTextShortened?.(s);
      doc.setFontSize(5);
      doc.text(s.id.slice(0, 12), x + 30, y + 54.8, { align: 'center' });
      if (deck.print.cuts) cuts(doc, x, y);
      report('fronts', start, start * 2 + i + 1);
      await yieldForPDF();
    }
    doc.addPage();
    doc.setFontSize(8);
    doc.setTextColor('#777777');
    doc.text(
      `${deck.name} / QR / ${deck.print.edge === 'long' ? 'długa' : 'krótka'} krawędź / druk 100%`,
      15,
      15,
    );
    for (let i = 0; i < sheet.length; i++) {
      checkAbort();
      const s = sheet[i],
        pos = backPosition(i, deck.print.edge),
        x = 15 + pos.col * 60 + deck.print.offsetX,
        y = 28 + pos.row * 60 + deck.print.offsetY;
      if (laser) {
        doc.setDrawColor('#638876');
        doc.setLineWidth(0.22);
        doc.line(x + 4.4, y + 2.4, x + 4.4, y + 7.2);
        doc.ellipse(x + 5.8, y + 8.4, 1.7, 1.1, 'S');
        doc.triangle(x + 7.5, y + 8.4, x + 8.6, y + 7.5, x + 8.6, y + 9.3, 'S');
        doc.line(x + 55.6, y + 57.6, x + 55.6, y + 52.8);
        doc.ellipse(x + 54.2, y + 51.6, 1.7, 1.1, 'S');
        doc.triangle(x + 52.5, y + 51.6, x + 51.4, y + 50.7, x + 51.4, y + 52.5, 'S');
        doc.setDrawColor('#b56e58');
        doc.circle(x + 5.1, y + 8.1, 0.15, 'S');
        doc.circle(x + 54.9, y + 51.3, 0.15, 'S');
      } else
        doc.addImage(arts.get(deck.back || themeArt(s.theme || deck.theme))!, 'JPEG', x, y, 60, 60);
      const colors = themeColors[laser ? 'laser' : s.theme || deck.theme];
      doc.setDrawColor(laser ? '#638876' : colors.accent);
      doc.setLineWidth(0.4);
      doc.roundedRect(x + 2.5, y + 2.5, 55, 55, 3, 3, 'S');
      doc.setLineWidth(0.15);
      doc.roundedRect(x + 3.7, y + 3.7, 52.6, 52.6, 2.3, 2.3, 'S');
      doc.setFillColor(laser ? '#ffffff' : colors.dark);
      doc.roundedRect(x + 18, y + 3, 24, 6.5, 2, 2, 'F');
      doc.setTextColor(laser ? '#26332e' : colors.accent);
      doc.setFontSize(7);
      doc.text('HICIARZ', x + 30, y + 7.5, { align: 'center', charSpace: 0.8 });
      doc.setFillColor('#ffffff');
      doc.roundedRect(x + 9, y + 10, 42, 42, 3, 3, 'F');
      doc.setDrawColor(laser ? '#b56e58' : colors.accent);
      doc.setLineWidth(0.3);
      doc.roundedRect(x + 9, y + 10, 42, 42, 3, 3, 'S');
      const qr = qrImage(cardUrl(s, deck.theme, base), 8);
      doc.addImage(qr, 'PNG', x + 10, y + 11, 40, 40, undefined, 'FAST');
      doc.setFillColor(laser ? '#ffffff' : colors.dark);
      doc.roundedRect(x + 9, y + 52.5, 42, 4, 1, 1, 'F');
      doc.setTextColor(laser ? '#26332e' : '#ffffff');
      doc.setFontSize(4.5);
      doc.text(
        s.gameMode === 'movie'
          ? 'ZGADNIJ FILM'
          : s.gameMode === 'game'
            ? 'ZGADNIJ GRĘ'
            : 'ZESKANUJ · POSŁUCHAJ · ZGADNIJ',
        x + 30,
        y + 55.2,
        { align: 'center' },
      );
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
  const d = new jsPDF({ unit: 'mm', format: 'a4' });
  d.setFontSize(12);
  d.text('HICIARZ / A4 / 100% / duplex calibration', 15, 15);
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
  d.text(`HICIARZ / ${edge} edge / back`, 15, 15);
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
