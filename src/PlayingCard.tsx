import { displayTranslation, t, useTranslation } from './i18n';
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
  useTranslation();
  const loading = state === 'loading';
  return (
    <section
      className={'playing-card is-' + state}
      aria-label={t('components.PlayingCard.scannedCard')}
    >
      <div
        className="playing-cover"
        style={{ backgroundImage: `url("${back || themeArt(card.theme)}")` }}
        role="img"
        aria-label={t('components.PlayingCard.cardBack') + themeNames[card.theme]}
      >
        <span className="playing-wordmark">
          hiciarz <span aria-hidden="true">✳</span>
        </span>
        <span className="playing-record">
          <Music2 size={42} aria-hidden="true" />
        </span>
      </div>
      <div className="playing-copy">
        <h2>{cardQuestion(card.gameMode)}</h2>
        <p className="playing-message" role={state === 'error' ? 'alert' : 'status'}>
          {message ? displayTranslation(message) : t('plainPlayback.state.' + state)}
        </p>
      </div>
      <button className="primary playback-toggle" disabled={disabled || loading} onClick={onToggle}>
        {loading ? (
          <LoaderCircle className="spin" size={24} aria-hidden="true" />
        ) : state === 'playing' ? (
          <Pause size={24} aria-hidden="true" />
        ) : state === 'error' ? (
          <RotateCcw size={23} aria-hidden="true" />
        ) : (
          <Play size={24} aria-hidden="true" />
        )}
        {loading
          ? t('plainPlayback.loadingAction')
          : state === 'playing'
            ? t('components.PlayingCard.pause')
            : state === 'error'
              ? t('components.PlayingCard.tryAgain')
              : t('components.PlayingCard.resume')}
      </button>
      {onNext && (
        <button className="quiet scan-next" onClick={onNext}>
          <ScanLine size={19} aria-hidden="true" /> {t('components.PlayingCard.scanTheNextCard')}
        </button>
      )}
    </section>
  );
}
