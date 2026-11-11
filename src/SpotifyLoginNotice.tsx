import { useSyncExternalStore } from 'react';
import { useTranslation } from './i18n';
import {
  customSpotifyClientId,
  defaultSpotifyClientId,
  isSpotifySettingsStorageKey,
  openSpotifySetup,
  spotifySettingsEvent,
  type SpotifyPurpose,
} from './spotify-settings';
import './spotify-login-notice.css';

export function usesDefaultSpotifyConnection() {
  return !customSpotifyClientId() && Boolean(defaultSpotifyClientId());
}

function subscribe(listener: () => void) {
  const storageChanged = (event: StorageEvent) => {
    if (isSpotifySettingsStorageKey(event.key)) listener();
  };
  window.addEventListener(spotifySettingsEvent, listener);
  window.addEventListener('storage', storageChanged);
  return () => {
    window.removeEventListener(spotifySettingsEvent, listener);
    window.removeEventListener('storage', storageChanged);
  };
}

export default function SpotifyLoginNotice({ purpose }: { purpose: SpotifyPurpose }) {
  const { t } = useTranslation();
  const visible = useSyncExternalStore(
    subscribe,
    usesDefaultSpotifyConnection,
    usesDefaultSpotifyConnection,
  );
  if (!visible) return null;
  return (
    <div className="spotify-login-notice">
      <p>{t('loginnote.defaultConnection')}</p>
      <button type="button" onClick={() => openSpotifySetup(purpose)}>
        {t('loginnote.changeConnection')}
      </button>
    </div>
  );
}
