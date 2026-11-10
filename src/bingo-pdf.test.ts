import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { buildBingoPDF } from './bingo-pdf';
const font = readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url));
vi.stubGlobal('fetch', async () => new Response(font));
afterAll(() => vi.unstubAllGlobals());
describe('printable Bingo boards', () => {
  it('prints two complete boards per A4 page, including odd counts and both levels', async () => {
    for (const level of ['beginner', 'expert'] as const) {
      const doc = await buildBingoPDF(level, 3, 'stable-seed');
      expect(doc.getNumberOfPages()).toBe(2);
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 0);
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 0);
      expect(doc.output()).toContain('/Title (Hiciarz Bingo - plansze graczy)');
    }
  });
  it('bounds a print job rather than creating empty or unbounded PDFs', async () => {
    for (const n of [0, -1, 1.5, 25, NaN])
      await expect(buildBingoPDF('beginner', n)).rejects.toThrow();
  });
  it('cancels between boards and permits another print job', async () => {
    const controller = new AbortController();
    await expect(
      buildBingoPDF('expert', 24, 'cancel-test', {
        signal: controller.signal,
        onProgress: (completed) => {
          if (completed === 2) controller.abort();
        },
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    const retry = await buildBingoPDF('expert', 1);
    expect(retry.getNumberOfPages()).toBe(1);
  });
});
