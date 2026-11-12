import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import SongForm, {
  draftForRecording,
  draftWithMetadata,
  draftWithRecordingSpotifyLink,
  draftWithSpotifySource,
  songFromDraft,
  type SongDraft,
} from './SongForm';
import { setLanguage, t, type Language } from './i18n';
import { demoDeck } from './model';

const draft: SongDraft = {
  spotify: 'https://open.spotify.com/track/0GjEhVFGZW8afUYGChu3Rr?si=test',
  title: 'Dancing Queen',
  artist: 'ABBA',
  year: '1976',
  theme: '',
  answer: '',
};
const noop = () => {};
afterEach(() => setLanguage('pl'));

describe('Spotify card drafts', () => {
  it('requires a Spotify track for a new card and normalizes its shared URL', () => {
    const song = songFromDraft(draft, 'music');
    expect(song.sources).toEqual({ spotify: '0GjEhVFGZW8afUYGChu3Rr' });
    expect(song.year).toBe(1976);
    expect(() => songFromDraft({ ...draft, spotify: '' }, 'music')).toThrow();
    expect(() =>
      songFromDraft(
        { ...draft, spotify: 'https://example.com/track/0GjEhVFGZW8afUYGChu3Rr' },
        'music',
      ),
    ).toThrow();
  });

  it('keeps existing YouTube sources and IDs when editing older cards', () => {
    const previous = demoDeck().songs.find(
      (song) => song.sources.youtube && !song.sources.spotify,
    )!;
    const result = songFromDraft(
      { ...draft, spotify: '', title: previous.title },
      'music',
      previous,
    );
    expect(result.sources).toEqual(previous.sources);
    expect(result.id).toBe(previous.id);
    expect(result.title).toBe(previous.title);
  });

  it('adds Spotify without deleting an existing second source', () => {
    const previous = demoDeck().songs[0];
    expect(songFromDraft(draft, 'music', previous).sources).toEqual(previous.sources);
  });

  it('keeps movie and game answers and requires a real year before saving', () => {
    expect(songFromDraft({ ...draft, answer: 'The Witcher 3' }, 'game').answer).toBe(
      'The Witcher 3',
    );
    expect(() => songFromDraft({ ...draft, year: '' }, 'music')).toThrow();
    expect(() => songFromDraft(draft, 'movie')).toThrow();
  });

  it('clears suggested details on source change while keeping manual and saved values', () => {
    const suggested = { title: draft.title, artist: draft.artist, year: draft.year };
    expect(draftWithSpotifySource(draft, '', suggested)).toMatchObject({
      spotify: '',
      title: '',
      artist: '',
      year: '',
    });
    expect(draftWithSpotifySource({ ...draft, year: '1975' }, '', suggested).year).toBe('1975');
    expect(draftWithSpotifySource(draft, '', {})).toMatchObject({
      title: draft.title,
      artist: draft.artist,
      year: draft.year,
    });
  });

  it('does not assign a previously selected year to an undated recording', () => {
    const undated = draftForRecording(draft, {
      id: 'variant',
      title: 'Dancing Queen (live)',
      artist: 'ABBA',
      disambiguation: 'live',
    });
    expect(undated.year).toBe('');
    expect(() => songFromDraft(undated, 'music')).toThrow();
  });

  it('clears the previous playback source when explicitly choosing a different source recording', () => {
    const next = draftForRecording(
      draft,
      {
        id: 'different-recording',
        title: 'Głucha noc',
        artist: 'Peja/Slums Attack',
        year: 2001,
        disambiguation: '',
      },
      true,
    );
    expect(next).toMatchObject({
      spotify: '',
      title: 'Głucha noc',
      artist: 'Peja/Slums Attack',
      year: '2001',
    });
    const linked = draftWithRecordingSpotifyLink(next, draft.spotify, '');
    expect(linked).toMatchObject({ spotify: draft.spotify, title: 'Głucha noc', year: '2001' });
  });

  it('fills an untouched blank playback source without losing the selected MusicBrainz metadata', () => {
    const withoutSource = { ...draft, spotify: '', year: '' };
    expect(draftWithRecordingSpotifyLink(withoutSource, draft.spotify, '')).toEqual({
      ...withoutSource,
      spotify: draft.spotify,
    });
    expect(
      draftWithRecordingSpotifyLink(
        draft,
        'https://open.spotify.com/track/2kj7OFRtWj9bkm8jqnT2EY',
        '',
      ),
    ).toBe(draft);
    expect(draftWithRecordingSpotifyLink(withoutSource, draft.spotify, 'previous-source')).toBe(
      withoutSource,
    );
  });

  it('fills untouched blank metadata without replacing existing manual fields', () => {
    const revisions = { title: 0, artist: 0, year: 0 };
    const manual = { ...draft, title: 'My edited title', artist: '', year: '' };
    const result = draftWithMetadata(
      manual,
      { title: 'API title', artist: 'ABBA', year: '1976' },
      revisions,
      revisions,
    );
    expect(result).toMatchObject({
      title: 'My edited title',
      artist: 'ABBA',
      year: '1976',
      spotify: draft.spotify,
    });
    expect(manual.artist).toBe('');
  });

  it('respects a field manually cleared while metadata was loading', () => {
    const started = { title: 0, artist: 0, year: 0 };
    const current = { title: 0, artist: 0, year: 1 };
    expect(
      draftWithMetadata(
        { ...draft, artist: '', year: '' },
        { artist: 'ABBA', year: '1976' },
        started,
        current,
      ),
    ).toMatchObject({ artist: 'ABBA', year: '' });
  });
});

describe.each<Language>(['pl', 'en'])('Spotify song form in %s', (language) => {
  it('starts with MusicBrainz search and keeps Spotify paste in a closed secondary disclosure', () => {
    setLanguage(language);
    const markup = renderToStaticMarkup(<SongForm onSave={noop} onClose={noop} />);
    expect(markup).toContain('name="spotify"');
    expect(markup).toContain('name="recording-search-title"');
    expect(markup).toContain('name="recording-search-artist"');
    expect(markup).toContain(t('musicbrainzFirst.optionalArtist'));
    expect(markup).toContain(t('musicbrainzFirst.search'));
    expect(markup.indexOf('name="recording-search-title"')).toBeLessThan(
      markup.indexOf('name="spotify"'),
    );
    expect(markup).toMatch(/<details class="song-spotify-finder song-spotify-entry">/);
    expect(markup).toContain(t('musicbrainzFirst.haveSpotifyLink'));
    expect(markup.match(/<form\b/g)).toHaveLength(1);
    expect(markup).toContain('https://open.spotify.com/search');
    expect(markup).not.toContain('name="youtube"');
    expect(markup).not.toContain('accounts.spotify.com');
    expect(markup).not.toMatch(/(?:songForm|app|creator|musicbrainzFirst)\.[A-Za-z]/);
    expect(markup).not.toContain('<iframe');
    for (const field of ['title', 'artist', 'year', 'theme', 'answer'])
      expect(markup).not.toContain(`name="${field}"`);
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    expect(markup).not.toContain('song-recording-results');
  });

  it('opens an existing card directly on metadata and preserves edit actions', () => {
    setLanguage(language);
    const markup = renderToStaticMarkup(
      <SongForm
        song={demoDeck().songs[0]}
        onSave={noop}
        onClose={noop}
        onDelete={noop}
        onMove={{ down: noop }}
      />,
    );
    expect(markup).toContain('https://open.spotify.com/track/0GjEhVFGZW8afUYGChu3Rr');
    expect(markup).not.toContain('<iframe');
    expect(markup).not.toContain('name="spotify"');
    expect(markup).toContain('name="year"');
    expect(markup).toContain('name="title"');
    expect(markup).toContain('name="artist"');
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
    expect(markup).toContain('song-extra-options');
    expect(markup).not.toMatch(/(?:songForm|app|creator)\.[A-Za-z]/);
  });

  it('keeps a music card in music mode when edited from a game deck', () => {
    setLanguage(language);
    const markup = renderToStaticMarkup(
      <SongForm song={demoDeck().songs[0]} defaultMode="game" onSave={noop} onClose={noop} />,
    );
    expect(markup).toContain('checked="" value="music"');
    expect(markup).not.toContain('name="answer"');
  });

  it('keeps a legacy source editable directly on metadata without requiring a new Spotify link', () => {
    setLanguage(language);
    const previous = demoDeck().songs.find(
      (song) => song.sources.youtube && !song.sources.spotify,
    )!;
    const markup = renderToStaticMarkup(<SongForm song={previous} onSave={noop} onClose={noop} />);
    expect(markup).toContain('name="year"');
    expect(markup).not.toContain('name="spotify"');
    expect(markup).not.toContain('<iframe');
    expect(markup).not.toMatch(/(?:songForm|app|creator)\.[A-Za-z]/);
  });

  it('keeps step navigation and associated submit actions outside the scrollable body', () => {
    setLanguage(language);
    const markup = renderToStaticMarkup(
      <SongForm song={demoDeck().songs[0]} onSave={noop} onClose={noop} />,
    );
    const navigation = markup.indexOf('class="modal-navigation"');
    const body = markup.indexOf('class="modal-body"');
    const footer = markup.indexOf('class="modal-footer"');
    const formId = markup.match(/<form[^>]*\bid="([^"]+)"/)?.[1];
    expect(navigation).toBeGreaterThan(0);
    expect(navigation).toBeLessThan(body);
    expect(footer).toBeGreaterThan(markup.indexOf('</form>'));
    expect(markup.slice(footer)).toContain(`form="${formId}"`);
    expect(markup.slice(navigation, body)).toContain('<button type="button"');
  });

  it('uses the deck default for new cards and hides per-card type overrides in More settings', () => {
    setLanguage(language);
    const newCard = renderToStaticMarkup(
      <SongForm defaultMode="game" onSave={noop} onClose={noop} />,
    );
    expect(newCard).toContain(t('creator.newCardTitle.game'));
    const existing = {
      ...demoDeck().songs[0],
      gameMode: 'movie' as const,
      answer: 'Jurassic Park',
    };
    const markup = renderToStaticMarkup(
      <SongForm song={existing} defaultMode="game" onSave={noop} onClose={noop} />,
    );
    const advanced = markup.match(
      /<details class="song-advanced-settings">([\s\S]*?)<\/details>/,
    )?.[1];
    expect(advanced).toBeTruthy();
    expect(advanced).toContain(t('metadataAutofill.moreSettings'));
    expect(advanced).toContain('checked="" value="movie"');
    expect(advanced).not.toContain('name="answer"');
    expect(markup).toContain('name="answer"');
    expect(markup).not.toMatch(/<details class="song-advanced-settings"[^>]*\bopen=/);
  });
});
