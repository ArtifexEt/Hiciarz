import { displayTranslation, t, useTranslation } from './i18n';
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
  useTranslation();
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
          if (current) setError(t('components.SpotifyAccount.couldNotLoadYourSpotifyProfile'));
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
        aria-label={t('components.SpotifyAccount.spotifyAccount')}
        aria-expanded={open}
        aria-controls="spotify-account-menu"
        title={profile?.name || t('components.SpotifyAccount.spotifyAccount')}
        onClick={() => setOpen(!open)}
      >
        {profile?.avatar && !failedImage ? (
          <img
            src={profile.avatar}
            alt={t('components.SpotifyAccount.spotifyAvatar')}
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
          <small>{t('components.SpotifyAccount.cONNECTEDTOSPOTIFY')}</small>
          <strong>{profile?.name || t('components.SpotifyAccount.spotifyAccount')}</strong>
          {error && (
            <>
              <p role="alert">{displayTranslation(error)}</p>
              <button onClick={() => setRetry((n) => n + 1)}>
                <RefreshCw size={16} /> {t('components.SpotifyAccount.refreshProfile')}
              </button>
            </>
          )}
          <button
            onClick={() => {
              setOpen(false);
              openSpotifySetup();
            }}
          >
            <Settings2 size={17} /> {t('components.SpotifyAccount.spotifySettings')}
          </button>
          <button onClick={disconnectSpotify}>
            <LogOut size={17} /> {t('components.SpotifyAccount.signOutOfSpotify')}
          </button>
          <p>{t('components.SpotifyAccount.thisSignsYourAccountOutOf')}</p>
        </div>
      )}
    </div>
  );
}
