import { spotifyId, type Song } from './model';
const id = () => import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const redirect = () => location.origin + location.pathname;
async function spotifyFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Nie można połączyć się ze Spotify. Sprawdź internet i spróbuj ponownie.');
  }
}
const b64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
export const spotifyConfigured = () => Boolean(id());
export const spotifyAccountEvent = 'hiciarz-spotify-account';
export function spotifyLoginPurpose(): 'import' | 'player' | null {
  try {
    const purpose = JSON.parse(sessionStorage.getItem('spotify-oauth') || 'null')?.purpose;
    return purpose === 'import' || purpose === 'player' ? purpose : null;
  } catch {
    return null;
  }
}
function accountChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(spotifyAccountEvent));
}
export function spotifyConnected(purpose: 'import' | 'player' = 'import') {
  try {
    const t = JSON.parse(sessionStorage.getItem('spotify-token') || 'null');
    return Boolean(
      t?.access_token &&
        (t.scope || '')
          .split(' ')
          .includes(purpose === 'player' ? 'user-modify-playback-state' : 'playlist-read-private'),
    );
  } catch {
    return false;
  }
}
export function disconnectSpotify() {
  sessionStorage.removeItem('spotify-token');
  sessionStorage.removeItem('spotify-oauth');
  accountChanged();
}
export async function authorizeSpotify(purpose: 'import' | 'player' = 'import') {
  if (!id()) throw new Error('Połączenie Spotify nie jest skonfigurowane dla tej strony.');
  const verifier = b64(crypto.getRandomValues(new Uint8Array(48)).buffer),
    state = crypto.randomUUID();
  sessionStorage.setItem('spotify-oauth', JSON.stringify({ verifier, state, purpose }));
  const existing = JSON.parse(sessionStorage.getItem('spotify-token') || 'null');
  const required =
    'user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-read-private';
  const scope = [
    ...new Set([...required.split(' '), ...(existing?.scope || '').split(' ').filter(Boolean)]),
  ].join(' ');
  const challenge = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const q = new URLSearchParams({
    client_id: id(),
    response_type: 'code',
    redirect_uri: redirect(),
    scope,
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
  const r = await spotifyFetch('https://accounts.spotify.com/api/token', {
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
  accountChanged();
  return saved.purpose === 'player' ? ('player' as const) : ('import' as const);
}
async function token() {
  let t = JSON.parse(sessionStorage.getItem('spotify-token') || 'null');
  if (!t) throw new Error('Najpierw połącz Spotify.');
  if (t.expires < Date.now()) {
    const r = await spotifyFetch('https://accounts.spotify.com/api/token', {
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
  const r = await spotifyFetch(url, {
    headers: { Authorization: 'Bearer ' + (await token()) },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      r.status === 403
        ? 'Spotify odmówił dostępu. Ta integracja pobiera utwory tylko z Twoich własnych lub współtworzonych playlist. Inne publiczne playlisty nie są dostępne. Jeśli to Twoja playlista, połącz konto ponownie i sprawdź jego dostęp do integracji.'
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

export type SpotifyDevice = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  is_restricted: boolean;
};
export async function spotifyProfile(): Promise<{ name: string; avatar?: string }> {
  const profile = await playerRequest('me');
  const avatar = profile?.images?.find(
    (image: { url?: string }) => typeof image.url === 'string' && image.url.startsWith('https://'),
  )?.url;
  return { name: profile?.display_name || 'Konto Spotify', avatar };
}
async function playerRequest(path: string, method = 'GET', body?: unknown): Promise<any> {
  const response = await spotifyFetch('https://api.spotify.com/v1/' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + (await token()),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 204) return null;
  let data: any = null;
  try {
    data = await response.json();
  } catch {}
  if (!response.ok) {
    if (response.status === 401) {
      disconnectSpotify();
      throw new Error('Sesja Spotify wygasła. Połącz konto ponownie.');
    }
    if (response.status === 403)
      throw new Error(
        path === 'me/player/devices' || path === 'me'
          ? 'Spotify odmówił dostępu do urządzeń (403). To nie jest pusta lista. Sprawdź, czy zalogowane konto ma dostęp w Users Management aplikacji Spotify, i połącz je ponownie.'
          : 'Spotify odmówił sterowania (403). Sprawdź Premium i dostęp konta w Users Management aplikacji Spotify.',
      );
    if (response.status === 404 && path.startsWith('me/player'))
      throw new Error(
        'Urządzenie nie jest aktywne. Otwórz Spotify, uruchom utwór i odśwież listę urządzeń.',
      );
    if (response.status === 429)
      throw new Error('Spotify ograniczył zapytania. Odczekaj chwilę i spróbuj ponownie.');
    if (response.status === 404 && path.startsWith('tracks/'))
      throw new Error(
        'Nie znaleziono utworu. Wybierz inne nagranie w kreatorze i wydrukuj kartę ponownie.',
      );
    throw new Error(
      'Nie udało się wykonać polecenia Spotify. Sprawdź połączenie i spróbuj ponownie.',
    );
  }
  return data;
}
export async function spotifyDevices(): Promise<SpotifyDevice[]> {
  const d = await playerRequest('me/player/devices');
  return (d?.devices || []).filter((x: SpotifyDevice) => Boolean(x.id) && !x.is_restricted);
}
export async function playSpotifyTrack(track: string, device: string) {
  if (!device) throw new Error('Wybierz urządzenie Spotify.');
  const valid = spotifyId(track);
  const info = await playerRequest('tracks/' + valid);
  if (info?.is_playable === false || info?.restrictions?.reason === 'market')
    throw new Error(
      'Utwór jest niedostępny dla tego konta lub regionu. Popraw źródło w kreatorze i wydrukuj kartę ponownie.',
    );
  await playerRequest('me/player/play?device_id=' + encodeURIComponent(device), 'PUT', {
    uris: ['spotify:track:' + valid],
    position_ms: 0,
  });
}
export async function spotifyPlaybackCommand(command: 'pause' | 'resume' | 'stop', device: string) {
  if (!device) throw new Error('Wybierz urządzenie Spotify.');
  await playerRequest(
    'me/player/' +
      (command === 'resume' ? 'play' : 'pause') +
      '?device_id=' +
      encodeURIComponent(device),
    'PUT',
  );
}
