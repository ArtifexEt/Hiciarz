import { createTranslator } from './i18n';
import { jsPDF } from 'jspdf';
import { pdfFont, yieldForPDF } from './pdf';
import { bingoBoard, bingoCategories, bingoColors, bingoLevels, type BingoLevel } from './bingo';

export async function buildBingoPDF(
  level: BingoLevel,
  count: number,
  seed: string = crypto.randomUUID(),
  options: { signal?: AbortSignal; onProgress?: (completed: number) => void } = {},
) {
  const translate = createTranslator();
  const categories = bingoCategories[level].map((category) => ({ ...category }));
  const levelName = bingoLevels[level];
  if (!Number.isInteger(count) || count < 1 || count > 24)
    throw new Error(translate('bingoPdf.count'));
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('NotoSans.ttf', await pdfFont());
  options.signal?.throwIfAborted();
  doc.addFont('NotoSans.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');
  doc.setProperties({
    title: translate('bingoPdf.title'),
    subject: translate('bingoPdf.subject'),
  });
  for (let index = 0; index < count; index++) {
    options.signal?.throwIfAborted();
    if (index && index % 2 === 0) doc.addPage();
    const y = index % 2 ? 157 : 14,
      board = bingoBoard(seed + ':' + index);
    doc.setTextColor('#263d34');
    doc.setFontSize(9);
    doc.text('HICIARZ / BINGO', 14, y);
    doc.setFontSize(8);
    doc.text(translate('bingoPdf.board', { level: levelName, board: index + 1 }), 196, y, {
      align: 'right',
    });
    doc.setDrawColor('#b9c5b8');
    doc.setLineWidth(0.25);
    doc.line(14, y + 4, 196, y + 4);
    doc.setFontSize(9);
    doc.text(translate('bingoPdf.player'), 14, y + 11);
    doc.line(47, y + 12, 111, y + 12);
    const gy = y + 18;
    board.forEach((cat, cell) => {
      const x = 14 + (cell % 5) * 20,
        cy = gy + Math.floor(cell / 5) * 20,
        colors = bingoColors[cat];
      doc.setFillColor(colors.fill);
      doc.setDrawColor(colors.ink);
      doc.setLineWidth(0.18);
      doc.roundedRect(x + 0.6, cy + 0.6, 18.8, 18.8, 2, 2, 'FD');
      doc.setTextColor(colors.ink);
      doc.setFontSize(12);
      doc.text(String(cat + 1), x + 10, cy + 9, { align: 'center' });
      doc.setFontSize(5.3);
      doc.text(categories[cat].short, x + 10, cy + 15, { align: 'center' });
    });
    doc.setTextColor('#263d34');
    doc.setFontSize(8);
    doc.text(translate('bingoPdf.categories'), 123, gy + 3);
    categories.forEach((cat, i) => {
      const cy = gy + 12 + i * 11;
      doc.setFillColor(bingoColors[i].fill);
      doc.setDrawColor(bingoColors[i].ink);
      doc.roundedRect(123, cy - 4, 7, 7, 1, 1, 'FD');
      doc.setTextColor(bingoColors[i].ink);
      doc.setFontSize(8);
      doc.text(String(i + 1), 126.5, cy + 1, { align: 'center' });
      doc.setTextColor('#263d34');
      doc.setFontSize(7);
      doc.text(cat.short, 134, cy + 1);
    });
    doc.setTextColor('#526454');
    doc.setFontSize(7.5);
    doc.text(translate('bingoPdf.answer'), 123, gy + 77);
    doc.line(123, gy + 88, 196, gy + 88);
    doc.line(123, gy + 99, 196, gy + 99);
    doc.setFontSize(7);
    doc.text(translate('bingoPdf.rules'), 14, gy + 108);
    if (index % 2 === 0 && index + 1 < count) {
      doc.setDrawColor('#b9c5b8');
      doc.setLineDashPattern([2, 2], 0);
      doc.line(10, 148, 200, 148);
      doc.setLineDashPattern([], 0);
    }
    options.onProgress?.(index + 1);
    await yieldForPDF();
  }
  options.signal?.throwIfAborted();
  return doc;
}
