import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authorizeSpotify,
  importPlaylist,
  disconnectSpotify,
  finishSpotify,
  spotifyAccountEvent,
  spotifyProfile,
  playSpotifyTrack,
  spotifyDevices,
  spotifyPlaybackCommand,
} from './spotify';
import { saveSpotifyClientId } from './spotify-settings';
let data: Map<string, string>;
beforeEach(() => {
  const preferences = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => preferences.get(k) || null,
    setItem: (k: string, v: string) => preferences.set(k, v),
    removeItem: (k: string) => preferences.delete(k),
  });
  data = new Map();
  data.set(
    'spotify-token',
    JSON.stringify({
      access_token: 'test-token',
      expires: Date.now() + 60000,
      scope: 'user-modify-playback-state user-read-playback-state',
    }),
  );
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => data.get(k) || null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('Spotify Connect requests', () => {
  it('announces a completed OAuth session after saving the token so devices can refresh immediately', async () => {
    const events = new EventTarget();
    const connected = vi.fn(() => expect(data.get('spotify-token')).toContain('new-token'));
    events.addEventListener(spotifyAccountEvent, connected);
    vi.stubGlobal('window', events);
    vi.stubGlobal('location', {
      origin: 'https://example.com',
      pathname: '/Hiciarz/',
      search: '?code=test-code&state=state',
    });
    vi.stubGlobal('history', { replaceState: vi.fn() });
    data.set(
      'spotify-oauth',
      JSON.stringify({ state: 'state', verifier: 'test-verifier', purpose: 'player' }),
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ access_token: 'new-token', scope: 'user-modify-playback-state' }),
          ),
        ),
    );
    await expect(finishSpotify()).resolves.toBe('player');
    expect(connected).toHaveBeenCalledOnce();
    expect(data.has('spotify-oauth')).toBe(false);
  });
  it('announces logout and clears the session', () => {
    const events = new EventTarget(),
      changed = vi.fn();
    events.addEventListener(spotifyAccountEvent, changed);
    vi.stubGlobal('window', events);
    disconnectSpotify();
    expect(changed).toHaveBeenCalledOnce();
    expect(data.has('spotify-token')).toBe(false);
  });
  it('distinguishes denied account access from an empty device list and a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await expect(spotifyDevices()).rejects.toThrow('Users Management');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(spotifyDevices()).rejects.toThrow('Sprawdź internet');
  });
  it('only exposes the display name and a safe avatar URL from the profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            display_name: 'Szymon',
            email: 'not-exposed@example.com',
            images: [{ url: 'javascript:bad' }, { url: 'https://i.scdn.co/image/avatar' }],
          }),
        ),
      ),
    );
    await expect(spotifyProfile()).resolves.toEqual({
      name: 'Szymon',
      avatar: 'https://i.scdn.co/image/avatar',
    });
  });
  it('explains denied playlist access without pretending a public playlist is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    await expect(importPlaylist('7wfTeAa7cxhA3qNE05XPKk')).rejects.toThrow('współtworzonych');
  });
  it('targets the selected device and exact track, starting from zero', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ is_playable: true })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request);
    await playSpotifyTrack('2FRnf9qhLbvw8fu4IBXx78', 'device with spaces');
    expect(request.mock.calls[1][0]).toBe(
      'https://api.spotify.com/v1/me/player/play?device_id=device%20with%20spaces',
    );
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({
      uris: ['spotify:track:2FRnf9qhLbvw8fu4IBXx78'],
      position_ms: 0,
    });
    expect(request.mock.calls[1][1].method).toBe('PUT');
  });
  it('does not play a track explicitly unavailable in the region', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ is_playable: false })));
    vi.stubGlobal('fetch', request);
    await expect(playSpotifyTrack('2FRnf9qhLbvw8fu4IBXx78', 'speaker')).rejects.toThrow(
      'niedostępny',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('distinguishes a missing device from a missing track', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    await expect(spotifyDevices()).rejects.toThrow('Urządzenie nie jest aktywne');
  });
  it('filters out restricted and unidentified devices', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            devices: [
              { id: 'a', name: 'Wieża', is_restricted: false },
              { id: 'b', name: 'Restricted', is_restricted: true },
              { id: null, name: 'Unknown', is_restricted: false },
            ],
          }),
        ),
      ),
    );
    expect((await spotifyDevices()).map((d) => d.name)).toEqual(['Wieża']);
  });
  it('uses pause for stop because Spotify has no separate stop command', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', request);
    await spotifyPlaybackCommand('stop', 'speaker');
    expect(request.mock.calls[0][0]).toContain('/pause?device_id=speaker');
  });
  it('starts OAuth with PKCE, purpose and playback scopes without a client secret', async () => {
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', 'test-client-id');
    const assign = vi.fn();
    vi.stubGlobal('location', { origin: 'https://example.com', pathname: '/Hiciarz/', assign });
    await authorizeSpotify('player');
    const url = new URL(assign.mock.calls[0][0]);
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.has('client_secret')).toBe(false);
    expect(url.searchParams.get('scope')).toContain('user-modify-playback-state');
    expect(url.searchParams.get('scope')).toContain('playlist-read-private');
    expect(url.searchParams.get('scope')).toContain('playlist-read-collaborative');
    expect(JSON.parse(data.get('spotify-oauth')!).purpose).toBe('player');
  });
  it('uses the locally chosen client for authorization and the code exchange', async () => {
    const client = 'b'.repeat(32),
      assign = vi.fn();
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('location', { origin: 'https://example.com', pathname: '/Hiciarz/', assign });
    saveSpotifyClientId(client);
    await authorizeSpotify('player');
    const auth = new URL(assign.mock.calls[0][0]);
    expect(auth.searchParams.get('client_id')).toBe(client);
    const saved = JSON.parse(data.get('spotify-oauth')!);
    vi.stubGlobal('location', {
      origin: 'https://example.com',
      pathname: '/Hiciarz/',
      search: '?code=returned&state=' + saved.state,
    });
    vi.stubGlobal('history', { replaceState: vi.fn() });
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ access_token: 'new', scope: 'user-modify-playback-state' })),
      );
    vi.stubGlobal('fetch', request);
    await finishSpotify();
    expect(request.mock.calls[0][1].body.get('client_id')).toBe(client);
    expect(request.mock.calls[0][1].body.has('client_secret')).toBe(false);
    expect(JSON.parse(data.get('spotify-token')!).client_id).toBe(client);
  });
  it('refreshes an expired session using the selected personal client ID', async () => {
    const client = 'b'.repeat(32);
    vi.stubGlobal('window', new EventTarget());
    saveSpotifyClientId(client);
    data.set(
      'spotify-token',
      JSON.stringify({
        access_token: 'expired',
        refresh_token: 'refresh',
        client_id: client,
        expires: 0,
      }),
    );
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'refreshed' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ devices: [] })));
    vi.stubGlobal('fetch', request);
    await spotifyDevices();
    expect(request.mock.calls[0][1].body.get('client_id')).toBe(client);
    expect(request.mock.calls[0][1].body.has('client_secret')).toBe(false);
    expect(request.mock.calls[1][1].headers.Authorization).toBe('Bearer refreshed');
    expect(JSON.parse(data.get('spotify-token')!).client_id).toBe(client);
  });
  it('does not save an old OAuth response after the client was changed', async () => {
    const original = 'a'.repeat(32),
      replacement = 'b'.repeat(32);
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', original);
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('location', {
      origin: 'https://example.com',
      pathname: '/Hiciarz/',
      search: '?code=returned&state=state',
    });
    vi.stubGlobal('history', { replaceState: vi.fn() });
    data.set(
      'spotify-oauth',
      JSON.stringify({ state: 'state', verifier: 'old', purpose: 'player', clientId: original }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          saveSpotifyClientId(replacement);
          return { access_token: 'old-client-token' };
        },
      }),
    );
    await expect(finishSpotify()).rejects.toThrow('Zmieniono połączenie');
    expect(data.has('spotify-token')).toBe(false);
  });
});
