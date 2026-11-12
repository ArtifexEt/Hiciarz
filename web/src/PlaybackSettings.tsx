import { useId, useState } from 'react';
import { Check, Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from './i18n';
import type { PlaybackOutput } from './scanner-playback';

export default function PlaybackSettings({
  output,
  receiver,
  preferred,
  paired,
  scanning,
  onOutput,
  onPreferred,
  onDisconnect,
  onStop,
  onScanner,
  onClose,
}: {
  output: PlaybackOutput;
  receiver: boolean;
  preferred: 'spotify' | 'youtube';
  paired: boolean;
  scanning: boolean;
  onOutput: (output: PlaybackOutput) => Promise<boolean>;
  onPreferred: (source: 'spotify' | 'youtube') => void;
  onDisconnect: () => void;
  onStop?: () => void;
  onScanner: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [changing, setChanging] = useState(false);
  const choices = [
    {
      value: receiver ? 'browser' : 'local',
      title: t('app.onThisDevice'),
      hint: t(receiver ? 'sound.thisReceiver' : 'sound.thisScanner'),
      Icon: Smartphone,
    },
    ...(!receiver
      ? [
          {
            value: 'browser',
            title: t('app.secondScreen'),
            hint: t('sound.secondScreenHint'),
            Icon: Monitor,
          },
        ]
      : []),
  ] as const;
  return (
    <div className="playback-settings" aria-busy={changing}>
      <div className="sound-choices" role="group" aria-label={t('sound.title')}>
        {choices.map(({ value, title, hint, Icon }) => (
          <button
            key={value}
            type="button"
            className="sound-choice"
            aria-pressed={output === value}
            aria-labelledby={`${id}-${value}`}
            aria-describedby={`${id}-${value}-hint`}
            disabled={changing}
            onClick={async () => {
              if (output === value) return;
              setChanging(true);
              try {
                await onOutput(value as PlaybackOutput);
              } finally {
                setChanging(false);
              }
            }}
          >
            <Icon size={22} aria-hidden="true" />
            <span>
              <strong id={`${id}-${value}`}>{title}</strong>
              <small id={`${id}-${value}-hint`}>{hint}</small>
            </span>
            {output === value && <Check size={20} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <div className="sound-details">
        {output === 'local' || receiver ? (
          <>
            <label className="source-picker">
              {t('app.preferredSource')}
              <select
                value={preferred}
                disabled={changing}
                onChange={(event) => onPreferred(event.target.value as 'spotify' | 'youtube')}
              >
                <option value="spotify">Spotify</option>
                <option value="youtube">YouTube</option>
              </select>
            </label>
            {!receiver && <p className="hint">{t('app.theSpotifyOrYoutubePlayerMayShow')}</p>}
          </>
        ) : paired ? (
          <div className="sound-paired">
            <p role="status">
              <Check size={18} aria-hidden="true" />
              {t('app.connectedToPlayer')}
            </p>
            <button className="secondary" onClick={onDisconnect}>
              {t('app.disconnect')}
            </button>
          </div>
        ) : (
          <ol className="sound-pairing-steps">
            <li>{t('sound.openSecondScreen')}</li>
            <li>{t('sound.scanPairingCode')}</li>
          </ol>
        )}
      </div>
      <div className="sound-actions">
        {onStop && (
          <button className="secondary" onClick={onStop}>
            {t('app.stopPlayback')}
          </button>
        )}
        {output === 'browser' && !receiver && !paired ? (
          <button className="primary full" onClick={onScanner}>
            {t(scanning ? 'sound.backToScanner' : 'sound.openScanner')}
          </button>
        ) : (
          <button className="primary full" disabled={changing} onClick={onClose}>
            {t('sound.done')}
          </button>
        )}
      </div>
    </div>
  );
}
