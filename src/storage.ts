import { get, set } from 'idb-keyval';
import { validateDeck, type Deck } from './model';
export async function loadDecks(): Promise<Deck[]> {
  const data = await get('hiciarz-decks-v1');
  if (!data) return [];
  if (!Array.isArray(data)) throw new Error('Nieprawidłowy zapis lokalny.');
  return data.map(validateDeck);
}
export async function saveDecks(decks: Deck[]) {
  await set('hiciarz-decks-v1', decks);
}
export async function imageData(file: File): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error('Wybierz PNG, JPG lub WebP do 12 MB.');
  const bitmap = await createImageBitmap(file);
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 1200;
  const ctx = c.getContext('2d')!;
  const size = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - size) / 2,
    (bitmap.height - size) / 2,
    size,
    size,
    0,
    0,
    1200,
    1200,
  );
  bitmap.close();
  return c.toDataURL('image/jpeg', 0.9);
}
