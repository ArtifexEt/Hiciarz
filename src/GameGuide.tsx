import { t, useTranslation } from './i18n';
import { useState } from 'react';
import { ArrowUpRight, Monitor, Radio, ScanLine, Smartphone } from 'lucide-react';
import { spotifyConfigured } from './spotify';

export function GameGuide({ onStart }: { onStart: (route: 'spotify' | 'laptop') => void }) {
  useTranslation();
  const [route, setRoute] = useState<'spotify' | 'laptop'>(
    spotifyConfigured() ? 'spotify' : 'laptop',
  );
  const laptop = route === 'laptop';
  const steps = laptop
    ? [
        [
          t('components.GameGuide.startThePlayer'),
          t('components.GameGuide.onTheDeviceThatWillPlay'),
        ],
        [
          t('components.GameGuide.connectTheScanner'),
          t('components.GameGuide.onTheOtherDeviceOpenCard'),
        ],
        [t('components.GameGuide.scanACard'), t('components.GameGuide.scanTheQRCodesOnYour')],
      ]
    : [
        [
          t('components.GameGuide.prepareSpotify'),
          t('components.GameGuide.openSpotifyOnTheDeviceYou'),
        ],
        [
          t('components.GameGuide.connectAccount'),
          t('components.GameGuide.choosePlayThroughSpotifySignIn'),
        ],
        [t('components.GameGuide.scanACard'), t('components.GameGuide.startTheCameraAndScanA')],
      ];
  return (
    <section className="game-guide" aria-labelledby="game-guide-title">
      <div className="game-guide-heading">
        <div>
          <span className="eyebrow">{t('components.GameGuide.fIRSTTIMESTARTHERE')}</span>
          <h2 id="game-guide-title">{t('components.GameGuide.scanCardsDiscoverMusic')}</h2>
          <p>{t('components.GameGuide.prepareAndPrintADeckIn')}</p>
        </div>
        <div className="guide-device-art" aria-hidden="true">
          <Smartphone size={29} />
          <span>→</span>
          {laptop ? <Monitor size={37} /> : <Radio size={37} />}
        </div>
      </div>
      <div
        className="guide-tabs"
        role="tablist"
        aria-label={t('components.GameGuide.playbackGuide')}
      >
        <button
          id="guide-laptop"
          role="tab"
          aria-selected={laptop}
          aria-controls="guide-steps"
          onClick={() => setRoute('laptop')}
        >
          <Monitor size={17} /> {t('components.GameGuide.throughThePlayerSpotifyYouTube')}
        </button>
        <button
          id="guide-spotify"
          role="tab"
          aria-selected={!laptop}
          aria-controls="guide-steps"
          onClick={() => setRoute('spotify')}
        >
          <Radio size={17} /> {t('components.GameGuide.directlyInSpotify')}
        </button>
      </div>
      <div
        id="guide-steps"
        role="tabpanel"
        aria-labelledby={laptop ? 'guide-laptop' : 'guide-spotify'}
      >
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
          <p>
            {laptop
              ? t('components.GameGuide.theConnectedDevicePlaysTheSound')
              : t('components.GameGuide.youNeedSpotifyPremiumAndCards')}
          </p>
          <button className="secondary" onClick={() => onStart(route)}>
            {laptop ? <Monitor size={17} /> : <ScanLine size={17} />}
            {laptop
              ? t('components.GameGuide.openPlayer')
              : t('components.GameGuide.openSpotifyScanner')}
            <ArrowUpRight size={16} />
          </button>
        </div>
        {laptop && (
          <p className="guide-note">{t('components.GameGuide.spotifyOnThisPageMayOnly')}</p>
        )}
      </div>
    </section>
  );
}
