import type { jsPDF } from 'jspdf';
import type { Deck, Song } from './model';
import { themeColors } from './themes';

type Shape =
  | { type: 'line'; x: number; y: number; x2: number; y2: number; color: string }
  | { type: 'ellipse'; x: number; y: number; rx: number; ry: number; color: string }
  | { type: 'frame'; inset: number; radius: number; color: string };
const colors = [
  '#eadcf3',
  '#d9eadc',
  '#f5d9c7',
  '#d6e7f4',
  '#f0d9e0',
  '#f3e7bd',
  '#d5e9e6',
  '#e2dff3',
];
const festive = [
  '#f5e5c6',
  '#d9e8da',
  '#efd6ce',
  '#d6e8e2',
  '#ede0cd',
  '#dce4ef',
  '#f2dcc9',
  '#e3dfc8',
];
const winter = [
  '#dcebf5',
  '#e3dff2',
  '#d8eae7',
  '#e8e5f5',
  '#d6e3f0',
  '#e5edf1',
  '#d7e8ed',
  '#e9e0ed',
];
const retro = [
  '#f5e6cd',
  '#dfe9dc',
  '#efdbc8',
  '#d9e7e6',
  '#f2e4d2',
  '#e6e5ce',
  '#f1dcd3',
  '#e4e7da',
];
const party = [
  '#eee4f3',
  '#dfe9ee',
  '#f3dfe7',
  '#e7e4f6',
  '#f3e7ce',
  '#d8e9e3',
  '#eddfec',
  '#e6e8f2',
];

export function frontDesign(song: Song, deck: Deck) {
  const theme = song.theme || deck.theme;
  let hash = 5381;
  for (const char of song.id) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  const variant = hash % colors.length;
  const laser = deck.print.style === 'laser';
  const palette =
    theme === 'fish' || theme === 'christmas'
      ? festive
      : theme === 'winter'
        ? winter
        : theme === 'vinyl' || theme === 'mixtape'
          ? retro
          : theme === 'memphis' || theme === 'disco'
            ? party
            : colors;
  const background = laser
    ? '#ffffff'
    : deck.print.frontColors === 'theme'
      ? themeColors[theme].light
      : palette[variant];
  const ink = laser ? '#26332e' : themeColors[theme].dark;
  const accent = laser
    ? '#638876'
    : theme === 'winter'
      ? '#6d90ad'
      : theme === 'fish' || theme === 'christmas'
        ? '#ac864f'
        : theme === 'vinyl'
          ? '#a96c3e'
          : theme === 'mixtape'
            ? '#59847d'
            : theme === 'memphis'
              ? '#7978a1'
              : theme === 'disco'
                ? '#9672ac'
                : '#8b7393';
  const secondary = laser ? '#b56e58' : accent;
  const shapes: Shape[] = [
    { type: 'frame', inset: 2.7, radius: 3.5, color: accent },
    { type: 'frame', inset: 3.8, radius: 2.7, color: accent },
    { type: 'line', x: 20, y: 10, x2: 40, y2: 10, color: accent },
    { type: 'line', x: 21, y: 51.5, x2: 39, y2: 51.5, color: secondary },
  ];
  const line = (x: number, y: number, x2: number, y2: number, color = accent) =>
    shapes.push({ type: 'line', x, y, x2, y2, color });
  const ellipse = (x: number, y: number, rx: number, ry: number, color = accent) =>
    shapes.push({ type: 'ellipse', x, y, rx, ry, color });
  for (const [cx, cy] of [
    [51, 8],
    [9, 52],
  ]) {
    if (theme === 'fish') {
      line(cx - 1, cy - 3, cx - 1, cy - 1.5);
      ellipse(cx - 0.5, cy, 2.5, 1.5);
      line(cx + 2, cy, cx + 3.5, cy - 1.4);
      line(cx + 3.5, cy - 1.4, cx + 3.5, cy + 1.4);
      line(cx + 3.5, cy + 1.4, cx + 2, cy);
      ellipse(cx - 1.8, cy - 0.3, 0.16, 0.16, secondary);
    } else if (theme === 'winter') {
      for (let a = 0; a < 3; a++) {
        const angle = (a * Math.PI) / 3;
        line(
          cx - Math.cos(angle) * 2.8,
          cy - Math.sin(angle) * 2.8,
          cx + Math.cos(angle) * 2.8,
          cy + Math.sin(angle) * 2.8,
        );
      }
      ellipse(cx, cy, 0.6, 0.6);
    } else if (theme === 'christmas') {
      line(cx - 3, cy - 2, cx + 3, cy + 2);
      for (let n = -2; n <= 2; n += 2) {
        line(cx + n, cy + n * 0.65, cx + n, cy + n * 0.65 - 2);
        line(cx + n, cy + n * 0.65, cx + n - 1.8, cy + n * 0.65 + 0.4);
      }
    } else if (theme === 'mixtape') {
      line(cx - 3, cy - 1.9, cx + 3, cy - 1.9);
      line(cx + 3, cy - 1.9, cx + 3, cy + 1.9);
      line(cx + 3, cy + 1.9, cx - 3, cy + 1.9);
      line(cx - 3, cy + 1.9, cx - 3, cy - 1.9);
      ellipse(cx - 1.4, cy, 0.7, 0.7);
      ellipse(cx + 1.4, cy, 0.7, 0.7);
    } else if (theme === 'memphis') {
      line(cx - 3, cy + 1.8, cx - 1.5, cy - 1.8);
      line(cx - 1.5, cy - 1.8, cx, cy + 1.8);
      line(cx, cy + 1.8, cx + 1.5, cy - 1.8);
      line(cx + 1.5, cy - 1.8, cx + 3, cy + 1.8);
    } else if (theme === 'disco') {
      ellipse(cx, cy, 2.6, 2.6);
      ellipse(cx, cy, 1.2, 2.6);
      line(cx - 2.6, cy, cx + 2.6, cy);
      line(cx - 2.1, cy - 1.5, cx + 2.1, cy - 1.5);
      line(cx - 2.1, cy + 1.5, cx + 2.1, cy + 1.5);
    } else if (theme === 'minimal') {
      line(cx, cy - 2.5, cx + 2.5, cy);
      line(cx + 2.5, cy, cx, cy + 2.5);
      line(cx, cy + 2.5, cx - 2.5, cy);
      line(cx - 2.5, cy, cx, cy - 2.5);
    } else {
      ellipse(cx, cy, 3, 3);
      ellipse(cx, cy, 1.8, 1.8);
      ellipse(cx, cy, 0.45, 0.45, secondary);
    }
  }
  return { background, ink, accent, shapes, variant };
}
export function frontImage(song: Song, deck: Deck) {
  const design = frontDesign(song, deck);
  const shapes = design.shapes
    .map((s) => {
      const attrs = `fill="none" stroke="${s.color}" stroke-width="0.2"`;
      if (s.type === 'line')
        return `<line x1="${s.x}" y1="${s.y}" x2="${s.x2}" y2="${s.y2}" ${attrs}/>`;
      if (s.type === 'ellipse')
        return `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.rx}" ry="${s.ry}" ${attrs}/>`;
      return `<rect x="${s.inset}" y="${s.inset}" width="${60 - s.inset * 2}" height="${60 - s.inset * 2}" rx="${s.radius}" ${attrs}/>`;
    })
    .join('');
  return (
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" fill="${design.background}"/>${shapes}</svg>`,
    )
  );
}
export function drawFront(doc: jsPDF, song: Song, deck: Deck, x: number, y: number) {
  const design = frontDesign(song, deck);
  doc.setFillColor(design.background);
  doc.rect(x, y, 60, 60, 'F');
  doc.setLineWidth(0.2);
  for (const s of design.shapes) {
    doc.setDrawColor(s.color);
    if (s.type === 'line') doc.line(x + s.x, y + s.y, x + s.x2, y + s.y2);
    else if (s.type === 'ellipse') doc.ellipse(x + s.x, y + s.y, s.rx, s.ry, 'S');
    else
      doc.roundedRect(
        x + s.inset,
        y + s.inset,
        60 - s.inset * 2,
        60 - s.inset * 2,
        s.radius,
        s.radius,
        'S',
      );
  }
  doc.setTextColor(design.ink);
}
