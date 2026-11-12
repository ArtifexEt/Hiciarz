import { describe, expect, it } from 'vitest';
import {
  cardPlaybackSource,
  initialPlaybackOutput,
  scannerPlaybackRoute,
} from './scanner-playback';

describe('scanner playback', () => {
  it('lets a fresh installation play on its own device without pairing', () => {
    const output = initialPlaybackOutput(null);
    expect(output).toBe('local');
    expect(scannerPlaybackRoute(output, false)).toBe('direct');
  });

  it('preserves second-screen playback and migrates retired Connect to local playback', () => {
    expect(initialPlaybackOutput('browser')).toBe('browser');
    expect(initialPlaybackOutput('spotify')).toBe('local');
    expect(initialPlaybackOutput('local')).toBe('local');
    expect(initialPlaybackOutput('unsupported')).toBe('local');
  });

  it('requires pairing only for second-screen scans, including card links', () => {
    expect(scannerPlaybackRoute('browser', false)).toBe('pair-required');
    expect(scannerPlaybackRoute('browser', true)).toBe('peer');
    for (const output of ['local'] as const) {
      expect(scannerPlaybackRoute(output, false)).toBe('direct');
      expect(scannerPlaybackRoute(output, true)).toBe('direct');
    }
  });

  it('uses the available source when a scanned card lacks the preferred service', () => {
    const card = {
      v: 1 as const,
      id: 'card',
      theme: 'classic' as const,
      sources: { youtube: 'video' },
    };
    expect(cardPlaybackSource(card, 'spotify')).toBe('youtube');
    const both = { ...card, sources: { youtube: 'video', spotify: 'track' } };
    expect(cardPlaybackSource(both, 'youtube')).toBe('youtube');
    expect(cardPlaybackSource(both, 'spotify')).toBe('spotify');
    expect(cardPlaybackSource({ ...card, sources: { spotify: 'track' } }, 'youtube')).toBe(
      'spotify',
    );
  });
});
