import { describe, expect, it } from 'vitest';
import { clearLegacySpotifySettings } from './legacy-spotify';

function store(values: Record<string, string>) {
  const data = new Map(Object.entries(values));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    data,
  };
}

describe('retired Spotify connection', () => {
  it('clears old credentials and migrates Connect while preserving decks and unrelated sessions', () => {
    const local = store({
      'hiciarz-spotify-client-id': 'old-client',
      'hiciarz-spotify-guide': 'old-client',
      'hiciarz-spotify-device': 'speaker',
      'hiciarz-output': 'spotify',
      'hiciarz-active-deck': 'my-deck',
    });
    const session = store({
      'spotify-token': 'old-token',
      'spotify-oauth': 'old-login',
      'spotify-import-mode': 'append',
      'spotify-import-playlist': 'old-playlist',
      'hiciarz-spotify-return-mode': 'scanner',
      'another-session': 'keep',
    });
    expect(clearLegacySpotifySettings(local, session)).toBe(true);
    expect(Object.fromEntries(local.data)).toEqual({
      'hiciarz-output': 'local',
      'hiciarz-active-deck': 'my-deck',
    });
    expect(Object.fromEntries(session.data)).toEqual({ 'another-session': 'keep' });
    expect(clearLegacySpotifySettings(local, session)).toBe(false);
  });

  it('preserves a paired-screen choice', () => {
    const local = store({ 'hiciarz-output': 'browser' });
    clearLegacySpotifySettings(local, store({}));
    expect(local.getItem('hiciarz-output')).toBe('browser');
  });
});
