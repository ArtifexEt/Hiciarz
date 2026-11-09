import { useEffect, useRef, useState } from 'react';
import { Check, Headphones, LoaderCircle, RefreshCw, LogOut, ExternalLink } from 'lucide-react';
import type { Card } from './model';
import type { Command } from './connection';
import type { PlaybackState } from './playback';
import {
  authorizeSpotify,
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
  const [devices, setDevices] = useState<SpotifyDevice[]>([]),
    [device, setDeviceState] = useState(localStorage.getItem('hiciarz-spotify-device') || ''),
    [linked, setLinked] = useState(spotifyConnected('player')),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [connecting, setConnecting] = useState(false);
  const callback = useRef(onState);
  callback.current = onState;
  const queue = useRef(Promise.resolve()),
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
      await authorizeSpotify('player');
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
      callback.current('Połącz Spotify, aby uruchamiać utwory na swoich urządzeniach.', 'error');
      return;
    }
    if (!device) {
      callback.current('Wybierz urządzenie Spotify.', 'error');
      return;
    }
    if (!card.sources.spotify) {
      callback.current(
        'Ta karta nie ma źródła Spotify. Użyj trybu „Na tym urządzeniu”, aby odtworzyć YouTube.',
        'error',
      );
      return;
    }
    const track = card.sources.spotify;
    callback.current('Wysyłam polecenie do Spotify…', 'loading');
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (seq !== generation.current) return;
        try {
          await playSpotifyTrack(track, device);
          if (seq === generation.current) {
            setError('');
            callback.current(
              'Spotify przyjął polecenie odtwarzania na wybranym urządzeniu.',
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
              ? 'Wznowiono w Spotify.'
              : 'Wstrzymano odtwarzanie w Spotify.',
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
  function disconnect() {
    generation.current++;
    disconnectSpotify();
    setLinked(false);
    setDevices([]);
    setDevice('');
    setError('');
    callback.current('Odłączono konto Spotify.', 'error');
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
    disconnect,
    ready,
    connecting,
    connect,
  };
}
export function SpotifyRemotePanel({ remote }: { remote: ReturnType<typeof useSpotifyRemote> }) {
  return (
    <div className="spotify-remote">
      <span className="mini-icon">
        <Headphones size={23} />
      </span>
      <h2>
        {remote.ready
          ? 'Muzyka gotowa. Czas na karty.'
          : remote.linked
            ? 'Wybierz, gdzie gramy.'
            : 'Połącz Spotify, żeby zagrać.'}
      </h2>
      {!remote.ready && (
        <p>
          Zaloguj się raz, wybierz telefon, komputer lub wieżę, a potem skanuj karty. Potrzebujesz
          konta Spotify Premium.
        </p>
      )}
      {!remote.ready && (
        <ol className="spotify-setup-steps" aria-label="Przygotowanie Spotify">
          <li className={remote.linked ? 'done' : 'current'}>
            <span>{remote.linked ? <Check size={14} /> : '1'}</span>Połącz konto
          </li>
          <li className={remote.ready ? 'done' : remote.linked ? 'current' : ''}>
            <span>{remote.ready ? <Check size={14} /> : '2'}</span>Wybierz urządzenie
          </li>
          <li className={remote.ready ? 'current' : ''}>
            <span>3</span>Skanuj i graj
          </li>
        </ol>
      )}
      {!spotifyConfigured() ? (
        <div className="notice">
          <p>
            Połączenie ze Spotify nie jest jeszcze dostępne na tej stronie. Możesz użyć trybu „Na
            tym urządzeniu” z odtwarzaczem Spotify lub YouTube.
          </p>
        </div>
      ) : !remote.linked ? (
        <>
          <button className="primary full" disabled={remote.connecting} onClick={remote.connect}>
            {remote.connecting ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Headphones size={18} />
            )}
            {remote.connecting ? 'Otwieram Spotify…' : 'Zaloguj się do Spotify'}
          </button>
          <p className="hint">
            Spotify poprosi o dostęp do profilu, playlist i sterowania muzyką. Hasło wpisujesz
            wyłącznie na stronie Spotify.
          </p>
        </>
      ) : (
        <>
          <div className="device-selection">
            <label>
              Gdzie ma grać muzyka?
              <select
                disabled={remote.loading}
                value={remote.device}
                onChange={(e) => remote.setDevice(e.target.value)}
              >
                <option value="">Wybierz urządzenie</option>
                {remote.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.is_active ? ' · aktywne' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon"
              disabled={remote.loading}
              onClick={remote.refresh}
              aria-label="Odśwież urządzenia Spotify"
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
              <strong>Nie widzisz swojego urządzenia?</strong>
              <p>Otwórz na nim Spotify i uruchom dowolny utwór. Wróć tutaj i odśwież listę.</p>
              <div className="inline-actions">
                <a
                  className="secondary"
                  href="https://open.spotify.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Otwórz Spotify <ExternalLink size={15} />
                </a>
                <button className="secondary" onClick={remote.refresh}>
                  <RefreshCw size={15} />
                  Odśwież urządzenia
                </button>
              </div>
            </div>
          )}
          {remote.loading && (
            <p className="hint" role="status">
              Szukam Twoich urządzeń Spotify…
            </p>
          )}
          {remote.ready && (
            <p className="spotify-ready" role="status">
              <Check size={18} /> Gotowe. Karty zagrają na:{' '}
              <strong>{remote.devices.find((d) => d.id === remote.device)?.name}</strong>
            </p>
          )}
          <button className="quiet" onClick={remote.disconnect}>
            <LogOut size={15} /> Odłącz Spotify
          </button>
        </>
      )}
      {remote.error && (
        <p role="alert" className="error">
          {remote.error}
        </p>
      )}
    </div>
  );
}
