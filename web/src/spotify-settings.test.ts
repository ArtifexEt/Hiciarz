import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readQR } from './model';
import {
  acknowledgeSpotifySetup,
  customSpotifyClientId,
  needsSpotifySetup,
  saveSpotifyClientId,
  spotifyClientId,
  spotifySetupUrl,
  spotifyAccountEvent,
  validateSpotifyClientId,
} from './spotify-settings';
let local: Map<string, string>, session: Map<string, string>;
const defaultId = 'a'.repeat(32),
  ownId = 'b'.repeat(32);
const storage = (data: Map<string, string>) => ({
  getItem: (k: string) => data.get(k) || null,
  setItem: (k: string, v: string) => data.set(k, v),
  removeItem: (k: string) => data.delete(k),
});
beforeEach(() => {
  local = new Map();
  session = new Map();
  vi.stubGlobal('localStorage', storage(local));
  vi.stubGlobal('sessionStorage', storage(session));
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('location', { origin: 'https://example.com', pathname: '/Hiciarz/' });
  vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', defaultId);
  vi.stubEnv('VITE_SPOTIFY_ONBOARDING', 'true');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe('personal Spotify configuration', () => {
  it('uses the build default, persists a local override and restores the default', () => {
    expect(spotifyClientId()).toBe(defaultId);
    saveSpotifyClientId(ownId);
    expect(spotifyClientId()).toBe(ownId);
    expect(customSpotifyClientId()).toBe(ownId);
    saveSpotifyClientId(null);
    expect(spotifyClientId()).toBe(defaultId);
    expect(customSpotifyClientId()).toBe('');
  });
  it('clears the previous login and selected device only when the effective client changes', () => {
    const changed = vi.fn();
    window.addEventListener(spotifyAccountEvent, changed);
    session.set('spotify-token', 'old');
    session.set('spotify-oauth', 'pending');
    local.set('hiciarz-spotify-device', 'speaker');
    saveSpotifyClientId(null);
    expect(session.get('spotify-token')).toBe('old');
    saveSpotifyClientId(ownId);
    expect(session.size).toBe(0);
    expect(local.has('hiciarz-spotify-device')).toBe(false);
    expect(changed).toHaveBeenCalledOnce();
  });
  it('does not save or log out for an invalid identifier', () => {
    session.set('spotify-token', 'old');
    for (const bad of ['', 'not-an-id', 'https://example.com', 'a'.repeat(33)])
      expect(() => saveSpotifyClientId(bad)).toThrow();
    expect(spotifyClientId()).toBe(defaultId);
    expect(session.get('spotify-token')).toBe('old');
    expect(validateSpotifyClientId(' ' + ownId + ' ')).toBe(ownId);
  });
  it('shows automatic guidance once per configured client and supports the build switch', () => {
    expect(needsSpotifySetup()).toBe(true);
    acknowledgeSpotifySetup();
    expect(needsSpotifySetup()).toBe(false);
    saveSpotifyClientId(ownId);
    expect(needsSpotifySetup()).toBe(true);
    vi.stubEnv('VITE_SPOTIFY_ONBOARDING', 'false');
    expect(needsSpotifySetup()).toBe(false);
    saveSpotifyClientId(null);
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '');
    expect(needsSpotifySetup()).toBe(true);
  });
  it('transfers only the public client ID through a separate QR and requires an explicit save', () => {
    const url = spotifySetupUrl(ownId, 'https://example.com/Hiciarz/?code=private#token=private');
    expect(url).toBe('https://example.com/Hiciarz/#spotify=' + ownId);
    expect(readQR(url)).toEqual({ kind: 'spotify-setup', clientId: ownId });
    expect(spotifyClientId()).toBe(defaultId);
    expect(() => readQR('https://example.com/#spotify=invalid')).toThrow();
  });
});
