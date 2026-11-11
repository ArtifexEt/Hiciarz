import { describe, expect, it } from 'vitest';
import {
  cardPlaybackSource,
  initialPlaybackOutput,
  scannerPlaybackRoute,
} from './scanner-playback';

describe('scanner playback', () => {
  it('lets a fresh installation play on its own device without pairing', () => {
    const output = initialPlaybackOutput(null, false);
    expect(output).toBe('local');
    expect(scannerPlaybackRoute(output, false)).toBe('direct');
  });

  it('preserves existing second-screen and Spotify choices after an update', () => {
    expect(initialPlaybackOutput('browser', true)).toBe('browser');
    expect(initialPlaybackOutput('spotify', false)).toBe('spotify');
    expect(initialPlaybackOutput('local', true)).toBe('local');
    expect(initialPlaybackOutput(null, true)).toBe('spotify');
    expect(initialPlaybackOutput('unsupported', false)).toBe('local');
  });

  it('requires pairing only for second-screen scans, including card links', () => {
    expect(scannerPlaybackRoute('browser', false)).toBe('pair-required');
    expect(scannerPlaybackRoute('browser', true)).toBe('peer');
    for (const output of ['local', 'spotify'] as const) {
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
