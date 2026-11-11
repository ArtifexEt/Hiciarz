import { t as translate } from './i18n';
import { spotifyId, type Song } from './model';
import {
  spotifyClientId as id,
  spotifyRedirectUri as redirect,
  spotifyAccountEvent,
  needsSpotifySetup,
  openSpotifySetup,
  type SpotifyPurpose,
} from './spotify-settings';
export { spotifyAccountEvent } from './spotify-settings';
async function spotifyFetch(url: string, options: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(translate('spotify.network'));
  }
}
const b64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
export const spotifyConfigured = () => Boolean(id());
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
        (!t.client_id || t.client_id === id()) &&
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
export async function beginSpotifyLogin(purpose: SpotifyPurpose = 'import') {
  if (needsSpotifySetup()) {
    openSpotifySetup(purpose);
    return false;
  }
  await authorizeSpotify(purpose);
  return true;
}
export async function authorizeSpotify(purpose: 'import' | 'player' = 'import') {
  const clientId = id(),
    redirectUri = redirect();
  if (!clientId) throw new Error(translate('spotify.missingClientId'));
  const verifier = b64(crypto.getRandomValues(new Uint8Array(48)).buffer),
    state = crypto.randomUUID();
  sessionStorage.setItem(
    'spotify-oauth',
    JSON.stringify({ verifier, state, purpose, clientId, redirectUri }),
  );
  const existing = JSON.parse(sessionStorage.getItem('spotify-token') || 'null');
  const required =
    'user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-read-private';
  const scope = [
    ...new Set([...required.split(' '), ...(existing?.scope || '').split(' ').filter(Boolean)]),
  ].join(' ');
  const challenge = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  if (clientId !== id()) throw new Error(translate('spotify.changedLogin'));
  const q = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
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
  if (q.has('error')) throw new Error(translate('spotify.cancelledLogin'));
  if (!saved || q.get('state') !== saved.state) throw new Error(translate('spotify.expiredLogin'));
  const clientId = saved.clientId || id();
  if (clientId !== id()) throw new Error(translate('spotify.changedClientDuringLogin'));
  const r = await spotifyFetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: q.get('code')!,
      redirect_uri: saved.redirectUri || redirect(),
      code_verifier: saved.verifier,
    }),
  });
  if (!r.ok) throw new Error(translate('spotify.loginFailed'));
  const granted = await r.json();
  if (clientId !== id()) throw new Error(translate('spotify.changedConnection'));
  sessionStorage.setItem(
    'spotify-token',
    JSON.stringify({ ...granted, client_id: clientId, expires: Date.now() + 3500000 }),
  );
  accountChanged();
  return saved.purpose === 'player' ? ('player' as const) : ('import' as const);
}
async function token() {
  const clientId = id();
  let t = JSON.parse(sessionStorage.getItem('spotify-token') || 'null');
  if (!t) throw new Error(translate('spotify.connectFirst'));
  if (t.client_id && t.client_id !== clientId) {
    disconnectSpotify();
    throw new Error(translate('spotify.changedClient'));
  }
  if (t.expires < Date.now()) {
    const r = await spotifyFetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: t.refresh_token,
        client_id: clientId,
      }),
    });
    if (clientId !== id()) throw new Error(translate('spotify.changedConnection'));
    if (!r.ok) {
      disconnectSpotify();
      throw new Error(translate('spotify.sessionExpired'));
    }
    const refreshed = await r.json();
    if (clientId !== id()) throw new Error(translate('spotify.changedConnection'));
    t = { ...t, ...refreshed, client_id: clientId, expires: Date.now() + 3500000 };
    sessionStorage.setItem('spotify-token', JSON.stringify(t));
  }
  return t.access_token;
}
async function api(url: string) {
  if (!url.startsWith('https://api.spotify.com/v1/'))
    throw new Error(translate('spotify.invalidApi'));
  const r = await spotifyFetch(url, {
    headers: { Authorization: 'Bearer ' + (await token()) },
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new Error(
      r.status === 403
        ? translate('spotify.playlistForbidden')
        : r.status === 404
          ? translate('spotify.playlistNotFound')
          : r.status === 429
            ? translate('spotify.importRateLimit')
            : translate('spotify.invalidResponse'),
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
    if (visited.has(url) || visited.size >= 40) throw new Error(translate('spotify.playlistLimit'));
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
  return { songs, skipped, name: meta.name || translate('spotify.playlist') };
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
  return { name: profile?.display_name || translate('spotify.account'), avatar };
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
      throw new Error(translate('spotify.reconnectExpired'));
    }
    if (response.status === 403)
      throw new Error(
        path === 'me/player/devices' || path === 'me'
          ? translate('spotify.devicesForbidden')
          : translate('spotify.controlsForbidden'),
      );
    if (response.status === 404 && path.startsWith('me/player'))
      throw new Error(translate('spotify.inactiveDevice'));
    if (response.status === 429) throw new Error(translate('spotify.rateLimit'));
    if (response.status === 404 && path.startsWith('tracks/'))
      throw new Error(translate('spotify.trackNotFound'));
    throw new Error(translate('spotify.commandFailed'));
  }
  return data;
}
export async function spotifyDevices(): Promise<SpotifyDevice[]> {
  const d = await playerRequest('me/player/devices');
  return (d?.devices || []).filter((x: SpotifyDevice) => Boolean(x.id) && !x.is_restricted);
}
export async function playSpotifyTrack(track: string, device: string) {
  if (!device) throw new Error(translate('spotify.chooseDevice'));
  const valid = spotifyId(track);
  const info = await playerRequest('tracks/' + valid);
  if (info?.is_playable === false || info?.restrictions?.reason === 'market')
    throw new Error(translate('spotify.trackUnavailable'));
  await playerRequest('me/player/play?device_id=' + encodeURIComponent(device), 'PUT', {
    uris: ['spotify:track:' + valid],
    position_ms: 0,
  });
}
export async function spotifyPlaybackCommand(command: 'pause' | 'resume' | 'stop', device: string) {
  if (!device) throw new Error(translate('spotify.chooseDevice'));
  await playerRequest(
    'me/player/' +
      (command === 'resume' ? 'play' : 'pause') +
      '?device_id=' +
      encodeURIComponent(device),
    'PUT',
  );
}
