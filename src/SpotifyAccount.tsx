import { useEffect, useRef, useState } from 'react';
import { LogOut, RefreshCw, UserRound, Settings2 } from 'lucide-react';
import { openSpotifySetup } from './spotify-settings';
import {
  disconnectSpotify,
  spotifyAccountEvent,
  spotifyConnected,
  spotifyProfile,
} from './spotify';

export default function SpotifyAccount() {
  const connected = () => spotifyConnected('player') || spotifyConnected('import');
  const [linked, setLinked] = useState(connected);
  const [profile, setProfile] = useState<{ name: string; avatar?: string }>();
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const changed = () => {
      setLinked(connected());
      setProfile(undefined);
      setOpen(false);
      setRetry((n) => n + 1);
    };
    window.addEventListener(spotifyAccountEvent, changed);
    return () => window.removeEventListener(spotifyAccountEvent, changed);
  }, []);
  useEffect(() => {
    let current = true;
    setError('');
    setFailedImage(false);
    if (linked)
      spotifyProfile()
        .then((p) => {
          if (current) setProfile(p);
        })
        .catch(() => {
          if (current)
            setError(
              'Nie udało się wczytać profilu Spotify. Możesz ponowić próbę lub wylogować konto.',
            );
        });
    return () => {
      current = false;
    };
  }, [linked, retry]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  if (!linked) return null;
  return (
    <div className="spotify-account" ref={container}>
      <button
        className="account-avatar"
        aria-label="Konto Spotify"
        aria-expanded={open}
        aria-controls="spotify-account-menu"
        title={profile?.name || 'Konto Spotify'}
        onClick={() => setOpen(!open)}
      >
        {profile?.avatar && !failedImage ? (
          <img
            src={profile.avatar}
            alt="Awatar Spotify"
            referrerPolicy="no-referrer"
            onError={() => setFailedImage(true)}
          />
        ) : (
          <UserRound size={21} />
        )}
        <span className="account-connected" aria-hidden="true" />
      </button>
      {open && (
        <div className="account-menu" id="spotify-account-menu">
          <small>POŁĄCZONO ZE SPOTIFY</small>
          <strong>{profile?.name || 'Konto Spotify'}</strong>
          {error && (
            <>
              <p role="alert">{error}</p>
              <button onClick={() => setRetry((n) => n + 1)}>
                <RefreshCw size={16} /> Odśwież profil
              </button>
            </>
          )}
          <button
            onClick={() => {
              setOpen(false);
              openSpotifySetup();
            }}
          >
            <Settings2 size={17} /> Ustawienia Spotify
          </button>
          <button onClick={disconnectSpotify}>
            <LogOut size={17} /> Wyloguj ze Spotify
          </button>
          <p>
            Wylogujesz konto z Hiciarza w tej karcie przeglądarki. Twoje talie zostaną zapisane.
          </p>
        </div>
      )}
    </div>
  );
}
