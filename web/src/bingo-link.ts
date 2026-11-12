export const bingoAppOrigin = 'https://artifexet.github.io/Bingo/';

export function bingoAppUrl(language?: 'pl' | 'en'): string {
  const target = new URL(bingoAppOrigin);
  if (language) target.searchParams.set('lang', language);
  return target.href;
}

/** Move old Bingo bookmarks without forwarding card payloads, pairing codes or tokens. */
export function legacyBingoUrl(url: string): string | null {
  try {
    const source = new URL(url);
    if (source.searchParams.get('view') !== 'bingo') return null;
    const target = new URL(bingoAppOrigin);
    const allowed = {
      sheet: ['help', 'print'],
      level: ['beginner', 'expert'],
      lang: ['pl', 'en'],
    };
    for (const [key, values] of Object.entries(allowed)) {
      const value = source.searchParams.get(key);
      if (value && values.includes(value)) target.searchParams.set(key, value);
    }
    return target.href;
  } catch {
    return null;
  }
}

export function redirectLegacyBingo(): boolean {
  const target = legacyBingoUrl(location.href);
  if (!target) return false;
  // Both GitHub Pages apps share an origin. Suppress the source URL in the Referer too.
  const policy =
    document.querySelector<HTMLMetaElement>('meta[name="referrer"]') ??
    document.createElement('meta');
  policy.name = 'referrer';
  policy.content = 'no-referrer';
  document.head.append(policy);
  location.replace(target);
  return true;
}
