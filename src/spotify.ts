import { spotifyId, type Song } from './model';
const id = () => import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const redirect = () => location.origin + location.pathname;
const b64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
export const spotifyConfigured = () => Boolean(id());
export function spotifyConnected() {
  try {
    return Boolean(JSON.parse(sessionStorage.getItem('spotify-token') || 'null')?.access_token);
  } catch {
    return false;
  }
}
export function disconnectSpotify() {
  sessionStorage.removeItem('spotify-token');
  sessionStorage.removeItem('spotify-oauth');
}
export async function authorizeSpotify() {
  if (!id())
    throw new Error(
      'Import Spotify nie jest skonfigurowany dla tej strony. Możesz zaimportować JSON lub CSV.',
    );
  const verifier = b64(crypto.getRandomValues(new Uint8Array(48)).buffer),
    state = crypto.randomUUID();
  sessionStorage.setItem('spotify-oauth', JSON.stringify({ verifier, state }));
  const challenge = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({
    client_id: id(),
    response_type: 'code',
    redirect_uri: redirect(),
    scope: 'playlist-read-private playlist-read-collaborative',
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });
  location.assign('https://accounts.spotify.com/authorize?' + q);
}
export async function finishSpotify() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return false;
  const saved = JSON.parse(sessionStorage.getItem('spotify-oauth') || 'null');
  history.replaceState(null, '', redirect());
  sessionStorage.removeItem('spotify-oauth');
  if (q.has('error')) throw new Error('Logowanie Spotify zostało anulowane.');
  if (!saved || q.get('state') !== saved.state)
    throw new Error('Sesja logowania wygasła. Połącz Spotify ponownie.');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id(),
      grant_type: 'authorization_code',
      code: q.get('code')!,
      redirect_uri: redirect(),
      code_verifier: saved.verifier,
    }),
  });
  if (!r.ok) throw new Error('Nie udało się połączyć ze Spotify. Spróbuj ponownie.');
  sessionStorage.setItem(
    'spotify-token',
    JSON.stringify({ ...(await r.json()), expires: Date.now() + 3500000 }),
  );
  return true;
}
async function token() {
  let t = JSON.parse(sessionStorage.getItem('spotify-token') || 'null');
  if (!t) throw new Error('Najpierw połącz Spotify.');
  if (t.expires < Date.now()) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: t.refresh_token,
        client_id: id(),
      }),
    });
    if (!r.ok) {
      disconnectSpotify();
      throw new Error('Sesja Spotify wygasła. Zaloguj się ponownie.');
    }
    t = { ...t, ...(await r.json()), expires: Date.now() + 3500000 };
    sessionStorage.setItem('spotify-token', JSON.stringify(t));
  }
  return t.access_token;
}
async function api(url: string) {
  if (!url.startsWith('https://api.spotify.com/v1/')) throw new Error('Nieprawidłowy adres API.');
  const r = await fetch(url, {
    headers: { Authorization: 'Bearer ' + (await token()) },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      r.status === 403
        ? 'Brak dostępu do playlisty. Sprawdź uprawnienia konta i własność playlisty.'
        : r.status === 404
          ? 'Nie znaleziono playlisty lub nie jest dostępna dla tego konta.'
          : r.status === 429
            ? 'Spotify ograniczył liczbę zapytań. Spróbuj później.'
            : 'Spotify nie odpowiedział poprawnie. Spróbuj ponownie.',
    );
  return r.json();
}
export async function importPlaylist(
  raw: string,
): Promise<{ songs: Song[]; skipped: number; name: string }> {
  const listId = spotifyId(raw, 'playlist');
  const meta = await api(`https://api.spotify.com/v1/playlists/${listId}`);
  let url = `https://api.spotify.com/v1/playlists/${listId}/items?limit=50`;
  const songs: Song[] = [];
  let skipped = 0;
  const visited = new Set<string>();
  while (url) {
    if (visited.has(url) || visited.size >= 40)
      throw new Error('Playlista przekracza limit 2000 utworów.');
    visited.add(url);
    const page = await api(url);
    for (const item of page.items || []) {
      const t = item.item || item.track;
      if (!t || t.type !== 'track' || t.is_local || !t.id || !t.album?.release_date) {
        skipped++;
        continue;
      }
      const year = Number(t.album.release_date.slice(0, 4));
      if (!Number.isInteger(year)) {
        skipped++;
        continue;
      }
      songs.push({
        id: crypto.randomUUID(),
        title: t.name,
        artist: (t.artists || []).map((a: any) => a.name).join(', '),
        year,
        sources: { spotify: spotifyId(t.id) },
        review: true,
      });
    }
    url = page.next || '';
  }
  return { songs, skipped, name: meta.name || 'Playlista Spotify' };
}
