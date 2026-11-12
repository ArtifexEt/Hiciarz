import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let metadata: typeof import('./track-metadata');
let fetchMock: ReturnType<typeof vi.fn>;
const trackId = '0GjEhVFGZW8afUYGChu3Rr';
const mbid = '026fa041-3917-4c73-9079-ed16e36f20f8';

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), { status, headers });
}

function recording(patch: Record<string, unknown> = {}) {
  return {
    id: mbid,
    title: 'Dancing Queen',
    'artist-credit': [{ name: 'ABBA', artist: { name: 'ABBA' } }],
    'first-release-date': '1976-08-16',
    length: 230000,
    disambiguation: 'original studio recording',
    ...patch,
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  metadata = await import('./track-metadata');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('public Spotify track metadata', () => {
  it('canonicalizes shared links and consumes only the plain title, never iframe HTML', async () => {
    fetchMock.mockResolvedValue(
      json({
        title: '  Dancing Queen  ',
        html: '<script>alert(1)</script>',
        author_name: 'An unrelated author',
      }),
    );
    await expect(
      metadata.loadSpotifyTrack(`https://open.spotify.com/intl-pl/track/${trackId}?si=shared`),
    ).resolves.toEqual({ id: trackId, title: 'Dancing Queen' });
    const [raw, options] = fetchMock.mock.calls[0];
    const request = new URL(raw);
    expect(request.origin + request.pathname).toBe('https://open.spotify.com/oembed');
    expect(request.searchParams.get('url')).toBe(`https://open.spotify.com/track/${trackId}`);
    expect(options.credentials).toBe('omit');
    expect(options.headers).not.toHaveProperty('Authorization');
  });

  it('accepts a Spotify URI but never interprets a title as an artist', async () => {
    fetchMock.mockResolvedValue(json({ title: 'Artist - Title' }));
    await expect(metadata.loadSpotifyTrack(`spotify:track:${trackId}`)).resolves.toEqual({
      id: trackId,
      title: 'Artist - Title',
    });
  });

  it.each([
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    `https://open.spotify.com.evil.example/track/${trackId}`,
    'javascript:alert(1)',
    'https://spotify.link/a-short-link',
  ])('rejects unsupported or unsafe input without making a request: %s', async (raw) => {
    await expect(metadata.loadSpotifyTrack(raw)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('leaves manual entry available when metadata is missing or malformed', async () => {
    fetchMock.mockResolvedValueOnce(json({ html: '<iframe></iframe>' }));
    await expect(metadata.loadSpotifyTrack(trackId)).rejects.toThrow('Wpisz go ręcznie');
    fetchMock.mockResolvedValueOnce(new Response('not json'));
    await expect(metadata.loadSpotifyTrack(trackId)).rejects.toThrow('Sprawdź połączenie');
  });

  it('distinguishes rate limits and unreachable metadata', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 429));
    await expect(metadata.loadSpotifyTrack(trackId)).rejects.toThrow('Spotify ogranicza');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(metadata.loadSpotifyTrack(trackId)).rejects.toThrow('Sprawdź połączenie');
  });

  it('aborts a stale request and preserves AbortError for the form to ignore', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = metadata.loadSpotifyTrack(trackId, controller.signal);
    const result = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await result;
  });

  it('cancels requests that exceed the timeout', async () => {
    fetchMock.mockImplementation(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = metadata.loadSpotifyTrack(trackId);
    const result = expect(request).rejects.toThrow('nie odpowiedział na czas');
    await vi.advanceTimersByTimeAsync(12000);
    await result;
  });
});

describe('MusicBrainz recording suggestions', () => {
  it('returns separate recording versions without choosing the first as the correct release', async () => {
    fetchMock.mockResolvedValue(
      json({
        recordings: [
          recording({ 'first-release-date': '1986', disambiguation: 'live' }),
          recording({ id: 'a26fa041-3917-4c73-9079-ed16e36f20f8' }),
        ],
      }),
    );
    await expect(metadata.findRecordingSuggestions('Dancing Queen', 'ABBA')).resolves.toEqual([
      {
        id: 'a26fa041-3917-4c73-9079-ed16e36f20f8',
        title: 'Dancing Queen',
        artist: 'ABBA',
        year: 1976,
        disambiguation: 'original studio recording',
        duration: 230000,
      },
      {
        id: mbid,
        title: 'Dancing Queen',
        artist: 'ABBA',
        year: 1986,
        disambiguation: 'live',
        duration: 230000,
      },
    ]);
    const request = new URL(fetchMock.mock.calls[0][0]);
    expect(request.searchParams.get('query')).toBe('recording:"Dancing Queen" AND artist:"ABBA"');
    expect(request.searchParams.get('limit')).toBe('100');
    expect(request.searchParams.get('fmt')).toBe('json');
  });

  it('surfaces an original after 48 newer versions with the same relevance score in one request', async () => {
    const newer = Array.from({ length: 48 }, (_, index) =>
      recording({
        id: `${String(index).padStart(8, '0')}-3917-4c73-9079-ed16e36f20f8`,
        score: '100',
        'first-release-date': String(1980 + index),
        disambiguation: `live version ${index + 1}`,
      }),
    );
    fetchMock.mockResolvedValue(
      json({
        recordings: [
          ...newer,
          recording({ score: '100', disambiguation: 'single/LP/12″ version' }),
        ],
      }),
    );
    const result = await metadata.findRecordingSuggestions('Dancing Queen', 'ABBA');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toHaveLength(8);
    expect(result[0]).toMatchObject({
      id: mbid,
      year: 1976,
      disambiguation: 'single/LP/12″ version',
    });
    expect(result[1]).toMatchObject({ year: 1980, disambiguation: 'live version 1' });
    expect(result[0]).not.toHaveProperty('selected');
  });

  it('ranks API relevance before age, places undated equal-score versions last, and keeps ties stable', async () => {
    const differentArtist = '126fa041-3917-4c73-9079-ed16e36f20f8';
    const undated = '226fa041-3917-4c73-9079-ed16e36f20f8';
    const tied = '326fa041-3917-4c73-9079-ed16e36f20f8';
    fetchMock.mockResolvedValue(
      json({
        recordings: [
          recording({
            id: differentArtist,
            score: '90',
            'first-release-date': '1950',
            'artist-credit': [{ name: 'Wrong performer' }],
          }),
          recording({ id: undated, score: '100', 'first-release-date': undefined }),
          recording({ score: '100', disambiguation: 'first equal-score version' }),
          recording({ id: tied, score: 100, disambiguation: 'second equal-score version' }),
        ],
      }),
    );
    const result = await metadata.findRecordingSuggestions('Dancing Queen', 'ABBA');
    expect(result.map((value) => value.id)).toEqual([mbid, tied, undated, differentArtist]);
    expect(result[2]).not.toHaveProperty('year');
    expect(result[3].artist).toBe('Wrong performer');
  });

  it('escapes Lucene operators so pasted titles cannot broaden the query', async () => {
    fetchMock.mockResolvedValue(json({ recordings: [] }));
    await metadata.findRecordingSuggestions('Title" OR artist:*', 'AC/DC');
    const query = new URL(fetchMock.mock.calls[0][0]).searchParams.get('query');
    expect(query).toBe('recording:"Title\\" OR artist\\:\\*" AND artist:"AC\\/DC"');
  });

  it('uses credited artist names and join phrases without changing the supplied title', async () => {
    fetchMock.mockResolvedValue(
      json({
        recordings: [
          recording({
            title: '<live> & acoustic',
            'artist-credit': [
              { name: 'First', joinphrase: ' feat. ', artist: { name: 'Canonical first' } },
              { artist: { name: 'Second' } },
            ],
          }),
        ],
      }),
    );
    const result = await metadata.findRecordingSuggestions('live');
    expect(result[0].title).toBe('<live> & acoustic');
    expect(result[0].artist).toBe('First feat. Second');
  });

  it.each([undefined, '', 'Unknown', '999', '0000', '9999', '1976-13', '1976-02-30', '1976-01-00'])(
    'never fabricates a year from an absent or invalid first release date: %s',
    async (date) => {
      fetchMock.mockResolvedValue(
        json({
          recordings: [
            recording({
              'first-release-date': date,
              releases: [{ date: '2020-01-01' }],
            }),
          ],
        }),
      );
      const result = await metadata.findRecordingSuggestions('Dancing Queen');
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('year');
    },
  );

  it('skips malformed records, removes duplicate IDs, and caps suggestions at eight', async () => {
    const valid = Array.from({ length: 10 }, (_, index) =>
      recording({
        id: `${String(index).padStart(8, '0')}-3917-4c73-9079-ed16e36f20f8`,
      }),
    );
    fetchMock.mockResolvedValue(
      json({
        recordings: [
          null,
          {},
          recording({ id: 'javascript:alert(1)' }),
          recording({ 'artist-credit': [] }),
          ...valid,
          valid[0],
        ],
      }),
    );
    const result = await metadata.findRecordingSuggestions('Dancing Queen');
    expect(result).toHaveLength(8);
    expect(new Set(result.map((value) => value.id)).size).toBe(8);
  });

  it('does not call the API for an empty search or an already aborted signal', async () => {
    await expect(metadata.findRecordingSuggestions('   ')).resolves.toEqual([]);
    await expect(
      metadata.findRecordingSuggestions('x', '', AbortSignal.abort()),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('spaces MusicBrainz requests by at least one second', async () => {
    const times: number[] = [];
    fetchMock.mockImplementation(async () => {
      times.push(Date.now());
      return json({ recordings: [] });
    });
    const first = metadata.findRecordingSuggestions('First');
    const second = metadata.findRecordingSuggestions('Second');
    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
  });

  it('cancels a queued search before it sends a request and lets a later search continue', async () => {
    fetchMock.mockImplementation(async () => json({ recordings: [] }));
    await metadata.findRecordingSuggestions('First');
    const controller = new AbortController();
    const second = metadata.findRecordingSuggestions('Stale', '', controller.signal);
    const rejected = expect(second).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    const third = metadata.findRecordingSuggestions('Current');
    await vi.advanceTimersByTimeAsync(1000);
    await third;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('query')).toContain('Current');
  });

  it('honors Retry-After without retrying or blocking manual entry', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 429, { 'Retry-After': '60' }));
    await expect(metadata.findRecordingSuggestions('First')).rejects.toThrow(
      'MusicBrainz ogranicza',
    );
    await expect(metadata.findRecordingSuggestions('Second')).rejects.toThrow(
      'MusicBrainz ogranicza',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);
    fetchMock.mockResolvedValueOnce(json({ recordings: [] }));
    await expect(metadata.findRecordingSuggestions('Third')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a transient busy service once after its short Retry-After window', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 503, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(json({ recordings: [recording()] }));
    const request = metadata.findRecordingSuggestions('Dancing Queen');
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await request).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not wait through a long busy window or retry indefinitely', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503, { 'Retry-After': '60' }));
    await expect(metadata.findRecordingSuggestions('Dancing Queen')).rejects.toThrow(
      'nie udostępnił danych',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000);
    fetchMock.mockResolvedValue(json({}, 503));
    const request = metadata.findRecordingSuggestions('Dancing Queen');
    const rejected = expect(request).rejects.toThrow('nie udostępnił danych');
    await vi.advanceTimersByTimeAsync(1100);
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('MusicBrainz recording Spotify links', () => {
  function relation(resource: unknown, targetType = 'url') {
    return { 'target-type': targetType, url: { resource } };
  }

  it('looks up recording URL relationships and canonicalizes distinct track links in source order', async () => {
    const secondTrack = '4uLU6hMCjMI75M1A2tKUQC';
    fetchMock.mockResolvedValue(
      json({
        id: mbid,
        relations: [
          relation(`https://open.spotify.com/track/${trackId}?si=shared#fragment`),
          relation(`https://open.spotify.com/intl-pl/track/${secondTrack}/?si=shared`),
          relation(`https://open.spotify.com/track/${trackId}`),
        ],
      }),
    );
    await expect(metadata.loadRecordingSpotifyLinks(` ${mbid.toUpperCase()} `)).resolves.toEqual({
      links: [
        `https://open.spotify.com/track/${trackId}`,
        `https://open.spotify.com/track/${secondTrack}`,
      ],
      source: 'musicbrainz',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = new URL(fetchMock.mock.calls[0][0]);
    expect(request.origin + request.pathname).toBe(
      `https://musicbrainz.org/ws/2/recording/${mbid}`,
    );
    expect(request.searchParams.get('inc')).toBe('url-rels');
    expect(request.searchParams.get('fmt')).toBe('json');
  });

  it.each([{}, { relations: [] }, { relations: null }, { relations: {} }])(
    'returns no links when the recording has no usable URL relationships: %j',
    async (response) => {
      fetchMock.mockResolvedValueOnce(json(response)).mockResolvedValueOnce(json([]));
      await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
        links: [],
        source: 'listenbrainz',
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('ignores unrelated, malformed and unsafe resources instead of following or returning them', async () => {
    fetchMock.mockResolvedValue(
      json({
        relations: [
          null,
          {},
          relation(`https://open.spotify.com/track/${trackId}`, 'recording'),
          relation(`https://open.spotify.com/album/${trackId}`),
          relation(`https://open.spotify.com/artist/${trackId}`),
          relation(`https://open.spotify.com/episode/${trackId}`),
          relation(`https://open.spotify.com/show/${trackId}`),
          relation(`https://open.spotify.com/playlist/${trackId}`),
          relation(`https://open.spotify.com.evil.example/track/${trackId}`),
          relation(`https://open.spotify.com@evil.example/track/${trackId}`),
          relation(`https://evil.example@open.spotify.com/track/${trackId}`),
          relation(`https://user:password@open.spotify.com/track/${trackId}`),
          relation(`http://open.spotify.com/track/${trackId}`),
          relation(`https://open.spotify.com:444/track/${trackId}`),
          relation(`https://open.spotify.com/prefix/track/${trackId}`),
          relation(`https://open.spotify.com/track/${trackId}/extra`),
          relation(`https://open.spotify.com/track/${trackId.slice(1)}`),
          relation(`spotify:track:${trackId}`),
          relation(trackId),
          relation('javascript:alert(1)'),
          relation(null),
          relation({ resource: `https://open.spotify.com/track/${trackId}` }),
          relation(`https://open.spotify.com/track/${trackId}`),
        ],
      }),
    );
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
      links: [`https://open.spotify.com/track/${trackId}`],
      source: 'musicbrainz',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    '',
    'not-an-mbid',
    '026fa041-3917-4c73-9079-ed16e36f20f8/extra',
    `https://musicbrainz.org/recording/${mbid}`,
  ])('rejects invalid recording IDs before HTTP: %s', async (id) => {
    await expect(metadata.loadRecordingSpotifyLinks(id)).rejects.toThrow(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shares spacing and cancellation with recording searches without sending a stale lookup', async () => {
    fetchMock.mockImplementation(async (raw: string) =>
      json(
        new URL(raw).searchParams.has('query')
          ? { recordings: [] }
          : {
              relations: [relation(`https://open.spotify.com/track/${trackId}`)],
            },
      ),
    );
    await metadata.findRecordingSuggestions('First');
    const controller = new AbortController();
    const stale = metadata.loadRecordingSpotifyLinks(mbid, controller.signal);
    const rejected = expect(stale).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    const current = metadata.loadRecordingSpotifyLinks(mbid);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(current).resolves.toEqual({
      links: [`https://open.spotify.com/track/${trackId}`],
      source: 'musicbrainz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('cancels an in-flight lookup and preserves AbortError', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = metadata.loadRecordingSpotifyLinks(mbid, controller.signal);
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await rejected;
    expect(fetchMock).toHaveBeenCalledOnce();
    await expect(
      metadata.loadRecordingSpotifyLinks(mbid, AbortSignal.abort()),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('honors the shared rate-limit window and bounded busy retry', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 429, { 'Retry-After': '10' }));
    await expect(metadata.findRecordingSuggestions('Dancing Queen')).rejects.toThrow(
      'MusicBrainz ogranicza',
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockResolvedValueOnce(json([]));
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
      links: [],
      source: 'listenbrainz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(fetchMock.mock.calls[1][0]).hostname).toBe('labs.api.listenbrainz.org');
    await vi.advanceTimersByTimeAsync(10000);
    fetchMock
      .mockResolvedValueOnce(json({}, 503, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(
        json({ relations: [relation(`https://open.spotify.com/track/${trackId}`)] }),
      );
    const request = metadata.loadRecordingSpotifyLinks(mbid);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toEqual({
      links: [`https://open.spotify.com/track/${trackId}`],
      source: 'musicbrainz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('falls back to one credential-free Labs POST and accepts IDs only for the requested recording', async () => {
    const secondTrack = '4uLU6hMCjMI75M1A2tKUQC';
    fetchMock.mockResolvedValueOnce(json({ relations: [] })).mockResolvedValueOnce(
      json([
        {
          recording_mbid: '126fa041-3917-4c73-9079-ed16e36f20f8',
          spotify_track_ids: [secondTrack],
        },
        null,
        {
          recording_mbid: mbid.toUpperCase(),
          spotify_track_ids: [
            trackId,
            trackId,
            'short',
            null,
            42,
            `https://open.spotify.com/track/${secondTrack}`,
            `spotify:track:${secondTrack}`,
          ],
        },
        { recording_mbid: mbid, spotify_track_ids: [secondTrack] },
      ]),
    );
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
      links: [
        `https://open.spotify.com/track/${trackId}`,
        `https://open.spotify.com/track/${secondTrack}`,
      ],
      source: 'listenbrainz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [raw, options] = fetchMock.mock.calls[1];
    expect(raw).toBe('https://labs.api.listenbrainz.org/spotify-id-from-mbid/json');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual([{ recording_mbid: mbid }]);
    expect(options.credentials).toBe('omit');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers).not.toHaveProperty('Authorization');
  });

  it('uses Labs independently after a failed optional MusicBrainz lookup', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(json([{ recording_mbid: mbid, spotify_track_ids: [trackId] }]));
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
      links: [`https://open.spotify.com/track/${trackId}`],
      source: 'listenbrainz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      mapping: [
        { recording_mbid: '126fa041-3917-4c73-9079-ed16e36f20f8', spotify_track_ids: [trackId] },
      ],
    },
    { mapping: [{ recording_mbid: mbid, spotify_track_ids: null }] },
    {
      mapping: [{ recording_mbid: mbid, spotify_track_ids: ['short', '', null, { id: trackId }] }],
    },
  ])('does not turn mismatched or malformed mapping fields into links: %j', async ({ mapping }) => {
    fetchMock.mockResolvedValueOnce(json({})).mockResolvedValueOnce(json(mapping));
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
      links: [],
      source: 'listenbrainz',
    });
  });

  it('does not treat ended recording URLs as current links or suppress Labs fallback', async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          relations: [{ ...relation(`https://open.spotify.com/track/${trackId}`), ended: true }],
        }),
      )
      .mockResolvedValueOnce(json([]));
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).resolves.toEqual({
      links: [],
      source: 'listenbrainz',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([{}, null, 'unexpected response'])(
    'rejects an invalid Labs response instead of inventing links: %j',
    async (mapping) => {
      fetchMock.mockResolvedValueOnce(json({})).mockResolvedValueOnce(json(mapping));
      await expect(metadata.loadRecordingSpotifyLinks(mbid)).rejects.toThrow('ListenBrainz');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('does not retry a failing Labs service or expose a MusicBrainz fallback as a verified link', async () => {
    fetchMock.mockResolvedValueOnce(json({})).mockResolvedValueOnce(json({}, 503));
    await expect(metadata.loadRecordingSpotifyLinks(mbid)).rejects.toThrow(
      'ListenBrainz nie udostępnił',
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('aborts a pending Labs fallback immediately', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValueOnce(json({})).mockImplementationOnce(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = metadata.loadRecordingSpotifyLinks(mbid, controller.signal);
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    controller.abort();
    await rejected;
  });

  it('times out a pending Labs fallback so manual linking remains available', async () => {
    fetchMock.mockResolvedValueOnce(json({})).mockImplementationOnce(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = metadata.loadRecordingSpotifyLinks(mbid);
    const rejected = expect(request).rejects.toThrow('ListenBrainz nie odpowiedział na czas');
    await vi.advanceTimersByTimeAsync(12000);
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('Spotify-linked recording enrichment', () => {
  it('fills only a recording explicitly linked to the canonical Spotify URL', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Dancing Queen' }))
      .mockResolvedValueOnce(
        json({ relations: [{ 'target-type': 'recording', recording: { id: mbid } }] }),
      )
      .mockResolvedValueOnce(json({ recordings: [recording()] }));
    const request = metadata.loadSpotifyTrackDetails(trackId);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await request;
    expect(result.title).toBe('Dancing Queen');
    expect(result.matchedRecording).toMatchObject({ id: mbid, artist: 'ABBA', year: 1976 });
    expect(result.suggestions).toEqual([]);
    const lookup = new URL(fetchMock.mock.calls[1][0]);
    expect(lookup.searchParams.get('resource')).toBe(`https://open.spotify.com/track/${trackId}`);
    expect(lookup.searchParams.get('inc')).toBe('recording-rels');
    expect(new URL(fetchMock.mock.calls[2][0]).searchParams.get('query')).toBe(`rid:${mbid}`);
  });

  it('automatically searches by title after a missing URL relationship but does not guess a match', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Dancing Queen' }))
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({ recordings: [recording()] }));
    const request = metadata.loadSpotifyTrackDetails(trackId);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await request;
    expect(result).not.toHaveProperty('matchedRecording');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ artist: 'ABBA', year: 1976 });
    expect(new URL(fetchMock.mock.calls[2][0]).searchParams.get('query')).toBe(
      'recording:"Dancing Queen"',
    );
  });

  it('keeps multiple linked recordings as choices and excludes unrelated search hits', async () => {
    const otherId = '126fa041-3917-4c73-9079-ed16e36f20f8';
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Dancing Queen' }))
      .mockResolvedValueOnce(
        json({
          relations: [
            { 'target-type': 'recording', recording: { id: mbid } },
            { 'target-type': 'recording', recording: { id: otherId } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          recordings: [
            recording(),
            recording({ id: otherId, 'first-release-date': '1986', disambiguation: 'live' }),
            recording({
              id: '226fa041-3917-4c73-9079-ed16e36f20f8',
              'artist-credit': [{ name: 'Another artist' }],
            }),
          ],
        }),
      );
    const request = metadata.loadSpotifyTrackDetails(trackId);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await request;
    expect(result).not.toHaveProperty('matchedRecording');
    expect(result.suggestions.map((suggestion) => suggestion.id)).toEqual([mbid, otherId]);
  });

  it('does not invent a year for an otherwise verified linked recording', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Dancing Queen' }))
      .mockResolvedValueOnce(
        json({ relations: [{ 'target-type': 'recording', recording: { id: mbid } }] }),
      )
      .mockResolvedValueOnce(
        json({
          recordings: [
            recording({ 'first-release-date': undefined, releases: [{ date: '2020' }] }),
          ],
        }),
      );
    const request = metadata.loadSpotifyTrackDetails(trackId);
    await vi.advanceTimersByTimeAsync(1000);
    expect((await request).matchedRecording).toMatchObject({ artist: 'ABBA' });
    expect((await request).matchedRecording).not.toHaveProperty('year');
  });

  it('keeps the Spotify title and manual fallback when MusicBrainz is unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Dancing Queen' }))
      .mockRejectedValue(new TypeError('Failed to fetch'));
    const request = metadata.loadSpotifyTrackDetails(trackId);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await request;
    expect(result).toMatchObject({ title: 'Dancing Queen', suggestions: [] });
    expect(result.lookupError).toContain('Sprawdź połączenie');
    expect(result).not.toHaveProperty('matchedRecording');
  });

  it('still finds choices when the optional direct URL lookup fails', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Dancing Queen' }))
      .mockResolvedValueOnce(json({}, 400))
      .mockResolvedValueOnce(json({ recordings: [recording()] }));
    const request = metadata.loadSpotifyTrackDetails(trackId);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await request;
    expect(result.suggestions).toHaveLength(1);
    expect(result).not.toHaveProperty('lookupError');
    expect(result).not.toHaveProperty('matchedRecording');
  });

  it('publishes the title promptly and cancels enrichment when its source becomes stale', async () => {
    const controller = new AbortController();
    const onTitle = vi.fn();
    fetchMock.mockResolvedValueOnce(json({ title: 'Dancing Queen' }));
    fetchMock.mockImplementationOnce(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const request = metadata.loadSpotifyTrackDetails(trackId, controller.signal, onTitle);
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    expect(onTitle).toHaveBeenCalledWith({ id: trackId, title: 'Dancing Queen' });
    controller.abort();
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('external Spotify search', () => {
  it('encodes user text as a search path on the Spotify domain', () => {
    expect(metadata.spotifySearchUrl(' ABBA Dancing Queen ')).toBe(
      'https://open.spotify.com/search/ABBA%20Dancing%20Queen',
    );
    expect(metadata.spotifySearchUrl('https://evil.example/?q=x')).toBe(
      'https://open.spotify.com/search/https%3A%2F%2Fevil.example%2F%3Fq%3Dx',
    );
    expect(metadata.spotifySearchUrl('')).toBe('https://open.spotify.com/search');
  });
});
