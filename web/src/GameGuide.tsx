import { t, useTranslation } from './i18n';
import { useState } from 'react';
import { ArrowUpRight, Monitor, ScanLine, Smartphone } from 'lucide-react';
import type { PlaybackOutput } from './scanner-playback';
import { bingoAppUrl } from './bingo-link';

export function GameGuide({ onStart }: { onStart: (route: PlaybackOutput) => void }) {
  const { language } = useTranslation();
  const [route, setRoute] = useState<PlaybackOutput>('local');
  const local = route === 'local';
  const steps = local
    ? [
        [t('components.GameGuide.scanACard'), t('plainPlayback.pointAtCard')],
        [t('components.GameGuide.listenHere'), t('components.GameGuide.startEmbeddedPlayback')],
      ]
    : [
        [t('components.GameGuide.startThePlayer'), t('sound.openSecondScreen')],
        [t('components.GameGuide.connectTheScanner'), t('sound.scanPairingCode')],
        [t('components.GameGuide.scanACard'), t('components.GameGuide.scanTheQRCodesOnYour')],
      ];
  return (
    <section className="game-guide" aria-labelledby="game-guide-title">
      <div className="game-guide-heading">
        <div>
          <h2 id="game-guide-title">{t('components.GameGuide.scanCardsDiscoverMusic')}</h2>
          <p>{t('components.GameGuide.prepareAndPrintADeckIn')}</p>
        </div>
        <div className="guide-device-art" aria-hidden="true">
          <Smartphone size={29} />
          {!local && (
            <>
              <span>→</span>
              <Monitor size={37} />
            </>
          )}
        </div>
      </div>
      <div
        className="guide-tabs"
        role="tablist"
        aria-label={t('components.GameGuide.playbackGuide')}
      >
        {(['local', 'browser'] as const).map((value) => (
          <button
            key={value}
            id={`guide-${value}`}
            role="tab"
            aria-selected={route === value}
            aria-controls="guide-steps"
            onClick={() => setRoute(value)}
          >
            {value === 'local' ? <Smartphone size={17} /> : <Monitor size={17} />}
            {t(value === 'local' ? 'app.onThisDevice' : 'app.secondScreen')}
          </button>
        ))}
      </div>
      <div id="guide-steps" role="tabpanel" aria-labelledby={`guide-${route}`}>
        <ol className="guide-steps">
          {steps.map(([title, description], index) => (
            <li key={title}>
              <span className="guide-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        <div className="guide-bottom">
          <button className="secondary" onClick={() => onStart(route)}>
            {local ? <ScanLine size={17} /> : <Monitor size={17} />}
            {t(local ? 'sound.openScanner' : 'components.GameGuide.openPlayer')}
            <ArrowUpRight size={16} />
          </button>
          <a href={bingoAppUrl(language)} rel="noreferrer">
            {t('shell.bingoLink')} <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="guide-note">{t('app.theSpotifyOrYoutubePlayerMayShow')}</p>
      </div>
    </section>
  );
}
