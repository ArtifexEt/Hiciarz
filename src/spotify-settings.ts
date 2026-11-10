const clientKey = 'hiciarz-spotify-client-id';
const guideKey = 'hiciarz-spotify-guide';
export const spotifyAccountEvent = 'hiciarz-spotify-account';
export const spotifySettingsEvent = 'hiciarz-spotify-settings';
export const spotifySetupEvent = 'hiciarz-spotify-setup';
export type SpotifyPurpose = 'import' | 'player';

function stored(key: string) {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}
export const defaultSpotifyClientId = () => import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
export const customSpotifyClientId = () => stored(clientKey) || '';
export const spotifyClientId = () => customSpotifyClientId() || defaultSpotifyClientId();
export const spotifyRedirectUri = () => location.origin + location.pathname;
export const spotifyOnboardingEnabled = () => import.meta.env.VITE_SPOTIFY_ONBOARDING === 'true';
export const needsSpotifySetup = () =>
  !spotifyClientId() || (spotifyOnboardingEnabled() && stored(guideKey) !== spotifyClientId());

export function validateSpotifyClientId(raw: string) {
  const value = raw.trim();
  if (!/^[a-f0-9]{32}$/.test(value))
    throw new Error('Wklej Client ID z panelu Spotify: 32 małe litery a–f i cyfry.');
  return value;
}
export function acknowledgeSpotifySetup() {
  if (spotifyClientId()) localStorage.setItem(guideKey, spotifyClientId());
}
export function saveSpotifyClientId(raw: string | null) {
  const next = raw === null ? '' : validateSpotifyClientId(raw);
  const previous = spotifyClientId();
  if (next) localStorage.setItem(clientKey, next);
  else localStorage.removeItem(clientKey);
  const changed = previous !== spotifyClientId();
  if (changed) {
    sessionStorage.removeItem('spotify-token');
    sessionStorage.removeItem('spotify-oauth');
    localStorage.removeItem('hiciarz-spotify-device');
  }
  window.dispatchEvent(new Event(spotifySettingsEvent));
  if (changed) window.dispatchEvent(new Event(spotifyAccountEvent));
  return changed;
}
export function openSpotifySetup(purpose?: SpotifyPurpose) {
  window.dispatchEvent(new CustomEvent(spotifySetupEvent, { detail: { purpose } }));
}
export function spotifySetupUrl(clientId = spotifyClientId(), base = spotifyRedirectUri()) {
  return base.split(/[?#]/)[0] + '#spotify=' + validateSpotifyClientId(clientId);
}
export function isSpotifySettingsStorageKey(key: string | null) {
  return key === clientKey || key === null;
}
