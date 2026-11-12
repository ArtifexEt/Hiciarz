import type { RecordingSpotifyLinks, RecordingSuggestion } from './track-metadata';

export type Stage = 'query' | 'results' | 'source' | 'review';

export type SongDraft = {
  spotify: string;
  title: string;
  artist: string;
  year: string;
  theme: string;
  answer: string;
};

export type RecordingQuery = Pick<SongDraft, 'title' | 'artist'>;

export type LinkDecision = { stage: 'review'; spotify: string } | { stage: 'source' };

export function stageAfterSearch(results: readonly RecordingSuggestion[]): 'results' | 'source' {
  return results.length ? 'results' : 'source';
}

/** Only one direct recording relationship can skip the source choice. */
export function decisionForLinks(result?: RecordingSpotifyLinks): LinkDecision {
  if (result?.source === 'musicbrainz' && result.links.length === 1)
    return { stage: 'review', spotify: result.links[0] };
  return { stage: 'source' };
}

export function wizardPath({
  hasResults,
  needsSource,
}: {
  hasResults: boolean;
  needsSource: boolean;
}): Stage[] {
  return [
    'query',
    ...(hasResults ? (['results'] as const) : []),
    ...(needsSource ? (['source'] as const) : []),
    'review',
  ];
}

/** Revisiting a step drops the abandoned forward branch. */
export function visitStage(history: readonly Stage[], next: Stage): Stage[] {
  const existing = history.indexOf(next);
  return existing < 0 ? [...history, next] : history.slice(0, existing + 1);
}

/** Back follows actual visits, so automatically skipped steps never appear. */
export function backStage(history: readonly Stage[], target?: Stage): Stage[] {
  if (!history.length) return ['query'];
  if (target === undefined) return history.slice(0, Math.max(1, history.length - 1));
  const existing = history.indexOf(target);
  return existing < 0 ? [...history] : history.slice(0, existing + 1);
}

function queryIdentity(query: RecordingQuery): string {
  return JSON.stringify(
    [query.title, query.artist].map((value) =>
      value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase(),
    ),
  );
}

/** Search text survives a missing match; metadata from another query does not. */
export function draftForQuery(
  draft: SongDraft,
  query: RecordingQuery,
  previousQuery: RecordingQuery,
): SongDraft {
  const changed = queryIdentity(query) !== queryIdentity(previousQuery);
  return {
    ...draft,
    title: query.title.trim(),
    artist: query.artist.trim(),
    ...(changed ? { spotify: '', year: '' } : {}),
  };
}

/** A newly chosen recording cannot keep the previous recording's playback URL. */
export function draftForSelectedRecording(
  draft: SongDraft,
  recording: RecordingSuggestion,
  previousRecordingId?: string,
): SongDraft {
  return {
    ...draft,
    spotify: previousRecordingId === recording.id ? draft.spotify : '',
    title: recording.title,
    artist: recording.artist,
    year: recording.year === undefined ? '' : String(recording.year),
  };
}
