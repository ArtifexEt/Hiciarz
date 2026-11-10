export type BingoLevel = 'beginner' | 'expert';
export const bingoLevels = { beginner: 'Na dobry początek', expert: 'Dla znawców' };
export const bingoCategories = {
  beginner: [
    {
      name: 'Zespół czy solista?',
      short: 'Zespół / solo',
      hint: 'Czy słyszycie solistę, czy zespół? Duety i gościnne występy liczymy jako zespół.',
    },
    {
      name: 'Przed rokiem 2000?',
      short: 'Przed 2000',
      hint: 'Tak: do 1999 włącznie. Nie: od 2000 roku.',
    },
    {
      name: 'Rok z dokładnością ±4',
      short: 'Rok ±4',
      hint: 'Podaj rok wydania. Pomyłka o najwyżej 4 lata daje punkt.',
    },
    {
      name: 'Z jakiej dekady?',
      short: 'Dekada',
      hint: 'Zgadnij dekadę, np. lata 80. albo lata 2000.',
    },
    {
      name: 'Rok z dokładnością ±2',
      short: 'Rok ±2',
      hint: 'Podaj rok wydania. Pomyłka o najwyżej 2 lata daje punkt.',
    },
  ],
  expert: [
    {
      name: 'Jaki to tytuł?',
      short: 'Tytuł',
      hint: 'Podaj tytuł piosenki. Przy drobnej pomyłce zdecydujcie wspólnie, czy uznajecie odpowiedź.',
    },
    {
      name: 'Dokładny rok',
      short: 'Dokładny rok',
      hint: 'Tym razem potrzebny jest dokładny rok wydania.',
    },
    {
      name: 'Kto to wykonuje?',
      short: 'Wykonawca',
      hint: 'Podaj wykonawcę. Przy współpracy wystarczy główny artysta.',
    },
    {
      name: 'Z jakiej dekady?',
      short: 'Dekada',
      hint: 'Zgadnij dekadę, np. lata 80. albo lata 2000.',
    },
    {
      name: 'Rok z dokładnością ±3',
      short: 'Rok ±3',
      hint: 'Podaj rok wydania. Pomyłka o najwyżej 3 lata daje punkt.',
    },
  ],
} as const;
export const bingoColors = [
  { fill: '#e0ebdf', ink: '#31583d' },
  { fill: '#f5e5c2', ink: '#745521' },
  { fill: '#dce8f4', ink: '#355875' },
  { fill: '#eedfee', ink: '#714570' },
  { fill: '#f4ddd2', ink: '#804d39' },
];
export function randomBingoCategory(
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new Error('Nie udało się wylosować kategorii. Spróbuj ponownie.');
  return Math.floor(value * 5);
}
/** Each paper board has five cells of each category, in a reproducible shuffled layout. */
export function bingoBoard(seed: string): number[] {
  let state = 2166136261;
  for (const c of seed) state = Math.imul(state ^ c.charCodeAt(0), 16777619) >>> 0;
  const cells = Array.from({ length: 25 }, (_, i) => i % 5);
  for (let i = 24; i > 0; i--) {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    const j = Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}
