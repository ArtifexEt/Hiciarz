export const views = ['home', 'scanner', 'editor', 'player'] as const;
export type AppView = (typeof views)[number];

/** Keep a scanner session only while staying on the scanner route. */
export function keepScannerPairing(from: AppView, to: AppView): boolean {
  return from === 'scanner' && to === 'scanner';
}

export const modalNames = [
  'song',
  'decks',
  'print-cards',
  'examples',
  'import',
  'file',
  'help',
  'about',
  'delete',
  'check',
  'prompt',
  'menu',
  'playback',
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

/** Only the non-destructive help entry point can open from a link. */
export function parseEntryModal(url: string): AppModal {
  try {
    const sheet = new URL(url).searchParams.get('sheet');
    if (sheet === 'help') return 'help';
  } catch {
    /* Invalid external links use the normal view. */
  }
  return null;
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
  if (modal === 'help') next.searchParams.set('sheet', 'help');
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
