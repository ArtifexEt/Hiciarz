import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import PlaybackSettings from './PlaybackSettings';
import { setLanguage, type Language } from './i18n';

const noop = () => {};

function render(overrides: Partial<ComponentProps<typeof PlaybackSettings>> = {}) {
  return renderToStaticMarkup(
    <PlaybackSettings
      output="browser"
      receiver={false}
      preferred="spotify"
      paired={false}
      scanning={true}
      onOutput={async () => true}
      onPreferred={noop}
      onDisconnect={noop}
      onScanner={noop}
      onClose={noop}
      {...overrides}
    />,
  );
}

function selectedChoice(markup: string) {
  return [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
    .filter(([, attributes]) => attributes.includes('aria-pressed="true"'))
    .map(([, , content]) => content.replace(/<[^>]*>/g, ''));
}

function expectTranslated(markup: string) {
  expect(markup).not.toMatch(/(?:app|sound|components|plainPlayback)\.[A-Za-z]/);
}

afterEach(() => setLanguage('pl'));

const labels = {
  pl: {
    device: 'Na tym urządzeniu',
    secondScreen: 'Drugi ekran',
    source: 'Preferowane źródło',
    pairing: 'Na drugim urządzeniu otwórz Hiciarza',
    scanner: 'Wróć do skanera',
    disconnect: 'Rozłącz',
    connected: 'Połączono z odtwarzaczem',
    done: 'Gotowe',
  },
  en: {
    device: 'On this device',
    secondScreen: 'Second screen',
    source: 'Preferred source',
    pairing: 'On the other device, open Hiciarz',
    scanner: 'Back to scanner',
    disconnect: 'Disconnect',
    connected: 'Connected to player',
    done: 'Done',
  },
} as const;

describe.each<Language>(['pl', 'en'])('playback destination in %s', (language) => {
  const text = labels[language];

  it('treats legacy browser output as this device when the app is a receiver', () => {
    setLanguage(language);
    const markup = render({ receiver: true });
    expect(selectedChoice(markup)).toHaveLength(1);
    expect(selectedChoice(markup)[0]).toContain(text.device);
    expect(markup).not.toContain(text.secondScreen);
    expect(markup).toContain(text.source);
    expect(markup).toContain('<option value="youtube">YouTube</option>');
    expect(markup).not.toContain(text.pairing);
    expect(markup).toContain(text.done);
    expectTranslated(markup);
  });

  it('treats browser output as a second screen for a scanner and explains pairing', () => {
    setLanguage(language);
    const markup = render();
    expect(selectedChoice(markup)).toHaveLength(1);
    expect(selectedChoice(markup)[0]).toContain(text.secondScreen);
    expect(markup).toContain(text.pairing);
    expect(markup).toContain(text.scanner);
    expect(markup).not.toContain('<select');
    expect(markup).not.toContain(text.connected);
    expectTranslated(markup);
  });

  it('replaces pairing instructions with the connection state and disconnect action', () => {
    setLanguage(language);
    const markup = render({ paired: true });
    expect(selectedChoice(markup)[0]).toContain(text.secondScreen);
    expect(markup).toContain(text.connected);
    expect(markup).toContain(text.disconnect);
    expect(markup).toContain(text.done);
    expect(markup).not.toContain(text.pairing);
    expect(markup).not.toContain(text.scanner);
    expectTranslated(markup);
  });

  it('plays locally without account or device setup', () => {
    setLanguage(language);
    const markup = render({ output: 'local' });
    expect(selectedChoice(markup)[0]).toContain(text.device);
    expect(markup).toContain(text.source);
    expect(markup).toContain('<option value="spotify" selected="">Spotify</option>');
    expect(markup).not.toContain('Spotify Connect');
    expect(markup).not.toContain(text.pairing);
    expect(markup).toContain(text.done);
    expectTranslated(markup);
  });
});
