import { useEffect, useRef, useState } from 'react';
import { Headphones, LoaderCircle, RefreshCw, LogOut } from 'lucide-react';
import type { Card } from './model';
import type { Command } from './connection';
import {
  authorizeSpotify,
  disconnectSpotify,
  playSpotifyTrack,
  spotifyConnected,
  spotifyConfigured,
  spotifyDevices,
  spotifyPlaybackCommand,
  type SpotifyDevice,
} from './spotify';

export function useSpotifyRemote(
  card: Card | null,
  command: { type: Command; seq: number } | null,
  enabled: boolean,
  onState: (s: string) => void,
) {
  const [devices, setDevices] = useState<SpotifyDevice[]>([]),
    [device, setDeviceState] = useState(localStorage.getItem('hiciarz-spotify-device') || ''),
    [linked, setLinked] = useState(spotifyConnected('player')),
    [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const callback = useRef(onState);
  callback.current = onState;
  const queue = useRef(Promise.resolve()),
    generation = useRef(0),
    lastCommand = useRef(0);
  const setDevice = (value: string) => {
    setDeviceState(value);
    localStorage.setItem('hiciarz-spotify-device', value);
  };
  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const ds = await spotifyDevices();
      setDevices(ds);
      if (!ds.some((d) => d.id === device))
        setDevice(ds.find((d) => d.is_active)?.id || ds[0]?.id || '');
      setLinked(spotifyConnected('player'));
    } catch (e) {
      setError((e as Error).message);
      setLinked(spotifyConnected('player'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (enabled && spotifyConnected('player')) {
      setLinked(true);
      refresh();
    }
  }, [enabled]);
  useEffect(() => {
    const seq = ++generation.current;
    if (!enabled || !card) return;
    if (!linked) {
      callback.current('Połącz Spotify, aby uruchamiać utwory na swoich urządzeniach.');
      return;
    }
    if (!device) {
      callback.current('Wybierz urządzenie Spotify.');
      return;
    }
    if (!card.sources.spotify) {
      callback.current(
        'Ta karta nie ma źródła Spotify. Użyj trybu „Na tym komputerze”, aby odtworzyć YouTube.',
      );
      return;
    }
    const track = card.sources.spotify;
    callback.current('Wysyłam polecenie do Spotify…');
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (seq !== generation.current) return;
        try {
          await playSpotifyTrack(track, device);
          if (seq === generation.current) {
            setError('');
            callback.current('Spotify przyjął polecenie odtwarzania na wybranym urządzeniu.');
          }
        } catch (e) {
          if (seq === generation.current) {
            setError((e as Error).message);
            callback.current((e as Error).message);
          }
        }
      });
  }, [card, device, enabled, linked]);
  useEffect(() => {
    if (!enabled || !linked || !command || command.seq === lastCommand.current) return;
    lastCommand.current = command.seq;
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          await spotifyPlaybackCommand(command.type, device);
          setError('');
          callback.current(
            command.type === 'resume'
              ? 'Wznowiono w Spotify.'
              : 'Wstrzymano odtwarzanie w Spotify.',
          );
        } catch (e) {
          setError((e as Error).message);
          callback.current((e as Error).message);
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
    callback.current('Odłączono konto Spotify.');
  }
  return { devices, device, setDevice, linked, loading, error, refresh, disconnect };
}
export function SpotifyRemotePanel({ remote }: { remote: ReturnType<typeof useSpotifyRemote> }) {
  return (
    <div className="spotify-remote">
      <span className="mini-icon">
        <Headphones size={23} />
      </span>
      <h2>Muzyka gra w Twoim Spotify.</h2>
      <p>
        Wybierz telefon, komputer lub wieżę Spotify Connect. Ta strona wysyła polecenia, a
        urządzenie odtwarza muzykę.
      </p>
      {!spotifyConfigured() ? (
        <div className="notice">
          <p>
            Połączenie ze Spotify nie jest jeszcze dostępne na tej stronie. Możesz użyć trybu „Na
            tym komputerze” z odtwarzaczem Spotify lub YouTube.
          </p>
        </div>
      ) : !remote.linked ? (
        <button className="primary full" onClick={() => authorizeSpotify('player').catch(() => {})}>
          Połącz ze Spotify
        </button>
      ) : (
        <>
          <div className="device-selection">
            <label>
              Urządzenie Spotify
              <select value={remote.device} onChange={(e) => remote.setDevice(e.target.value)}>
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
          {!remote.devices.length && !remote.loading && (
            <p className="hint">
              Otwórz Spotify na urządzeniu docelowym, uruchom dowolny utwór, potem odśwież listę.
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
      <p className="hint">
        W tym trybie wyjściem steruje Spotify Connect. Systemowe AirPlay dotyczy trybu „Na tym
        komputerze”.
      </p>
    </div>
  );
}
