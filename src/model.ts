import Papa from 'papaparse';
export const themes = ['classic', 'minimal', 'christmas', 'winter', 'fish'] as const;
export type Theme = (typeof themes)[number];
export const themeNames: Record<Theme, string> = {
  classic: 'Klasyczny',
  minimal: 'Minimalistyczny',
  christmas: 'Świąteczna noc',
  winter: 'Zimowa opowieść',
  fish: 'Rybki świąteczne',
};
export type Sources = { spotify?: string; youtube?: string };
export type Song = {
  id: string;
  title: string;
  artist: string;
  year: number;
  theme?: Theme;
  sources: Sources;
  review?: boolean;
};
export type PrintSettings = {
  style: 'theme' | 'laser';
  frontColors?: 'varied' | 'theme';
  edge: 'long' | 'short';
  offsetX: number;
  offsetY: number;
  cuts: boolean;
};
export type Deck = {
  version: 1;
  id: string;
  name: string;
  theme: Theme;
  back?: string;
  songs: Song[];
  print: PrintSettings;
};
export type Card = { v: 1; id: string; theme: Theme; sources: Sources };
const themeCodes: Record<Theme, string> = {
  classic: 'c',
  minimal: 'm',
  christmas: 'x',
  winter: 'w',
  fish: 'f',
};
export const defaultPrint: PrintSettings = {
  style: 'theme',
  frontColors: 'varied',
  edge: 'long',
  offsetX: 0,
  offsetY: 0,
  cuts: true,
};
export const newDeck = (): Deck => ({
  version: 1,
  id: crypto.randomUUID(),
  name: 'Moja nowa talia',
  theme: 'classic',
  songs: [],
  print: { ...defaultPrint },
});
export const demoDeck = (): Deck => ({
  ...newDeck(),
  name: 'Wieczór dobrych hitów',
  songs: [
    {
      id: 'demo-1',
      title: 'Dancing Queen',
      artist: 'ABBA',
      year: 1976,
      sources: { spotify: '0GjEhVFGZW8afUYGChu3Rr', youtube: 'xFrGuyw1V8s' },
    },
    {
      id: 'demo-2',
      title: 'Last Christmas',
      artist: 'Wham!',
      year: 1984,
      theme: 'fish',
      sources: { spotify: '2FRnf9qhLbvw8fu4IBXx78', youtube: 'E8gmARGvPlI' },
    },
    {
      id: 'demo-3',
      title: 'Take on Me',
      artist: 'a-ha',
      year: 1985,
      sources: { youtube: 'djV11Xbc914' },
    },
    {
      id: 'demo-4',
      title: 'September',
      artist: 'Earth, Wind & Fire',
      year: 1978,
      sources: { youtube: 'Gs069dndIYk' },
    },
    {
      id: 'demo-5',
      title: 'Nie ma fal',
      artist: 'Dawid Podsiadło',
      year: 2018,
      sources: { youtube: 'd7qNZ_QAz0Y' },
    },
  ],
});
export function spotifyId(raw: string, kind = 'track'): string {
  const s = raw.trim();
  if (/^[A-Za-z0-9]{22}$/.test(s)) return s;
  if (s.startsWith(`spotify:${kind}:`)) {
    const id = s.split(':')[2];
    if (/^[A-Za-z0-9]{22}$/.test(id)) return id;
  }
  try {
    const u = new URL(s);
    const match = u.pathname.match(new RegExp(`/(?:intl-[^/]+/)?${kind}/([A-Za-z0-9]{22})/?$`));
    if (u.protocol === 'https:' && u.hostname === 'open.spotify.com' && match) return match[1];
  } catch {}
  throw new Error(`Nieprawidłowy link Spotify (${kind === 'playlist' ? 'playlista' : 'utwór'}).`);
}
export function youtubeId(raw: string): string {
  const s = raw.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') throw 0;
    const host = u.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host))
      id =
        u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1] || '';
    if (/^[\w-]{11}$/.test(id)) return id;
  } catch {}
  throw new Error('Nieprawidłowy link YouTube.');
}
export function normalizeSources(raw: unknown): Sources {
  if (!raw || typeof raw !== 'object') return {};
  const r = raw as Record<string, unknown>;
  const out: Sources = {};
  if (typeof r.spotify === 'string' && r.spotify.trim()) out.spotify = spotifyId(r.spotify);
  if (typeof r.youtube === 'string' && r.youtube.trim()) out.youtube = youtubeId(r.youtube);
  return out;
}
export function validateSong(raw: unknown, index = 0): Song {
  if (!raw || typeof raw !== 'object')
    throw new Error(`Wiersz ${index + 1}: nieprawidłowy rekord.`);
  const r = raw as Record<string, unknown>;
  const title = String(r.title || '').trim(),
    artist = String(r.artist || '').trim(),
    year = Number(r.year);
  if (!title || !artist || title.length > 200 || artist.length > 200)
    throw new Error(`Wiersz ${index + 1}: uzupełnij tytuł i wykonawcę (maks. 200 znaków).`);
  if (!Number.isInteger(year) || year < 1000 || year > 2100)
    throw new Error(`Wiersz ${index + 1}: rok musi być liczbą od 1000 do 2100.`);
  if (r.theme !== undefined && r.theme !== '' && !themes.includes(r.theme as Theme))
    throw new Error(`Wiersz ${index + 1}: nieznany motyw.`);
  const sources = normalizeSources(r.sources || { spotify: r.spotify, youtube: r.youtube });
  if (!sources.spotify && !sources.youtube)
    throw new Error(`Wiersz ${index + 1}: dodaj źródło Spotify lub YouTube.`);
  return {
    id: typeof r.id === 'string' && r.id.length < 100 ? r.id : crypto.randomUUID(),
    title,
    artist,
    year,
    sources,
    theme: (r.theme || undefined) as Theme | undefined,
    review: r.review === true,
  };
}
export function validateDeck(raw: unknown): Deck {
  if (!raw || typeof raw !== 'object') throw new Error('Plik nie jest projektem Hiciarza.');
  const r = raw as Record<string, any>;
  if (r.version !== 1 || !Array.isArray(r.songs) || r.songs.length > 2000)
    throw new Error('Wymagany format projektu version: 1, maksymalnie 2000 utworów.');
  if (!themes.includes(r.theme)) throw new Error('Nieznany motyw talii.');
  const songs = r.songs.map(validateSong);
  if (new Set(songs.map((s) => s.id)).size !== songs.length)
    throw new Error('Identyfikatory kart muszą być unikalne.');
  if (
    r.back &&
    !(
      typeof r.back === 'string' &&
      /^data:image\/(png|jpeg|webp);base64,/.test(r.back) &&
      r.back.length < 4000000
    )
  )
    throw new Error('Nieprawidłowe tło karty.');
  const p = r.print || {};
  return {
    version: 1,
    id: typeof r.id === 'string' ? r.id : crypto.randomUUID(),
    name: String(r.name || 'Zaimportowana talia').slice(0, 100),
    theme: r.theme,
    back: r.back,
    songs,
    print: {
      style: p.style === 'laser' ? 'laser' : 'theme',
      frontColors: p.frontColors === 'theme' ? 'theme' : 'varied',
      edge: p.edge === 'short' ? 'short' : 'long',
      offsetX: Math.min(10, Math.max(-10, Number(p.offsetX) || 0)),
      offsetY: Math.min(10, Math.max(-10, Number(p.offsetY) || 0)),
      cuts: p.cuts !== false,
    },
  };
}
export function parseImport(text: string, filename: string): Deck | Song[] {
  if (filename.toLowerCase().endsWith('.csv')) {
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (s) => s.trim(),
    });
    if (result.errors.length) throw new Error(`CSV: ${result.errors[0].message}`);
    return result.data.map(validateSong);
  }
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data.map(validateSong);
  return validateDeck(data);
}
export function csvExport(songs: Song[]): string {
  return (
    '\ufeff' +
    Papa.unparse(
      songs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        year: s.year,
        theme: s.theme || '',
        spotify: s.sources.spotify || '',
        youtube: s.sources.youtube || '',
      })),
    )
  );
}
export function mergeSongs(existing: Song[], incoming: Song[], mode: 'append' | 'replace') {
  const seen = new Set<string>();
  const output: Song[] = [];
  let skipped = 0;
  for (const s of mode === 'append' ? [...existing, ...incoming] : incoming) {
    const key = s.sources.spotify
      ? `s:${s.sources.spotify}`
      : s.sources.youtube
        ? `y:${s.sources.youtube}`
        : `m:${s.title}|${s.artist}|${s.year}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    output.push({ ...s, id: output.some((x) => x.id === s.id) ? crypto.randomUUID() : s.id });
  }
  return { songs: output, skipped };
}
function decode(s: string) {
  if (s.length > 4000) throw new Error('Zbyt duży kod QR.');
  return JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
    ),
  );
}
export function cardUrl(
  song: Song,
  theme: Theme,
  base = location.origin + location.pathname,
): string {
  const sources = normalizeSources(song.sources);
  const skin = song.theme || theme;
  if (!themes.includes(skin) || (!sources.spotify && !sources.youtube))
    throw new Error('Karta wymaga poprawnego motywu i źródła odtwarzania.');
  return base.split(/[?#]/)[0] + '#2' + themeCodes[skin] + sourceKey(sources);
}
function sourceKey(sources: Sources) {
  return (
    (sources.spotify ? 's' + sources.spotify : '') + (sources.youtube ? 'y' + sources.youtube : '')
  );
}
export function findDeckForCard(decks: Deck[], card: Card) {
  return (
    decks.find((d) => d.songs.some((s) => s.id === card.id)) ||
    decks.find((d) =>
      d.songs.some(
        (s) =>
          sourceKey(s.sources) === sourceKey(card.sources) && (s.theme || d.theme) === card.theme,
      ),
    )
  );
}
export function readQR(
  raw: string,
):
  | { kind: 'card'; card: Card }
  | { kind: 'pair'; peer: string; token: string }
  | { kind: 'spotify-setup'; clientId: string } {
  let hash: string;
  try {
    hash = new URL(raw).hash.slice(1);
  } catch {
    throw new Error('To nie jest kod QR Hiciarza.');
  }
  const compact = hash.match(/^2([cmxwf])(?:s([A-Za-z0-9]{22}))?(?:y([\w-]{11}))?$/);
  if (compact && (compact[2] || compact[3])) {
    const theme = themes.find((t) => themeCodes[t] === compact[1])!;
    const sources: Sources = {};
    if (compact[2]) sources.spotify = compact[2];
    if (compact[3]) sources.youtube = compact[3];
    return {
      kind: 'card',
      card: { v: 1, id: 'q2' + compact[1] + ':' + sourceKey(sources), theme, sources },
    };
  }
  const setup = hash.match(/^spotify=([a-f0-9]{32})$/);
  if (setup) return { kind: 'spotify-setup', clientId: setup[1] };
  const q = new URLSearchParams(hash);
  if (q.has('pair')) {
    const peer = q.get('pair')!,
      token = q.get('token') || '';
    if (!/^[\w-]{1,100}$/.test(peer) || !/^[a-f0-9]{32}$/.test(token))
      throw new Error('Nieprawidłowy kod parowania.');
    return { kind: 'pair', peer, token };
  }
  if (q.has('card')) {
    const c = decode(q.get('card')!);
    if (c.v !== 1 || typeof c.id !== 'string' || c.id.length > 100 || !themes.includes(c.theme))
      throw new Error('Nieobsługiwana karta.');
    const sources = normalizeSources(c.sources);
    if (!sources.spotify && !sources.youtube)
      throw new Error('Karta nie zawiera źródła odtwarzania.');
    return { kind: 'card', card: { v: 1, id: c.id, theme: c.theme, sources } };
  }
  throw new Error('To nie jest kod QR Hiciarza.');
}
export function backPosition(index: number, edge: 'long' | 'short') {
  const col = index % 3,
    row = Math.floor(index / 3);
  return edge === 'long' ? { col: 2 - col, row } : { col, row: 3 - row };
}
export function download(content: Blob | string, name: string, type = 'application/json') {
  const url = URL.createObjectURL(
    typeof content === 'string' ? new Blob([content], { type }) : content,
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
