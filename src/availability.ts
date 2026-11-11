import { t as translate } from './i18n';
import type { Song } from './model';
export type SourceCheck = {
  songId: string;
  source: 'spotify' | 'youtube';
  state: 'metadata' | 'unavailable' | 'unknown';
  message: string;
};
export async function checkSources(
  songs: Song[],
  onProgress: (n: number) => void,
): Promise<SourceCheck[]> {
  const tasks = songs.flatMap((song) =>
    (['spotify', 'youtube'] as const)
      .filter((source) => song.sources[source])
      .map((source) => ({ song, source })),
  );
  const results: SourceCheck[] = [];
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const { song, source } = tasks[next++];
      const media =
        source === 'spotify'
          ? `https://open.spotify.com/track/${song.sources.spotify}`
          : `https://www.youtube.com/watch?v=${song.sources.youtube}`;
      const endpoint =
        source === 'spotify' ? 'https://open.spotify.com/oembed' : 'https://www.youtube.com/oembed';
      try {
        const r = await fetch(`${endpoint}?url=${encodeURIComponent(media)}&format=json`, {
          signal: AbortSignal.timeout(10000),
          credentials: 'omit',
        });
        const state = r.ok
          ? 'metadata'
          : r.status === 404 || r.status === 410
            ? 'unavailable'
            : 'unknown';
        results.push({
          songId: song.id,
          source,
          state,
          message:
            state === 'metadata'
              ? translate('availability.metadata')
              : state === 'unavailable'
                ? translate('availability.unavailable')
                : translate('availability.unknown'),
        });
      } catch {
        results.push({
          songId: song.id,
          source,
          state: 'unknown',
          message: translate('availability.noResponse'),
        });
      }
      onProgress(results.length);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return results;
}
