import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { pdfFont } from './pdf';

afterEach(() => vi.unstubAllGlobals());

it('retries a failed preview font download and caches only the successful request', async () => {
  const bytes = readFileSync(new URL('../public/fonts/NotoSans-Regular.ttf', import.meta.url));
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response(bytes));
  vi.stubGlobal('fetch', fetch);
  await expect(pdfFont()).rejects.toThrow();
  const retried = pdfFont();
  expect(pdfFont()).toBe(retried);
  await expect(retried).resolves.toBe(bytes.toString('base64'));
  expect(fetch).toHaveBeenCalledTimes(2);
});
