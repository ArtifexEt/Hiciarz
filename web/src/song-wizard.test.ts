import { describe, expect, it } from 'vitest';
import type { RecordingSuggestion } from './track-metadata';
import {
  backStage,
  decisionForLinks,
  draftForQuery,
  draftForSelectedRecording,
  stageAfterSearch,
  visitStage,
  wizardPath,
  type SongDraft,
  type Stage,
} from './song-wizard';

const spotify = 'https://open.spotify.com/track/2ATDkfqprlNNe9mYWodgdc';
const recording: RecordingSuggestion = {
  id: 'a502f559-f70c-4e0d-a5e5-e0cc319d0bd7',
  title: 'Dancing Queen',
  artist: 'ABBA',
  year: 1976,
  disambiguation: 'single/LP/12″ version',
};
const draft: SongDraft = {
  spotify,
  title: recording.title,
  artist: recording.artist,
  year: '1976',
  theme: 'christmas',
  answer: 'My film or game',
};

describe('conditional song wizard journeys', () => {
  it('skips source selection for one direct recording link and Back returns to the recording results', () => {
    let history: Stage[] = ['query'];
    history = visitStage(history, stageAfterSearch([recording]));
    const decision = decisionForLinks({ links: [spotify], source: 'musicbrainz' });
    expect(decision).toEqual({ stage: 'review', spotify });
    history = visitStage(history, decision.stage);
    expect(wizardPath({ hasResults: true, needsSource: false })).toEqual([
      'query',
      'results',
      'review',
    ]);
    expect(history).toEqual(['query', 'results', 'review']);
    expect(backStage(history)).toEqual(['query', 'results']);
    expect(backStage(backStage(history))).toEqual(['query']);
  });

  it('preserves the typed song on no matches and Back skips the absent results page', () => {
    const query = { title: 'My unreleased song', artist: 'My performer' };
    const nextDraft = draftForQuery(draft, query, draft);
    const afterSearch = visitStage(['query'], stageAfterSearch([]));
    expect(nextDraft).toEqual({ ...draft, ...query, spotify: '', year: '' });
    expect(afterSearch).toEqual(['query', 'source']);
    expect(wizardPath({ hasResults: false, needsSource: true })).toEqual([
      'query',
      'source',
      'review',
    ]);
    expect(backStage(visitStage(afterSearch, 'review'))).toEqual(afterSearch);
    expect(backStage(afterSearch)).toEqual(['query']);
  });

  it.each([
    { links: [spotify], source: 'listenbrainz' as const },
    {
      links: [spotify, 'https://open.spotify.com/track/0GjEhVFGZW8afUYGChu3Rr'],
      source: 'musicbrainz' as const,
    },
    { links: [], source: 'musicbrainz' as const },
    { links: [], source: 'listenbrainz' as const },
    undefined,
  ])(
    'requires explicit source choice for candidates, missing mappings or a lookup error: %j',
    (links) => {
      const decision = decisionForLinks(links);
      expect(decision).toEqual({ stage: 'source' });
      const history = visitStage(visitStage(['query'], 'results'), decision.stage);
      expect(visitStage(history, 'review')).toEqual(['query', 'results', 'source', 'review']);
      expect(backStage(history)).toEqual(['query', 'results']);
    },
  );

  it('drops a previous branch when the header returns to query and the next search has no matches', () => {
    const completed: readonly Stage[] = ['query', 'results', 'source', 'review'];
    const returned = backStage(completed, 'query');
    const alternate = visitStage(returned, stageAfterSearch([]));
    expect(alternate).toEqual(['query', 'source']);
    expect(backStage(alternate, 'results')).toEqual(alternate);
    expect(visitStage(alternate, 'query')).toEqual(['query']);
    expect(completed).toEqual(['query', 'results', 'source', 'review']);
  });

  it('keeps Back at the first visited stage and never creates a future visit', () => {
    expect(backStage(['query'])).toEqual(['query']);
    expect(backStage(['query'], 'review')).toEqual(['query']);
    expect(backStage(['review'])).toEqual(['review']);
    expect(backStage([])).toEqual(['query']);
  });
});

describe('song identity across wizard branches', () => {
  it('keeps the chosen year and source when rerunning the same query with harmless formatting changes', () => {
    const sameQuery = { title: '  DANCING   QUEEN ', artist: ' Abba ' };
    const next = draftForQuery(draft, sameQuery, draft);
    expect(next).toEqual({ ...draft, title: 'DANCING   QUEEN', artist: 'Abba' });
    expect(next.spotify).toBe(spotify);
    expect(next.year).toBe('1976');
    expect(draft.title).toBe('Dancing Queen');
  });

  it('recognizes canonically equivalent Unicode query text without discarding the source', () => {
    const accented = { ...draft, title: 'Café' };
    const next = draftForQuery(accented, { title: 'Cafe\u0301', artist: 'ABBA' }, accented);
    expect(next.spotify).toBe(spotify);
    expect(next.year).toBe('1976');
  });

  it.each([
    { title: 'Głucha noc', artist: 'Peja' },
    { title: 'Dancing Queen', artist: 'Another performer' },
    { title: 'Dancing Queen', artist: '' },
  ])('clears the old playback link and year only for a changed title or artist: %j', (query) => {
    const next = draftForQuery(draft, query, draft);
    expect(next).toEqual({ ...draft, ...query, spotify: '', year: '' });
    expect(next.theme).toBe(draft.theme);
    expect(next.answer).toBe(draft.answer);
  });

  it('clears a prior source and missing year when a different recording is selected', () => {
    const alternate: RecordingSuggestion = {
      ...recording,
      id: '1598da65-6119-4df9-b2ea-591e12658588',
      year: undefined,
      disambiguation: 'another recording',
    };
    expect(draftForSelectedRecording(draft, alternate, recording.id)).toEqual({
      ...draft,
      spotify: '',
      year: '',
    });
    expect(draft.spotify).toBe(spotify);
  });

  it('preserves the current source when reselecting the same recording but still uses its metadata', () => {
    expect(draftForSelectedRecording({ ...draft, year: '2000' }, recording, recording.id)).toEqual(
      draft,
    );
    expect(draftForSelectedRecording(draft, recording).spotify).toBe('');
  });
});
