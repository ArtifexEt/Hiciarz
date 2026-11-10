import { LoaderCircle, Music2, Pause, Play, RotateCcw, ScanLine } from 'lucide-react';
import type { Card } from './model';
import { themeNames, cardQuestion } from './model';
import { themeArt } from './themes';
import type { PlaybackState } from './playback';

export default function PlayingCard({
  card,
  back,
  state,
  message,
  disabled,
  onToggle,
  onNext,
}: {
  card: Card;
  back?: string;
  state: PlaybackState;
  message: string;
  disabled: boolean;
  onToggle: () => void;
  onNext?: () => void;
}) {
  const loading = state === 'loading';
  return (
    <section className={'playing-card is-' + state} aria-label="Zeskanowana karta">
      <div
        className="playing-cover"
        style={{ backgroundImage: `url("${back || themeArt(card.theme)}")` }}
        role="img"
        aria-label={'Rewers karty · ' + themeNames[card.theme]}
      >
        <span className="playing-wordmark">
          hiciarz <span aria-hidden="true">✳</span>
        </span>
        <span className="playing-record">
          <Music2 size={42} aria-hidden="true" />
        </span>
        <span className="playing-cover-caption">SŁUCHAJ · ZGADUJ · BAW SIĘ</span>
      </div>
      <div className="playing-copy">
        <span className="eyebrow">
          {card.gameMode === 'movie'
            ? 'ZGADNIJ FILM'
            : card.gameMode === 'game'
              ? 'ZGADNIJ GRĘ'
              : 'TWOJA MUZYCZNA ZAGADKA'}
        </span>
        <h2>
          {state === 'paused' || state === 'stopped'
            ? 'Chwila przerwy.'
            : state === 'error'
              ? 'Spróbujmy jeszcze raz.'
              : loading
                ? 'Za chwilę muzyka…'
                : cardQuestion(card.gameMode)}
        </h2>
        <p className="playing-message" role={state === 'error' ? 'alert' : 'status'}>
          {message}
        </p>
      </div>
      <button className="primary playback-toggle" disabled={disabled || loading} onClick={onToggle}>
        {loading ? (
          <LoaderCircle className="spin" size={24} />
        ) : state === 'playing' ? (
          <Pause size={24} />
        ) : state === 'error' ? (
          <RotateCcw size={23} />
        ) : (
          <Play size={24} />
        )}
        {loading
          ? 'Łączę…'
          : state === 'playing'
            ? 'Pauza'
            : state === 'error'
              ? 'Spróbuj ponownie'
              : 'Wznów'}
      </button>
      {onNext && (
        <button className="quiet scan-next" onClick={onNext}>
          <ScanLine size={19} /> Skanuj kolejną kartę
        </button>
      )}
    </section>
  );
}
