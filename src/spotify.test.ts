import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authorizeSpotify,
  playSpotifyTrack,
  spotifyDevices,
  spotifyPlaybackCommand,
} from './spotify';
let data: Map<string, string>;
beforeEach(() => {
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
});
