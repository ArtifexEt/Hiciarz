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
  if (view === 'home') next.searchParams.delete('view');
  else next.searchParams.set('view', view);
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
