import { t } from './i18n';
import { spotifyId } from './model';

export type SpotifyTrackMetadata = { id: string; title: string };
export type SpotifyTrackDetails = SpotifyTrackMetadata & {
  matchedRecording?: RecordingSuggestion;
  suggestions: RecordingSuggestion[];
  lookupError?: string;
};
export type RecordingSuggestion = {
  id: string;
  title: string;
  artist: string;
  year?: number;
  disambiguation: string;
  duration?: number;
};

const requestTimeout = 12000;
const recordingId = /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
let musicBrainzQueue = Promise.resolve();
let nextMusicBrainzStart = 0;
let musicBrainzBlockedUntil = 0;

function aborted() {
  return new DOMException('The request was aborted.', 'AbortError');
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw aborted();
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  checkAbort(signal);
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(aborted());
    };
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

/** A queued request can be cancelled immediately, before an earlier request finishes. */
function withAbort<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return request;
  return new Promise((resolve, reject) => {
    const cancel = () => reject(aborted());
    if (signal.aborted) cancel();
    else signal.addEventListener('abort', cancel, { once: true });
    request.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}

function retryAfter(response: Response) {
  const value = response.headers.get('Retry-After');
  if (!value) return 0;
  const seconds = Number(value);
  const date = Number.isFinite(seconds)
    ? Date.now() + Math.max(0, seconds) * 1000
    : Date.parse(value);
  return Number.isFinite(date) ? date : 0;
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function requestJson(
  url: string,
  service: 'Spotify' | 'MusicBrainz',
  signal?: AbortSignal,
  allowMissing = false,
) {
  checkAbort(signal);
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, requestTimeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    });
    checkAbort(signal);
    if (allowMissing && response.status === 404) return {};
    if (response.status === 429) {
      if (service === 'MusicBrainz')
        musicBrainzBlockedUntil = Math.max(Date.now() + 1000, retryAfter(response));
      throw new Error(t('trackMetadata.rateLimit', { service }));
    }
    if (!response.ok) {
      if (service === 'MusicBrainz' && response.status === 503) {
        musicBrainzBlockedUntil = Math.max(Date.now() + 1100, retryAfter(response));
        throw Object.assign(new Error(t('trackMetadata.unavailable', { service })), {
          status: 503,
        });
      }
      throw new Error(t('trackMetadata.unavailable', { service }));
    }
    const result: unknown = await response.json();
    checkAbort(signal);
    return object(result);
  } catch (error) {
    checkAbort(signal);
    if (timedOut) throw new Error(t('trackMetadata.timeout', { service }));
    if (error instanceof TypeError || error instanceof SyntaxError)
      throw new Error(t('trackMetadata.network', { service }));
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function requestMusicBrainz(url: string, signal?: AbortSignal, allowMissing = false) {
  const request = musicBrainzQueue.then(async () => {
    checkAbort(signal);
    if (Date.now() < musicBrainzBlockedUntil)
      throw new Error(t('trackMetadata.rateLimit', { service: 'MusicBrainz' }));
    for (let attempt = 0; ; attempt++) {
      await wait(Math.max(0, nextMusicBrainzStart - Date.now()), signal);
      checkAbort(signal);
      nextMusicBrainzStart = Date.now() + 1000;
      try {
        return await requestJson(url, 'MusicBrainz', signal, allowMissing);
      } catch (error) {
        // A transient busy response may recover once. Long Retry-After windows and
        // rate limits stay visible immediately so manual entry remains available.
        const delay = Math.max(1100, musicBrainzBlockedUntil - Date.now());
        if (
          attempt > 0 ||
          !(error instanceof Error) ||
          !('status' in error) ||
          error.status !== 503 ||
          delay > 5000
        )
          throw error;
        await wait(delay, signal);
      }
    }
  });
  musicBrainzQueue = request.then(
    () => undefined,
    () => undefined,
  );
  return withAbort(request, signal);
}

/** Only the plain title is consumed; Spotify's supplied iframe HTML is never inserted. */
export async function loadSpotifyTrack(
  raw: string,
  signal?: AbortSignal,
): Promise<SpotifyTrackMetadata> {
  checkAbort(signal);
  const id = spotifyId(raw);
  const url = new URL('https://open.spotify.com/oembed');
  url.searchParams.set('url', `https://open.spotify.com/track/${id}`);
  const data = await requestJson(url.href, 'Spotify', signal);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title || title.length > 200) throw new Error(t('trackMetadata.missingTitle'));
  return { id, title };
}

function literal(value: string) {
  return value.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, '\\$&');
}

function firstReleaseYear(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (year < 1000 || year > 2100) return undefined;
  if (match[2]) {
    const month = Number(match[2]);
    if (month < 1 || month > 12) return undefined;
    if (match[3]) {
      const day = Number(match[3]);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
    }
  }
  return year;
}

function suggestion(raw: unknown): RecordingSuggestion | undefined {
  const data = object(raw);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const artist = Array.isArray(data['artist-credit'])
    ? data['artist-credit']
        .map((credit: unknown) => {
          const value = object(credit);
          const name = value.name || object(value.artist).name;
          return typeof name === 'string'
            ? name + (typeof value.joinphrase === 'string' ? value.joinphrase : '')
            : '';
        })
        .join('')
        .trim()
    : '';
  if (
    typeof data.id !== 'string' ||
    !recordingId.test(data.id) ||
    !title ||
    title.length > 200 ||
    !artist ||
    artist.length > 200
  )
    return undefined;
  const year = firstReleaseYear(data['first-release-date']);
  return {
    id: data.id,
    title,
    artist,
    ...(year !== undefined ? { year } : {}),
    disambiguation: typeof data.disambiguation === 'string' ? data.disambiguation.trim() : '',
    ...(typeof data.length === 'number' && Number.isFinite(data.length) && data.length > 0
      ? { duration: data.length }
      : {}),
  };
}

export async function findRecordingSuggestions(
  title: string,
  artist = '',
  signal?: AbortSignal,
): Promise<RecordingSuggestion[]> {
  checkAbort(signal);
  title = title.trim();
  artist = artist.trim();
  if (!title) return [];
  if (title.length > 200 || artist.length > 200) throw new Error(t('trackMetadata.searchTooLong'));
  const url = new URL('https://musicbrainz.org/ws/2/recording/');
  url.searchParams.set(
    'query',
    `recording:"${literal(title)}"${artist ? ` AND artist:"${literal(artist)}"` : ''}`,
  );
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', '100');

  const data = await requestMusicBrainz(url.href, signal);
  return recordingSuggestions(data);
}

function recordingSuggestions(data: Record<string, unknown>) {
  if (!Array.isArray(data.recordings)) throw new Error(t('trackMetadata.invalidRecordings'));
  const seen = new Set<string>();
  return (
    data.recordings
      .slice(0, 100)
      .flatMap((raw: unknown, index: number) => {
        const value = suggestion(raw);
        if (!value || seen.has(value.id)) return [];
        seen.add(value.id);
        const rawScore = object(raw).score;
        const score =
          typeof rawScore === 'string' || typeof rawScore === 'number' ? Number(rawScore) : 0;
        return [
          {
            value,
            index,
            score: Number.isFinite(score) && score >= 0 && score <= 100 ? score : 0,
          },
        ];
      })
      // MusicBrainz often returns later live versions before an equally relevant
      // original. Prefer its relevance score first, then earlier known releases.
      // These remain choices for the user; no candidate is selected automatically.
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.value.year ?? Infinity) - (b.value.year ?? Infinity) ||
          a.index - b.index,
      )
      .slice(0, 8)
      .map(({ value }) => value)
  );
}

/** A direct recording relationship verifies the Spotify source; a title search does not. */
export async function loadSpotifyTrackDetails(
  raw: string,
  signal?: AbortSignal,
  onSpotifyMetadata?: (metadata: SpotifyTrackMetadata) => void,
): Promise<SpotifyTrackDetails> {
  const metadata = await loadSpotifyTrack(raw, signal);
  checkAbort(signal);
  onSpotifyMetadata?.(metadata);
  try {
    const resource = `https://open.spotify.com/track/${metadata.id}`;
    const lookup = new URL('https://musicbrainz.org/ws/2/url');
    lookup.searchParams.set('resource', resource);
    lookup.searchParams.set('inc', 'recording-rels');
    lookup.searchParams.set('fmt', 'json');
    const data = await requestMusicBrainz(lookup.href, signal, true);
    const ids = new Set<string>();
    if (Array.isArray(data.relations)) {
      for (const rawRelation of data.relations) {
        const relation = object(rawRelation);
        const id = object(relation.recording).id;
        if (
          relation['target-type'] === 'recording' &&
          typeof id === 'string' &&
          recordingId.test(id)
        )
          ids.add(id);
      }
    }
    if (ids.size) {
      const recordings = new URL('https://musicbrainz.org/ws/2/recording/');
      recordings.searchParams.set('query', [...ids].map((id) => `rid:${id}`).join(' OR '));
      recordings.searchParams.set('fmt', 'json');
      recordings.searchParams.set('limit', '100');
      const linked = recordingSuggestions(await requestMusicBrainz(recordings.href, signal)).filter(
        (recording) => ids.has(recording.id),
      );
      if (ids.size === 1 && linked.length === 1)
        return { ...metadata, matchedRecording: linked[0], suggestions: [] };
      if (linked.length) return { ...metadata, suggestions: linked };
    }
  } catch (error) {
    checkAbort(signal);
    // Direct Spotify relationships are sparse and their lookup is optional.
    // A failed URL lookup must not prevent the independent title search.
  }
  try {
    return {
      ...metadata,
      suggestions: await findRecordingSuggestions(metadata.title, '', signal),
    };
  } catch (error) {
    checkAbort(signal);
    return { ...metadata, suggestions: [], lookupError: (error as Error).message };
  }
}

export function spotifySearchUrl(query: string): string {
  const term = query.trim();
  return 'https://open.spotify.com/search' + (term ? '/' + encodeURIComponent(term) : '');
}
