import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import PlayingCard from './PlayingCard';
import { validPlaybackFeedback } from './playback';

describe('playing card', () => {
  const card = {
    v: 1 as const,
    id: 'test-card',
    theme: 'fish' as const,
    sources: { spotify: '2FRnf9qhLbvw8fu4IBXx78' },
  };
  const render = (state: 'playing' | 'paused' | 'loading' | 'error') =>
    renderToStaticMarkup(
      <PlayingCard
        card={card}
        state={state}
        message="Status odtwarzania"
        disabled={false}
        onToggle={() => {}}
        onNext={() => {}}
      />,
    );
  it('shows only the card cover with one matching transport button', () => {
    const playing = render('playing');
    expect(playing).toContain('Rewers karty · Rybki świąteczne');
    expect(playing).toContain('Pauza');
    expect(playing).not.toContain(card.sources.spotify);
    expect(render('paused')).toContain('Wznów');
    expect(render('loading')).toContain('disabled=""');
    expect(render('error')).toContain('Spróbuj ponownie');
    expect(playing).toContain('Skanuj kolejną kartę');
  });
  it('rejects malformed or excessive playback feedback from a peer', () => {
    expect(validPlaybackFeedback({ cardId: card.id, state: 'paused', message: 'Pauza' })).toBe(
      true,
    );
    for (const bad of [
      null,
      {},
      { cardId: card.id, state: 'unknown', message: '' },
      { cardId: card.id, state: 'playing', message: 'x'.repeat(1001) },
    ])
      expect(validPlaybackFeedback(bad)).toBe(false);
  });
});
