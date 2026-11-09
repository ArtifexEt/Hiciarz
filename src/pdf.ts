import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
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
function textFit(doc: jsPDF, text: string, x: number, y: number, width: number, max = 13, min = 7) {
  let size = max;
  let lines: string[] = [];
  do {
    doc.setFontSize(size);
    lines = doc.splitTextToSize(text, width);
    if (lines.length <= 2) break;
    size -= 0.5;
  } while (size >= min);
  if (lines.length > 2)
    throw new Error('Tekst na karcie jest zbyt długi do wydruku. Skróć tytuł lub wykonawcę.');
  doc.text(lines, x, y, { align: 'center', lineHeightFactor: 1.2 });
}
function cuts(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor('#a0a0a0');
  doc.setLineWidth(0.15);
  for (const dx of [0, 60])
    for (const dy of [0, 60]) {
      doc.line(x + dx - 2, y + dy, x + dx + 2, y + dy);
      doc.line(x + dx, y + dy - 2, x + dx, y + dy + 2);
    }
}
export async function buildPDF(deck: Deck, songs: Song[], base: string): Promise<jsPDF> {
  if (!songs.length) throw new Error('Wybierz co najmniej jedną kartę.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans.ttf', await font());
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
  const arts = new Map<string, string>();
  const laser = deck.print.style === 'laser';
  for (const s of laser ? [] : songs) {
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
      const s = sheet[i],
        x = 15 + (i % 3) * 60,
        y = 28 + Math.floor(i / 3) * 60,
        c = themeColors[laser ? 'laser' : s.theme || deck.theme];
      doc.setFillColor(c.light);
      doc.rect(x, y, 60, 60, 'F');
      doc.setTextColor(c.dark);
      if (laser) {
        doc.setDrawColor('#638876');
        doc.setLineWidth(0.25);
        doc.line(x + 5, y + 5, x + 15, y + 5);
        doc.setDrawColor('#b56e58');
        doc.line(x + 45, y + 55, x + 55, y + 55);
      }
      doc.setFontSize(34);
      doc.text(String(s.year), x + 30, y + 22, { align: 'center' });
      textFit(doc, s.title, x + 30, y + 34, 50, 12);
      textFit(doc, s.artist, x + 30, y + 47, 50, 9);
      doc.setFontSize(5);
      doc.text(s.id.slice(0, 12), x + 30, y + 56, { align: 'center' });
      if (deck.print.cuts) cuts(doc, x, y);
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
      const s = sheet[i],
        pos = backPosition(i, deck.print.edge),
        x = 15 + pos.col * 60 + deck.print.offsetX,
        y = 28 + pos.row * 60 + deck.print.offsetY;
      if (laser) {
        doc.setDrawColor('#638876');
        doc.setLineWidth(0.22);
        doc.line(x + 2, y + 14, x + 2, y + 2);
        doc.line(x + 2, y + 2, x + 17, y + 2);
        doc.line(x + 43, y + 58, x + 58, y + 58);
        doc.line(x + 58, y + 58, x + 58, y + 46);
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
      doc.setFillColor('#ffffff');
      doc.roundedRect(x + 11, y + 11, 38, 38, 2, 2, 'F');
      const qr = await QRCode.toDataURL(cardUrl(s, deck.theme, base), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 600,
      });
      doc.addImage(qr, 'PNG', x + 12, y + 12, 36, 36);
      doc.setTextColor(laser ? '#26332e' : '#ffffff');
      doc.setFontSize(7);
      doc.text('HICIARZ', x + 30, y + 55, { align: 'center' });
      if (deck.print.cuts) cuts(doc, x, y);
    }
  }
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
