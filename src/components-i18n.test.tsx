import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import Landing from './Landing';
import PlayingCard from './PlayingCard';
import PrintCards from './PrintCards';
import { setLanguage, t } from './i18n';
import { defaultPrint } from './model';

afterEach(() => setLanguage('pl'));

describe('translated interface components', () => {
  it('translates the landing controls while preserving song names', () => {
    setLanguage('en');
    const english = renderToStaticMarkup(<Landing onChoose={() => {}} />);
    expect(english).toContain('Scan cards');
    expect(english).toContain('Create cards');
    expect(english).toContain('Dancing Queen');
    expect(english).toContain('ABBA');
    expect(english).not.toContain('Skanuj karty');
    expect(english).not.toContain('components.');

    setLanguage('pl');
    const polish = renderToStaticMarkup(<Landing onChoose={() => {}} />);
    expect(polish).toContain('Skanuj karty');
    expect(polish).toContain('Twórz karty');
  });

  it('translates playback controls and accessible card labels without exposing track data', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(
      <PlayingCard
        card={{ v: 1, id: 'card', theme: 'fish', sources: { spotify: 'secret-track-id' } }}
        state="paused"
        message=""
        disabled={false}
        onToggle={() => {}}
        onNext={() => {}}
      />,
    );
    expect(markup).toContain('Scanned card');
    expect(markup).toContain('Card back · ');
    expect(markup).toContain('Resume');
    expect(markup).toContain('Scan the next card');
    expect(markup).not.toContain('secret-track-id');
    expect(markup).not.toContain('components.');
  });

  it('updates an existing playback status after a language change', () => {
    setLanguage('pl');
    const message = t('components.Players.loadingTrack');
    setLanguage('en');
    const markup = renderToStaticMarkup(
      <PlayingCard
        card={{ v: 1, id: 'card', theme: 'classic', sources: {} }}
        state="loading"
        message={message}
        disabled={false}
        onToggle={() => {}}
      />,
    );
    expect(markup).toContain('Loading track…');
    expect(markup).not.toContain(message);
  });

  it('shows the selected duplex edge and print actions in English', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(
      <PrintCards
        count={25}
        selected
        settings={{ ...defaultPrint, edge: 'short' }}
        error=""
        onDownload={() => {}}
        onPreview={() => {}}
        onSettings={() => {}}
      />,
    );
    expect(markup).toContain('Selected cards');
    expect(markup).toContain('short');
    expect(markup).toContain('edge');
    expect(markup).toContain('Download PDF');
    expect(markup).not.toContain('components.');
  });
});
