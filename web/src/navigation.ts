export const views = ['home', 'scanner', 'editor', 'bingo', 'player'] as const;
export type AppView = (typeof views)[number];

/** Bingo and the scanner are two views of the same round on the scanning phone. */
export function keepScannerPairing(from: AppView, to: AppView): boolean {
  return (from === 'scanner' || from === 'bingo') && (to === 'scanner' || to === 'bingo');
}

export const modalNames = [
  'song',
  'spotify',
  'spotify-setup',
  'print-cards',
  'examples',
  'file',
  'help',
  'about',
  'delete',
  'check',
  'prompt',
  'menu',
  'playback',
  'bingo-help',
  'bingo-print',
] as const;
export type AppModal = (typeof modalNames)[number] | null;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** QR payloads stay in the hash; the current app view has its own query parameter. */
export function parseAppView(url: string): AppView {
  try {
    const value = new URL(url).searchParams.get('view');
    return views.includes(value as AppView) ? (value as AppView) : 'home';
  } catch {
    return 'home';
  }
}

export function urlForView(url: string, view: AppView): string {
  const next = new URL(url);
  next.searchParams.delete('sheet');
  if (view === 'home') next.searchParams.delete('view');
  else next.searchParams.set('view', view);
  return next.href;
}

/** Only safe, non-destructive help and Bingo PDF entry points can open from a link. */
export function parseEntryModal(url: string): AppModal {
  try {
    const sheet = new URL(url).searchParams.get('sheet');
    const view = parseAppView(url);
    if (sheet === 'print' && view === 'bingo') return 'bingo-print';
    if (sheet === 'help') return view === 'bingo' ? 'bingo-help' : 'help';
  } catch {
    /* Invalid external links use the normal view. */
  }
  return null;
}

export function parseBingoLevel(url: string): 'beginner' | 'expert' {
  try {
    return new URL(url).searchParams.get('level') === 'expert' ? 'expert' : 'beginner';
  } catch {
    return 'beginner';
  }
}

export function parseEntryLanguage(url: string): 'pl' | 'en' | undefined {
  try {
    const value = new URL(url).searchParams.get('lang');
    if (value === 'pl' || value === 'en') return value;
  } catch {
    /* Keep the saved language for malformed links. */
  }
  return undefined;
}

export function urlForModal(url: string, view: AppView, modal: AppModal): string {
  const next = new URL(urlForView(url, view));
  if (view === 'bingo' && modal === 'bingo-print') next.searchParams.set('sheet', 'print');
  else if (modal === 'help' || (view === 'bingo' && modal === 'bingo-help'))
    next.searchParams.set('sheet', 'help');
  return next.href;
}

export function urlForBingoLevel(url: string, level: 'beginner' | 'expert'): string {
  const next = new URL(url);
  next.searchParams.set('level', level);
  return next.href;
}

export function readNavigationState(state: unknown): { modal: AppModal } {
  const value = record(state);
  if (
    !value ||
    !Object.prototype.hasOwnProperty.call(value, 'hiciarzNavigation') ||
    value.hiciarzNavigation !== true
  )
    return { modal: null };
  const modal = value.modal;
  return {
    modal: modalNames.includes(modal as (typeof modalNames)[number]) ? (modal as AppModal) : null,
  };
}

/** Keep state owned by another feature while replacing this app's navigation fields. */
export function navigationState(
  previous: unknown,
  view: AppView,
  modal: AppModal,
): Record<string, unknown> & { hiciarzNavigation: true; view: AppView; modal: AppModal } {
  return { ...record(previous), hiciarzNavigation: true, view, modal };
}
