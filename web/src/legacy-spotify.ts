type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Retire the old OAuth connection without touching saved decks or track sources. */
export function clearLegacySpotifySettings(local: Store, session: Store): boolean {
  const hadOAuth = Boolean(session.getItem('spotify-oauth'));
  for (const key of [
    'spotify-oauth',
    'spotify-token',
    'spotify-import-mode',
    'spotify-import-playlist',
    'hiciarz-spotify-return-mode',
  ])
    session.removeItem(key);
  for (const key of [
    'hiciarz-spotify-client-id',
    'hiciarz-spotify-guide',
    'hiciarz-spotify-device',
  ])
    local.removeItem(key);
  if (local.getItem('hiciarz-output') === 'spotify') local.setItem('hiciarz-output', 'local');
  return hadOAuth;
}
