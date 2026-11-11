import { displayTranslation, t, useTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Headphones,
  LoaderCircle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Settings2,
} from 'lucide-react';
import { openSpotifySetup } from './spotify-settings';
import type { Card } from './model';
import type { Command } from './connection';
import type { PlaybackState } from './playback';
import {
  beginSpotifyLogin,
  disconnectSpotify,
  playSpotifyTrack,
  spotifyConnected,
  spotifyConfigured,
  spotifyDevices,
  spotifyPlaybackCommand,
  spotifyAccountEvent,
  type SpotifyDevice,
} from './spotify';

export function useSpotifyRemote(
  card: Card | null,
  command: { type: Command; seq: number } | null,
  enabled: boolean,
  onState: (s: string, state?: PlaybackState) => void,
  returnTo: 'editor' | 'scanner' | 'player' = 'player',
) {
  useTranslation();
  const [devices, setDevices] = useState<SpotifyDevice[]>([]),
    [device, setDeviceState] = useState(localStorage.getItem('hiciarz-spotify-device') || ''),
    [linked, setLinked] = useState(spotifyConnected('player')),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [connecting, setConnecting] = useState(false);
  const callback = useRef(onState);
  callback.current = onState;
  const queue = useRef(Promise.resolve()),
    stopping = useRef<Promise<void> | null>(null),
    refreshGeneration = useRef(0),
    generation = useRef(0),
    lastCommand = useRef(0);
  const setDevice = (value: string) => {
    setDeviceState(value);
    localStorage.setItem('hiciarz-spotify-device', value);
  };
  async function refresh() {
    const request = ++refreshGeneration.current;
    setLoading(true);
    setError('');
    try {
      const ds = await spotifyDevices();
      if (request !== refreshGeneration.current) return;
      setDevices(ds);
      const selected = localStorage.getItem('hiciarz-spotify-device') || '';
      if (!ds.some((d) => d.id === selected))
        setDevice(ds.find((d) => d.is_active)?.id || ds[0]?.id || '');
      setLinked(spotifyConnected('player'));
    } catch (e) {
      if (request !== refreshGeneration.current) return;
      setDevices([]);
      setError((e as Error).message);
      setLinked(spotifyConnected('player'));
    } finally {
      if (request === refreshGeneration.current) setLoading(false);
    }
  }
  async function connect() {
    setError('');
    setConnecting(true);
    sessionStorage.setItem(
      'hiciarz-spotify-return-mode',
      returnTo === 'scanner' ? 'scanner' : 'player',
    );
    try {
      if (!(await beginSpotifyLogin('player'))) setConnecting(false);
    } catch (e) {
      setError((e as Error).message);
      setConnecting(false);
    }
  }
  useEffect(() => {
    if (enabled && spotifyConnected('player')) {
      setLinked(true);
      refresh();
    }
    return () => {
      refreshGeneration.current++;
    };
  }, [enabled, returnTo]);
  useEffect(() => {
    const changed = () => {
      generation.current++;
      refreshGeneration.current++;
      const connected = spotifyConnected('player');
      setLinked(connected);
      setDevices([]);
      setError('');
      setLoading(false);
      if (connected && enabled) void refresh();
    };
    window.addEventListener(spotifyAccountEvent, changed);
    return () => window.removeEventListener(spotifyAccountEvent, changed);
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !linked) return;
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, linked, device]);
  useEffect(() => {
    const seq = ++generation.current;
    if (!enabled || !card) return;
    if (!linked) {
      callback.current(t('components.SpotifyRemote.connectSpotifyToPlayTracksOn'), 'error');
      return;
    }
    if (!device) {
      callback.current(t('components.SpotifyRemote.chooseASpotifyDevice'), 'error');
      return;
    }
    if (!card.sources.spotify) {
      callback.current(t('components.SpotifyRemote.thisCardHasNoSpotifySource'), 'error');
      return;
    }
    const track = card.sources.spotify;
    callback.current(t('components.SpotifyRemote.sendingCommandToSpotify'), 'loading');
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (seq !== generation.current) return;
        try {
          await playSpotifyTrack(track, device);
          if (seq === generation.current) {
            setError('');
            callback.current(
              t('components.SpotifyRemote.spotifyAcceptedThePlaybackCommandFor'),
              'playing',
            );
          }
        } catch (e) {
          if (seq === generation.current) {
            setError((e as Error).message);
            setLinked(spotifyConnected('player'));
            callback.current((e as Error).message, 'error');
          }
        }
      });
  }, [card, device, enabled, linked]);
  useEffect(() => {
    if (!enabled || !linked || !command || command.seq === lastCommand.current) return;
    lastCommand.current = command.seq;
    const session = generation.current;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (session !== generation.current) return;
        try {
          await spotifyPlaybackCommand(command.type, device);
          if (session !== generation.current) return;
          setError('');
          callback.current(
            command.type === 'resume'
              ? t('components.SpotifyRemote.resumedInSpotify')
              : t('components.SpotifyRemote.pausedInSpotify'),
            command.type === 'resume' ? 'playing' : command.type === 'stop' ? 'stopped' : 'paused',
          );
        } catch (e) {
          if (session !== generation.current) return;
          setError((e as Error).message);
          setLinked(spotifyConnected('player'));
          callback.current((e as Error).message, 'error');
        }
      });
  }, [command, enabled, linked, device]);
  function stop(): Promise<void> {
    if (stopping.current) return stopping.current;
    if (!enabled || !linked || !device) return Promise.resolve();
    // Invalidate pending starts, then pause after an already-sent start finishes.
    // Sending pause immediately could let a slower play request restart the music.
    generation.current++;
    const request = queue.current
      .catch(() => {})
      .then(() => spotifyPlaybackCommand('stop', device))
      .then(() => {
        setError('');
        callback.current(t('components.SpotifyRemote.pausedInSpotify'), 'stopped');
      })
      .catch((e) => {
        setError((e as Error).message);
        setLinked(spotifyConnected('player'));
        callback.current((e as Error).message, 'error');
        throw e;
      })
      .finally(() => {
        stopping.current = null;
      });
    stopping.current = request;
    queue.current = request;
    return request;
  }
  function disconnect() {
    generation.current++;
    disconnectSpotify();
    setLinked(false);
    setDevices([]);
    setDevice('');
    setError('');
    callback.current(t('components.SpotifyRemote.spotifyAccountDisconnected'), 'error');
  }
  const ready = enabled && linked && Boolean(device) && devices.some((d) => d.id === device);
  return {
    devices,
    device,
    setDevice,
    linked,
    loading,
    error,
    refresh,
    stop,
    disconnect,
    ready,
    connecting,
    connect,
  };
}
export function SpotifyRemotePanel({ remote }: { remote: ReturnType<typeof useSpotifyRemote> }) {
  useTranslation();
  return (
    <div className="spotify-remote">
      <span className="mini-icon">
        <Headphones size={23} />
      </span>
      <h2>
        {remote.ready
          ? t('components.SpotifyRemote.musicIsReadyTimeForCards')
          : remote.linked
            ? t('components.SpotifyRemote.chooseWhereWePlay')
            : t('components.SpotifyRemote.connectSpotifyToPlay')}
      </h2>
      {!remote.ready && <p>{t('components.SpotifyRemote.signInOnceChooseAPhone')}</p>}
      {!remote.ready && (
        <ol className="spotify-setup-steps" aria-label={t('components.SpotifyRemote.spotifySetup')}>
          <li className={remote.linked ? 'done' : 'current'}>
            <span>{remote.linked ? <Check size={14} /> : '1'}</span>
            {t('components.SpotifyRemote.connectAccount')}
          </li>
          <li className={remote.ready ? 'done' : remote.linked ? 'current' : ''}>
            <span>{remote.ready ? <Check size={14} /> : '2'}</span>
            {t('components.SpotifyRemote.chooseDevice')}
          </li>
          <li className={remote.ready ? 'current' : ''}>
            <span>3</span>
            {t('components.SpotifyRemote.scanAndPlay')}
          </li>
        </ol>
      )}
      {!remote.linked ? (
        <>
          <button className="primary full" disabled={remote.connecting} onClick={remote.connect}>
            {remote.connecting ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Headphones size={18} />
            )}
            {remote.connecting
              ? t('components.SpotifyRemote.openingSpotify')
              : spotifyConfigured()
                ? t('components.SpotifyRemote.signInToSpotify')
                : t('components.SpotifyRemote.setUpSpotify')}
          </button>
          <p className="hint">{t('components.SpotifyRemote.spotifyWillAskForAccessTo')}</p>
        </>
      ) : (
        <>
          <div className="device-selection">
            <label>
              {t('components.SpotifyRemote.whereShouldMusicPlay')}
              <select
                disabled={remote.loading}
                value={remote.device}
                onChange={(e) => remote.setDevice(e.target.value)}
              >
                <option value="">{t('components.SpotifyRemote.chooseDevice')}</option>
                {remote.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.is_active ? t('components.SpotifyRemote.activeDevice') : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon"
              disabled={remote.loading}
              onClick={remote.refresh}
              aria-label={t('components.SpotifyRemote.refreshSpotifyDevices')}
            >
              {remote.loading ? (
                <LoaderCircle size={20} className="spin" />
              ) : (
                <RefreshCw size={20} />
              )}
            </button>
          </div>
          {!remote.devices.length && !remote.loading && !remote.error && (
            <div className="spotify-device-help">
              <strong>{t('components.SpotifyRemote.cantSeeYourDevice')}</strong>
              <p>{t('components.SpotifyRemote.openSpotifyOnItAndPlay')}</p>
              <div className="inline-actions">
                <a
                  className="secondary"
                  href="https://open.spotify.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('components.SpotifyRemote.openSpotify')} <ExternalLink size={15} />
                </a>
                <button className="secondary" onClick={remote.refresh}>
                  <RefreshCw size={15} />
                  {t('components.SpotifyRemote.refreshDevices')}
                </button>
              </div>
            </div>
          )}
          {remote.loading && (
            <p className="hint" role="status">
              {t('components.SpotifyRemote.lookingForYourSpotifyDevices')}
            </p>
          )}
          {remote.ready && (
            <p className="spotify-ready" role="status">
              <Check size={18} /> {t('components.SpotifyRemote.readyCardsWillPlayOn')}{' '}
              <strong>{remote.devices.find((d) => d.id === remote.device)?.name}</strong>
            </p>
          )}
          <button className="quiet" onClick={remote.disconnect}>
            <LogOut size={15} /> {t('components.SpotifyRemote.disconnectSpotify')}
          </button>
        </>
      )}
      {remote.error && (
        <p role="alert" className="error">
          {displayTranslation(remote.error)}
        </p>
      )}
      <button className="spotify-settings-link" onClick={() => openSpotifySetup('player')}>
        <Settings2 size={15} /> {t('components.SpotifyRemote.spotifyConnectionSettings')}
      </button>
    </div>
  );
}
