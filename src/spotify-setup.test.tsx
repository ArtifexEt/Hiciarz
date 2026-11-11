import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpotifySetup from './SpotifySetup';
import { setLanguage, type Language } from './i18n';

const defaultId = 'a'.repeat(32);
const savedId = 'b'.repeat(32);
const incomingId = 'c'.repeat(32);
let local: Map<string, string>;
let session: Map<string, string>;
const storage = (data: Map<string, string>) => ({
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
  removeItem: (key: string) => data.delete(key),
});

beforeEach(() => {
  local = new Map();
  session = new Map([['spotify-token', 'existing-login']]);
  vi.stubGlobal('localStorage', storage(local));
  vi.stubGlobal('sessionStorage', storage(session));
  vi.stubGlobal('location', { origin: 'https://example.com', pathname: '/Hiciarz/' });
  vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', defaultId);
});

afterEach(() => {
  setLanguage('pl');
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function render(props: Partial<ComponentProps<typeof SpotifySetup>> = {}) {
  return renderToStaticMarkup(<SpotifySetup onDone={() => {}} {...props} />);
}

function expectPrivate(markup: string) {
  for (const id of [defaultId, savedId, incomingId]) expect(markup).not.toContain(id);
  expect(markup).not.toContain('data-qr-value');
  expect(markup).not.toContain('<img');
  expect(markup).not.toMatch(/(?:spotifyPrivate|components\.SpotifySetup|documentation)\.[A-Za-z]/);
}

const labels = {
  pl: {
    default: 'Domyślne połączenie',
    own: 'Własne połączenie',
    change: 'Zmień połączenie',
    newId: 'Nowy Client ID',
    keep: 'Pozostaw pole puste, aby je zachować',
    save: 'Zapisz połączenie',
    incoming: 'Odczytano konfigurację z linku lub kodu QR',
  },
  en: {
    default: 'Default connection',
    own: 'Your own connection',
    change: 'Change connection',
    newId: 'New Client ID',
    keep: 'Leave the field empty to keep it',
    save: 'Save connection',
    incoming: 'A configuration was received from a link or QR code',
  },
};

describe.each<Language>(['pl', 'en'])('private Spotify configuration in %s', (language) => {
  const text = labels[language];

  it('summarizes the default connection without rendering its build-time identifier', () => {
    setLanguage(language);
    const markup = render();
    expect(markup).toContain(text.default);
    expect(markup).toContain(text.change);
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain(text.save);
    expectPrivate(markup);
  });

  it('summarizes a saved custom connection without showing or changing it', () => {
    local.set('hiciarz-spotify-client-id', savedId);
    setLanguage(language);
    const markup = render();
    expect(markup).toContain(text.own);
    expect(markup).toContain(text.change);
    expect(markup).not.toContain('<input');
    expect(local.get('hiciarz-spotify-client-id')).toBe(savedId);
    expect(session.get('spotify-token')).toBe('existing-login');
    expectPrivate(markup);
  });

  it('offers an empty replacement field during onboarding and explains how to retain the saved connection', () => {
    local.set('hiciarz-spotify-client-id', savedId);
    setLanguage(language);
    const markup = render({ purpose: 'player' });
    expect(markup).toContain(text.newId);
    expect(markup).toContain(text.keep);
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('value=""');
    expect(markup).toContain(text.save);
    expect(markup).toContain('https://example.com/Hiciarz/');
    expect(markup).toContain('Client Secret');
    expect(local.get('hiciarz-spotify-client-id')).toBe(savedId);
    expect(session.get('spotify-token')).toBe('existing-login');
    expectPrivate(markup);
  });

  it('requires an explicit save for incoming configuration without revealing or prefilling it', () => {
    local.set('hiciarz-spotify-client-id', savedId);
    setLanguage(language);
    const markup = render({ incomingClientId: incomingId });
    expect(markup).toContain(text.incoming);
    expect(markup).toContain(text.save);
    expect(markup).toContain('value=""');
    expect(local.get('hiciarz-spotify-client-id')).toBe(savedId);
    expect(session.get('spotify-token')).toBe('existing-login');
    expectPrivate(markup);
  });
});

it('offers manual configuration immediately when no default or saved connection exists', () => {
  vi.stubEnv('VITE_SPOTIFY_CLIENT_ID', '');
  const markup = render();
  expect(markup).toContain('Nowy Client ID');
  expect(markup).not.toContain('Domyślne połączenie');
  expect(markup).toContain('value=""');
  expectPrivate(markup);
});
