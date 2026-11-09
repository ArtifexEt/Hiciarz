import type { jsPDF } from 'jspdf';

/** Fit a full name into its printed area before shortening only the printed label. */
export function fitPrintText(
  doc: jsPDF,
  value: string,
  width: number,
  height: number,
  maximum: number,
  minimum: number,
) {
  const text = value.replace(/\s+/gu, ' ').trim();
  const lineFactor = 1.15;
  for (let size = maximum; size >= minimum; size -= 0.25) {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width) as string[];
    const lineHeight = (size * 25.4 * lineFactor) / 72;
    const count = Math.max(1, Math.floor(height / lineHeight));
    if (lines.length <= count) return { lines, size, lineHeight, shortened: false };
    if (size === minimum) {
      const visible = lines.slice(0, count);
      const last = Array.from(visible.at(-1)!.trimEnd());
      while (last.length && doc.getTextWidth(last.join('') + '…') > width) last.pop();
      visible[visible.length - 1] = last.join('').trimEnd() + '…';
      return { lines: visible, size, lineHeight, shortened: true };
    }
  }
  throw new Error('Nie udało się dopasować tekstu do karty.');
}
