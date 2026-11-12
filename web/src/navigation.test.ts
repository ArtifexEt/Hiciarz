import { describe, expect, it } from 'vitest';
import {
  navigationState,
  keepScannerPairing,
  parseAppView,
  parseEntryModal,
  parseEntryLanguage,
  parseBingoLevel,
  readNavigationState,
  urlForView,
  urlForModal,
  urlForBingoLevel,
  views,
} from './navigation';

describe('app navigation URLs', () => {
  it('reads supported views without confusing a card or pairing payload for a route', () => {
    for (const view of views)
      expect(parseAppView(`https://example.com/Hiciarz/?view=${view}`)).toBe(view);
    expect(parseAppView('https://example.com/Hiciarz/#2cs0123456789012345678901')).toBe('home');
    expect(parseAppView('https://example.com/Hiciarz/?view=scanner#pair=room-token')).toBe(
      'scanner',
    );
    expect(parseAppView('https://example.com/Hiciarz/?view=player#view=editor')).toBe('player');
  });

  it('uses home for absent, empty, unknown or malformed view URLs', () => {
    for (const url of [
      'https://example.com/Hiciarz/',
      'https://example.com/Hiciarz/?view=',
      'https://example.com/Hiciarz/?view=settings',
      'https://example.com/Hiciarz/?view=Scanner',
      'https://example.com/Hiciarz/?view=%00scanner',
      'not a URL',
    ])
      expect(parseAppView(url)).toBe('home');
  });

  it('changes only the view, preserving the deployment path, other query values and QR hash', () => {
    const original =
      'https://example.com/custom/Hiciarz/?theme=fish&label=My%20deck&view=editor#2fs0123456789012345678901';
    const next = new URL(urlForView(original, 'scanner'));
    expect(next.origin).toBe('https://example.com');
    expect(next.pathname).toBe('/custom/Hiciarz/');
    expect(next.searchParams.get('theme')).toBe('fish');
    expect(next.searchParams.get('label')).toBe('My deck');
    expect(next.searchParams.get('view')).toBe('scanner');
    expect(next.hash).toBe('#2fs0123456789012345678901');

    const home = new URL(urlForView(next.href, 'home'));
    expect(home.searchParams.has('view')).toBe(false);
    expect(home.searchParams.get('label')).toBe('My deck');
    expect(home.hash).toBe(next.hash);
  });

  it('replaces duplicate view parameters and removes them all when returning home', () => {
    const original = 'https://example.com/Hiciarz/?view=editor&view=player&source=qr#pair=room';
    const next = new URL(urlForView(original, 'bingo'));
    expect(next.searchParams.getAll('view')).toEqual(['bingo']);
    const home = new URL(urlForView(next.href, 'home'));
    expect(home.searchParams.getAll('view')).toEqual([]);
    expect(home.searchParams.get('source')).toBe('qr');
    expect(home.hash).toBe('#pair=room');
  });
});

describe('direct links from the Android app', () => {
  it('opens the Bingo generator with the requested level and language, preserving the card hash', () => {
    const url =
      'https://example.com/Hiciarz/?view=bingo&sheet=print&level=expert&lang=en#2fs0123456789012345678901';
    expect(parseAppView(url)).toBe('bingo');
    expect(parseEntryModal(url)).toBe('bingo-print');
    expect(parseBingoLevel(url)).toBe('expert');
    expect(parseEntryLanguage(url)).toBe('en');
    const changed = new URL(urlForBingoLevel(url, 'beginner'));
    expect(changed.searchParams.get('sheet')).toBe('print');
    expect(changed.searchParams.get('lang')).toBe('en');
    expect(changed.hash).toBe('#2fs0123456789012345678901');
  });

  it('supports help links but refuses unrelated or destructive dialogs', () => {
    expect(parseEntryModal('https://example.com/?view=bingo&sheet=help')).toBe('bingo-help');
    expect(parseEntryModal('https://example.com/?view=scanner&sheet=help')).toBe('help');
    for (const sheet of ['delete', 'song', 'spotify', 'print-cards', 'unknown'])
      expect(parseEntryModal(`https://example.com/?view=bingo&sheet=${sheet}`)).toBeNull();
    expect(parseEntryModal('https://example.com/?view=editor&sheet=print')).toBeNull();
  });

  it('builds a copyable generator URL and removes the sheet when switching views or closing it', () => {
    const original = 'https://example.com/Hiciarz/?view=bingo&level=expert&lang=pl';
    const generator = urlForModal(original, 'bingo', 'bingo-print');
    expect(parseEntryModal(generator)).toBe('bingo-print');
    expect(new URL(urlForView(generator, 'scanner')).searchParams.has('sheet')).toBe(false);
    expect(new URL(urlForModal(generator, 'bingo', null)).searchParams.has('sheet')).toBe(false);
    expect(parseBingoLevel(urlForModal(generator, 'bingo', null))).toBe('expert');
  });

  it('keeps defaults for malformed or unsupported external options', () => {
    for (const url of ['not a URL', 'https://example.com/?level=admin&lang=xx']) {
      expect(parseEntryModal(url)).toBeNull();
      expect(parseBingoLevel(url)).toBe('beginner');
      expect(parseEntryLanguage(url)).toBeUndefined();
    }
  });
});

describe('app navigation history state', () => {
  it('keeps the paired player when switching between Bingo and scanning, but ends it for other routes', () => {
    expect(keepScannerPairing('scanner', 'bingo')).toBe(true);
    expect(keepScannerPairing('bingo', 'scanner')).toBe(true);
    for (const view of ['home', 'editor', 'player'] as const) {
      expect(keepScannerPairing('scanner', view)).toBe(false);
      expect(keepScannerPairing('bingo', view)).toBe(false);
      expect(keepScannerPairing(view, 'scanner')).toBe(false);
    }
  });
  it('accepts only states with the app marker and a recognized modal', () => {
    expect(readNavigationState(navigationState(null, 'editor', 'song'))).toEqual({ modal: 'song' });
    expect(readNavigationState(navigationState(null, 'scanner', 'menu'))).toEqual({
      modal: 'menu',
    });
    expect(readNavigationState(navigationState(null, 'home', null))).toEqual({ modal: null });
    for (const state of [
      null,
      undefined,
      1,
      'song',
      [],
      { modal: 'song' },
      { hiciarzNavigation: 'true', modal: 'song' },
      { hiciarzNavigation: true, modal: 'unknown' },
      { hiciarzNavigation: true, modal: 'spotify' },
      { hiciarzNavigation: true, modal: 'spotify-setup' },
      { hiciarzNavigation: true },
      Object.create({ hiciarzNavigation: true, modal: 'song' }),
    ]) {
      expect(readNavigationState(state)).toEqual({ modal: null });
    }
  });

  it('preserves unrelated history fields and replaces old navigation without mutating the input', () => {
    const previous = {
      scroll: { x: 0, y: 240 },
      editorDraft: 'draft-1',
      hiciarzNavigation: false,
      view: 'player',
      modal: 'menu',
    };
    const state = navigationState(previous, 'editor', 'song');
    expect(state).toEqual({
      scroll: { x: 0, y: 240 },
      editorDraft: 'draft-1',
      hiciarzNavigation: true,
      view: 'editor',
      modal: 'song',
    });
    expect(previous).toMatchObject({ hiciarzNavigation: false, view: 'player', modal: 'menu' });
    expect(state).not.toBe(previous);
    expect(navigationState(['unrelated'], 'home', null)).toEqual({
      hiciarzNavigation: true,
      view: 'home',
      modal: null,
    });
  });
});
