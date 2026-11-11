import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpotifyLoginNotice from './SpotifyLoginNotice';
import { SpotifyRemotePanel, type useSpotifyRemote } from './SpotifyRemote';
import { setLanguage, t } from './i18n';

const defaultId = 'a'.repeat(32);
const ownId = 'b'.repeat(32);
let local: Map<string, string>;

beforeEach(() => {
  local = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => local.get(key) || null,
    setItem: (key: string, value: string) => local.set(key, value),
  });
  vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', defaultId);
  setLanguage('pl');
});
afterEach(() => {
  setLanguage('pl');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('default Spotify connection notice', () => {
  it('explains the possible sign-in failure in both languages without exposing a client ID', () => {
    for (const language of ['pl', 'en'] as const) {
      setLanguage(language);
      const markup = renderToStaticMarkup(<SpotifyLoginNotice purpose="import" />);
      expect(markup).toContain(t('loginnote.defaultConnection'));
      expect(markup).toContain(t('loginnote.changeConnection'));
      expect(markup).toContain('type="button"');
      expect(markup).not.toContain(defaultId);
      expect(markup).not.toContain(ownId);
      expect(markup).not.toContain('loginnote.');
    }
  });

  it('stays hidden with a personal connection or without a build default', () => {
    local.set('hiciarz-spotify-client-id', ownId);
    expect(renderToStaticMarkup(<SpotifyLoginNotice purpose="player" />)).toBe('');
    local.delete('hiciarz-spotify-client-id');
    vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '');
    expect(renderToStaticMarkup(<SpotifyLoginNotice purpose="player" />)).toBe('');
  });

  it('shows the notice before the remote sign-in button in both panel layouts', () => {
    setLanguage('en');
    const remote: ReturnType<typeof useSpotifyRemote> = {
      devices: [],
      device: '',
      setDevice: vi.fn(),
      linked: false,
      loading: false,
      error: '',
      refresh: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      ready: false,
      connecting: false,
      connect: vi.fn(),
    };
    for (const compact of [false, true]) {
      const markup = renderToStaticMarkup(<SpotifyRemotePanel remote={remote} compact={compact} />);
      const notice = markup.indexOf(t('loginnote.defaultConnection'));
      const signIn = markup.indexOf(t('components.SpotifyRemote.signInToSpotify'));
      expect(notice).toBeGreaterThan(-1);
      expect(signIn).toBeGreaterThan(notice);
      expect(markup).not.toContain(defaultId);
      expect(markup).not.toContain(t('components.SpotifyRemote.spotifyConnectionSettings'));
    }
    local.set('hiciarz-spotify-client-id', ownId);
    const personal = renderToStaticMarkup(<SpotifyRemotePanel remote={remote} compact />);
    expect(personal).not.toContain(t('loginnote.defaultConnection'));
    expect(personal).toContain(t('components.SpotifyRemote.spotifyConnectionSettings'));
  });
});
