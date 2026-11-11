import QRCode from 'qrcode';

/** Rounded modules with intact finder patterns and a four-module quiet zone. */
export function qrImage(value: string, unit = 12): string {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const margin = 4;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = (modules.size + margin * 2) * unit;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const box = (x: number, y: number, size: number, radius: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(
      (x + margin) * unit,
      (y + margin) * unit,
      size * unit,
      size * unit,
      radius * unit,
    );
    ctx.fill();
  };
  const finders = [
    [0, 0],
    [modules.size - 7, 0],
    [0, modules.size - 7],
  ];
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)) continue;
      if (modules.get(y, x)) box(x, y, 1, 0.22, '#111111');
    }
  }
  for (const [x, y] of finders) {
    box(x, y, 7, 0.9, '#111111');
    box(x + 1, y + 1, 5, 0.55, '#ffffff');
    box(x + 2, y + 2, 3, 0.45, '#111111');
  }
  return canvas.toDataURL('image/png');
}
