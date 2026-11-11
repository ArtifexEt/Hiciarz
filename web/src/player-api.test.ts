import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const scripts: Array<{
  src: string;
  onerror: null | (() => void);
  remove: ReturnType<typeof vi.fn>;
}> = [];

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  scripts.length = 0;
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', { languages: ['pl'] });
  vi.stubGlobal('localStorage', { getItem: () => 'pl' });
  vi.stubGlobal('document', {
    createElement: () => ({ src: '', onerror: null, remove: vi.fn() }),
    head: { append: (script: (typeof scripts)[number]) => scripts.push(script) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('shared iframe API loading', () => {
  it('shares a pending Spotify script and keeps the resolved API for later players', async () => {
    const { loadSpotifyAPI } = await import('./Players');
    const first = loadSpotifyAPI();
    expect(loadSpotifyAPI()).toBe(first);
    expect(scripts).toHaveLength(1);
    const api = { createController: vi.fn() };
    window.onSpotifyIframeApiReady?.(api);
    await expect(first).resolves.toBe(api);
    expect(loadSpotifyAPI()).toBe(first);
    expect(scripts[0].remove).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects a stalled Spotify script and lets retry create a fresh request', async () => {
    const { loadSpotifyAPI } = await import('./Players');
    const first = loadSpotifyAPI();
    const rejection = expect(first).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(20000);
    await rejection;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
    const retry = loadSpotifyAPI();
    expect(retry).not.toBe(first);
    expect(scripts).toHaveLength(2);
    const api = { createController: vi.fn() };
    window.onSpotifyIframeApiReady?.(api);
    await expect(retry).resolves.toBe(api);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recovers from a failed YouTube script and reuses an available YouTube API', async () => {
    const { loadYouTubeAPI } = await import('./Players');
    const first = loadYouTubeAPI();
    expect(loadYouTubeAPI()).toBe(first);
    const rejection = expect(first).rejects.toThrow();
    scripts[0].onerror?.();
    await rejection;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
    const retry = loadYouTubeAPI();
    expect(scripts).toHaveLength(2);
    const api = { Player: vi.fn() };
    window.YT = api;
    window.onYouTubeIframeAPIReady?.();
    await expect(retry).resolves.toBe(api);
    await expect(loadYouTubeAPI()).resolves.toBe(api);
    expect(scripts).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
