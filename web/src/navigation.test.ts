import { describe, expect, it } from 'vitest';
import {
  navigationState,
  keepScannerPairing,
  parseAppView,
  readNavigationState,
  urlForView,
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
