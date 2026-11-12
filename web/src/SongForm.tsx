import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  LoaderCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { displayTranslation, useTranslation, t } from './i18n';
import Modal from './Modal';
import GameModePicker from './GameModePicker';
import CardThemeSelect from './CardThemeSelect';
import { spotifyId, validateSong, type GameMode, type Song, type Theme } from './model';
import {
  findRecordingSuggestions,
  loadRecordingSpotifyLinks,
  loadSpotifyTrackDetails,
  spotifySearchUrl,
  type RecordingSuggestion,
} from './track-metadata';
import './song-form.css';

export type SongDraft = {
  spotify: string;
  title: string;
  artist: string;
  year: string;
  theme: string;
  answer: string;
};

type SuggestedFields = Partial<Pick<SongDraft, 'title' | 'artist' | 'year'>>;
const recordingFields = ['title', 'artist', 'year'] as const;
type FieldRevisions = Record<(typeof recordingFields)[number], number>;

/** Late metadata may fill blanks only while the user has left that field untouched. */
export function draftWithMetadata(
  draft: SongDraft,
  metadata: SuggestedFields,
  started: FieldRevisions,
  current: FieldRevisions,
): SongDraft {
  const next = { ...draft };
  for (const field of recordingFields) {
    const value = metadata[field];
    if (value && !next[field].trim() && started[field] === current[field]) next[field] = value;
  }
  return next;
}

/** A different source must not silently reuse the previous source's suggested metadata. */
export function draftWithSpotifySource(
  draft: SongDraft,
  spotify: string,
  suggested: SuggestedFields,
): SongDraft {
  const next = { ...draft, spotify };
  for (const field of recordingFields) {
    if (suggested[field] !== undefined && next[field] === suggested[field]) next[field] = '';
  }
  return next;
}

export function draftForRecording(
  draft: SongDraft,
  recording: RecordingSuggestion,
  clearSource = false,
): SongDraft {
  return {
    ...draft,
    spotify: clearSource ? '' : draft.spotify,
    title: recording.title,
    artist: recording.artist,
    year: recording.year ? String(recording.year) : '',
  };
}

/** A late recording lookup must never replace a pasted or previously selected source. */
export function draftWithRecordingSpotifyLink(
  draft: SongDraft,
  spotify: string,
  sourceAtStart: string,
): SongDraft {
  return draft.spotify === sourceAtStart && !draft.spotify.trim() ? { ...draft, spotify } : draft;
}

/** New cards use Spotify; editing keeps any sources already stored in an older card. */
export function songFromDraft(draft: SongDraft, gameMode: GameMode, previous?: Song): Song {
  if (!previous && !draft.spotify.trim()) throw new Error(t('songForm.spotifyRequired'));
  return validateSong({
    id: previous?.id,
    title: draft.title,
    artist: draft.artist,
    year: draft.year,
    theme: draft.theme || undefined,
    answer: draft.answer,
    gameMode,
    sources: { ...previous?.sources, spotify: draft.spotify },
    review: false,
  });
}

export default function SongForm({
  song,
  defaultMode = 'music',
  defaultTheme = 'classic',
  onSave,
  onClose,
  onDelete,
  onMove,
}: {
  song?: Song;
  defaultMode?: GameMode;
  defaultTheme?: Theme;
  onSave: (song: Song) => void;
  onClose: () => void;
  onDelete?: () => void;
  onMove?: { up?: () => void; down?: () => void };
}) {
  const { t } = useTranslation();
  const spotifyInputId = useId();
  const formId = useId();
  const pageRef = useRef<HTMLFormElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const spotifyRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'source' | 'details'>(song ? 'details' : 'source');
  const [gameMode, setGameMode] = useState<GameMode>(song ? song.gameMode || 'music' : defaultMode);
  const [draft, setDraft] = useState<SongDraft>({
    spotify: song?.sources.spotify ? `https://open.spotify.com/track/${song.sources.spotify}` : '',
    title: song?.title || '',
    artist: song?.artist || '',
    year: song?.year ? String(song.year) : '',
    theme: song?.theme || '',
    answer: song?.answer || '',
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const revisions = useRef({ title: 0, artist: 0, year: 0 });
  const suggestedFields = useRef<SuggestedFields>({});
  const recordingChoice = useRef('');
  const operation = useRef<{ revision: number; controller?: AbortController }>({ revision: 0 });
  const [search, setSearch] = useState('');
  const [recordingSearch, setRecordingSearch] = useState({
    title: song?.title || '',
    artist: song?.artist || '',
  });
  const [spotifyEntryOpen, setSpotifyEntryOpen] = useState(false);
  const [recordingLinks, setRecordingLinks] = useState<string[]>([]);
  const [previewTrackId, setPreviewTrackId] = useState('');
  const [recordingLinkSource, setRecordingLinkSource] = useState<'musicbrainz' | 'listenbrainz'>(
    'musicbrainz',
  );
  const [busy, setBusy] = useState<'title' | 'year' | 'search' | 'links' | null>(null);
  const [suggestions, setSuggestions] = useState<RecordingSuggestion[]>([]);
  const [selectedRecording, setSelectedRecording] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [error, setError] = useState('');

  function invalidate() {
    operation.current.controller?.abort();
    operation.current = { revision: operation.current.revision + 1 };
  }

  useEffect(() => () => invalidate(), []);
  useEffect(() => {
    if (
      step === 'source' &&
      spotifyEntryOpen &&
      error &&
      error !== t('musicbrainzFirst.enterTitle')
    )
      spotifyRef.current?.focus({ preventScroll: true });
  }, [step, spotifyEntryOpen, error]);
  useEffect(() => {
    const form = pageRef.current;
    if (!form) return;
    form.closest<HTMLElement>('.modal-body')?.scrollTo({ top: 0, behavior: 'instant' });
    if (step === 'source') sourceRef.current?.focus({ preventScroll: true });
    else {
      const current = draftRef.current;
      const field =
        gameMode !== 'music' && !current.answer.trim()
          ? 'answer'
          : !current.title.trim()
            ? 'title'
            : !current.artist.trim()
              ? 'artist'
              : 'title';
      form
        .querySelector<HTMLInputElement>(`input[name="${field}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [step]);

  function update(field: keyof SongDraft, value: string) {
    let next = { ...draftRef.current, [field]: value };
    if (field === 'spotify') {
      invalidate();
      setBusy(null);
      setLookupMessage('');
      setLookupError('');
      setPreviewTrackId('');
      if (!recordingChoice.current) {
        setSuggestions([]);
        setSelectedRecording('');
        next = draftWithSpotifySource(draftRef.current, value, suggestedFields.current);
        suggestedFields.current = {};
      }
    } else if (field === 'title' || field === 'artist' || field === 'year') {
      revisions.current[field]++;
      setSelectedRecording('');
      setLookupMessage('');
      delete suggestedFields.current[field];
    }
    draftRef.current = next;
    setDraft(next);
    setError('');
  }

  function updateRecordingSearch(field: 'title' | 'artist', value: string) {
    invalidate();
    setBusy(null);
    setRecordingSearch((previous) => ({ ...previous, [field]: value }));
    setSuggestions([]);
    setRecordingLinks([]);
    setLookupMessage('');
    setLookupError('');
    setError('');
  }

  let trackId = '';
  try {
    if (draft.spotify.trim()) trackId = spotifyId(draft.spotify);
  } catch {
    // Keep the input editable. Validation errors appear when loading or saving.
  }

  function startOperation(kind: 'title' | 'year' | 'search' | 'links') {
    invalidate();
    const revision = operation.current.revision;
    const controller = new AbortController();
    operation.current.controller = controller;
    setBusy(kind);
    setLookupError('');
    setLookupMessage('');
    return {
      controller,
      current: () => operation.current.revision === revision && !controller.signal.aborted,
    };
  }

  async function loadMetadata(raw: string) {
    const { controller, current } = startOperation('title');
    const started = { ...revisions.current };
    function applyMetadata(metadata: SuggestedFields) {
      if (!current()) return;
      const previous = draftRef.current;
      const next = draftWithMetadata(previous, metadata, started, revisions.current);
      for (const field of recordingFields)
        if (next[field] !== previous[field]) suggestedFields.current[field] = next[field];
      draftRef.current = next;
      setDraft(next);
    }
    try {
      const metadata = await loadSpotifyTrackDetails(raw, controller.signal, (metadata) =>
        applyMetadata({ title: metadata.title }),
      );
      if (!current()) return;
      if (
        revisions.current.title !== started.title ||
        revisions.current.artist !== started.artist
      ) {
        setLookupMessage('songForm.changedDuringSearch');
        return;
      }
      if (metadata.matchedRecording) {
        const recording = metadata.matchedRecording;
        applyMetadata({
          artist: recording.artist,
          year: recording.year ? String(recording.year) : undefined,
        });
        setLookupMessage(
          recording.year ? 'metadataAutofill.linked' : 'metadataAutofill.linkedNoYear',
        );
      } else {
        setSuggestions(metadata.suggestions);
        setLookupMessage(
          metadata.suggestions.length ? 'metadataAutofill.chooseMatch' : 'metadataAutofill.noMatch',
        );
      }
      if (metadata.lookupError) setLookupError(metadata.lookupError);
    } catch (error) {
      if (current()) setLookupError((error as Error).message);
    } finally {
      if (current()) setBusy(null);
    }
  }

  function advance() {
    const raw = draftRef.current.spotify.trim();
    if (!raw && !song?.sources.youtube) {
      setError(t('songForm.spotifyRequired'));
      setSpotifyEntryOpen(true);
      spotifyRef.current?.focus();
      return;
    }
    if (raw) {
      try {
        spotifyId(raw);
      } catch {
        setError(t('songForm.useTrackLink'));
        setSpotifyEntryOpen(true);
        spotifyRef.current?.focus();
        return;
      }
    }
    invalidate();
    setBusy(null);
    setError('');
    setLookupError('');
    setLookupMessage('');
    setStep('details');
    if (
      raw &&
      !recordingChoice.current &&
      recordingFields.some((field) => !draftRef.current[field].trim())
    )
      void loadMetadata(raw);
  }

  function back() {
    invalidate();
    setBusy(null);
    setError('');
    setLookupError('');
    setLookupMessage('');
    setStep('source');
  }

  async function findYear() {
    if (!draftRef.current.title.trim()) return;
    const { controller, current } = startOperation('year');
    setSuggestions([]);
    setSelectedRecording('');
    const titleRevision = revisions.current.title;
    const artistRevision = revisions.current.artist;
    try {
      const found = await findRecordingSuggestions(
        draftRef.current.title,
        draftRef.current.artist,
        controller.signal,
      );
      if (!current()) return;
      if (
        revisions.current.title !== titleRevision ||
        revisions.current.artist !== artistRevision
      ) {
        setLookupMessage('songForm.changedDuringSearch');
        return;
      }
      setSuggestions(found);
      setLookupMessage(found.length ? 'metadataAutofill.chooseMatch' : 'songForm.noSuggestions');
    } catch (error) {
      if (current()) setLookupError((error as Error).message);
    } finally {
      if (current()) setBusy(null);
    }
  }

  async function findSourceRecordings() {
    if (!recordingSearch.title.trim()) {
      setError(t('musicbrainzFirst.enterTitle'));
      sourceRef.current?.focus();
      return;
    }
    const { controller, current } = startOperation('search');
    setError('');
    setSuggestions([]);
    setRecordingLinks([]);
    try {
      const found = await findRecordingSuggestions(
        recordingSearch.title,
        recordingSearch.artist,
        controller.signal,
      );
      if (!current()) return;
      setSuggestions(found);
      setLookupMessage(
        found.length ? 'musicbrainzFirst.chooseRecording' : 'musicbrainzFirst.noResults',
      );
      if (!found.length) setSpotifyEntryOpen(true);
    } catch (error) {
      if (current()) {
        setLookupError((error as Error).message);
        setSpotifyEntryOpen(true);
      }
    } finally {
      if (current()) setBusy(null);
    }
  }

  async function chooseRecording(recording: RecordingSuggestion) {
    invalidate();
    setBusy(null);
    const next = draftForRecording(
      draftRef.current,
      recording,
      step === 'source' && recordingChoice.current !== recording.id,
    );
    recordingChoice.current = recording.id;
    suggestedFields.current = {};
    revisions.current.title++;
    revisions.current.artist++;
    revisions.current.year++;
    draftRef.current = next;
    setDraft(next);
    setSelectedRecording(recording.id);
    if (step === 'source') setRecordingSearch({ title: recording.title, artist: recording.artist });
    setLookupMessage(
      recording.year ? 'metadataAutofill.selected' : 'metadataAutofill.selectedNoYear',
    );
    setError('');
    setLookupError('');
    if (step !== 'source') return;
    setRecordingLinks([]);
    setPreviewTrackId('');
    const sourceAtStart = next.spotify;
    const { controller, current } = startOperation('links');
    try {
      const { links, source } = await loadRecordingSpotifyLinks(recording.id, controller.signal);
      if (!current()) return;
      setRecordingLinks(links);
      setRecordingLinkSource(source);
      setPreviewTrackId(links[0] ? spotifyId(links[0]) : '');
      if (links.length === 1 && source === 'musicbrainz') {
        const before = draftRef.current;
        const withLink = draftWithRecordingSpotifyLink(before, links[0], sourceAtStart);
        if (withLink !== before) {
          draftRef.current = withLink;
          setDraft(withLink);
        }
      }
      setLookupMessage(
        links.length && source === 'listenbrainz'
          ? 'musicbrainzFirst.suggestedSpotify'
          : links.length > 1
            ? 'musicbrainzFirst.chooseSpotify'
            : links.length
              ? 'musicbrainzFirst.linkFound'
              : 'musicbrainzFirst.noSpotify',
      );
      if (!links.length) setSpotifyEntryOpen(true);
    } catch (error) {
      if (current()) {
        setLookupError((error as Error).message);
        setLookupMessage('musicbrainzFirst.linksUnavailable');
        setSpotifyEntryOpen(true);
      }
    } finally {
      if (current()) setBusy(null);
    }
  }

  const searchQuery =
    search.trim() ||
    `${recordingSearch.artist} ${recordingSearch.title}`.trim() ||
    `${draft.artist} ${draft.title}`.trim();
  const sourcePreviewId = previewTrackId || trackId;
  const spotifyChoice = (link: string, index: number) => (
    <div className="song-spotify-choice" key={link}>
      <label>
        <input
          type="radio"
          name="recording-spotify-link"
          value={link}
          checked={draft.spotify === link}
          onChange={() => {
            update('spotify', link);
            setPreviewTrackId(spotifyId(link));
          }}
        />
        <span>
          <strong>{t('musicbrainzFirst.spotifyOption', { number: index + 1 })}</strong>
          <small>{link}</small>
        </span>
      </label>
      <button
        className="text-button"
        type="button"
        aria-pressed={sourcePreviewId === spotifyId(link)}
        onClick={() => setPreviewTrackId(spotifyId(link))}
      >
        {t('musicbrainzFirst.listen')}
      </button>
    </div>
  );
  const lookupFeedback = (
    <div className="song-lookup-feedback" aria-live="polite" aria-atomic="true">
      {(busy === 'year' || busy === 'search' || busy === 'links') && (
        <p className="song-title-loading hint" role="status">
          <LoaderCircle size={15} className="spin" aria-hidden="true" />
          {t(busy === 'links' ? 'musicbrainzFirst.findingSpotify' : 'songForm.lookingUp')}
        </p>
      )}
      {lookupMessage && (
        <p className="hint" role="status">
          {t(lookupMessage)}
        </p>
      )}
      {lookupError && (
        <p className="error" role="alert">
          {displayTranslation(lookupError)}
        </p>
      )}
    </div>
  );
  const recordingResults = suggestions.length > 0 && (
    <fieldset className="song-recording-results">
      <legend>{t('songForm.chooseRecording')}</legend>
      <div className="song-recording-list">
        {suggestions.map((recording) => (
          <button
            key={recording.id}
            type="button"
            className="song-recording-choice"
            aria-pressed={selectedRecording === recording.id}
            onClick={() => void chooseRecording(recording)}
          >
            <span className="song-recording-year">{recording.year || t('songForm.noDate')}</span>
            <span className="song-recording-description">
              <strong>{recording.title}</strong>
              <span>{recording.artist}</span>
              {recording.disambiguation && <small>{recording.disambiguation}</small>}
            </span>
            {selectedRecording === recording.id && <Check size={18} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <a
        className="text-button"
        href="https://musicbrainz.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('songForm.dataSource')} <ArrowUpRight size={14} aria-hidden="true" />
      </a>
    </fieldset>
  );
  return (
    <Modal
      title={
        song
          ? t('app.editTrack')
          : gameMode === 'music'
            ? t('app.addYourHit')
            : t('creator.newCardTitle.' + gameMode)
      }
      onClose={onClose}
      navigation={
        <ol className="song-form-progress" aria-label={t('songForm.progress')}>
          <li aria-current={step === 'source' ? 'step' : undefined}>
            <button type="button" onClick={() => step !== 'source' && back()}>
              <span aria-hidden="true">1</span> {t('songForm.stepTrack')}
            </button>
          </li>
          <li aria-current={step === 'details' ? 'step' : undefined}>
            <button
              type="button"
              disabled={!trackId && !song?.sources.youtube}
              onClick={() => step === 'source' && advance()}
            >
              <span aria-hidden="true">2</span> {t('songForm.stepDetails')}
            </button>
          </li>
        </ol>
      }
      footer={
        <div className="modal-actions song-form-actions">
          <button type="button" className="secondary" onClick={step === 'source' ? onClose : back}>
            {step === 'details' && <ArrowLeft size={17} aria-hidden="true" />}
            {t(step === 'source' ? 'app.cancel' : 'songForm.back')}
          </button>
          <button
            className="primary"
            type="submit"
            form={formId}
            disabled={step === 'source' && busy !== null}
          >
            {step === 'source' ? (
              recordingChoice.current || draft.spotify.trim() || song?.sources.youtube ? (
                <>
                  {t('songForm.next')} <ArrowRight size={17} aria-hidden="true" />
                </>
              ) : (
                <>
                  <Search size={17} aria-hidden="true" /> {t('musicbrainzFirst.search')}
                </>
              )
            ) : (
              <>
                <Check size={17} aria-hidden="true" />{' '}
                {t(gameMode === 'music' ? 'app.saveTrack' : 'creator.saveCard')}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="song-form">
        <form
          id={formId}
          key={step}
          ref={pageRef}
          className="song-form-page"
          noValidate={step === 'source'}
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 'source') {
              if (
                recordingChoice.current ||
                song?.sources.youtube ||
                draftRef.current.spotify.trim()
              )
                advance();
              else void findSourceRecordings();
              return;
            }
            try {
              const next = songFromDraft(draftRef.current, gameMode, song);
              invalidate();
              setBusy(null);
              onSave(next);
              onClose();
            } catch (error) {
              setError((error as Error).message);
            }
          }}
        >
          {step === 'source' ? (
            <>
              <section className="song-recording-search" aria-label={t('musicbrainzFirst.search')}>
                <p className="hint">{t('musicbrainzFirst.intro')}</p>
                <div className="form-grid">
                  <label>
                    {t('creator.recordingTitle')}
                    <input
                      ref={sourceRef}
                      name="recording-search-title"
                      autoFocus={!song}
                      type="search"
                      maxLength={200}
                      value={recordingSearch.title}
                      onChange={(event) => updateRecordingSearch('title', event.target.value)}
                      placeholder={t('app.forExampleDancingQueen')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void findSourceRecordings();
                        }
                      }}
                    />
                  </label>
                  <label>
                    {t('musicbrainzFirst.optionalArtist')}
                    <input
                      name="recording-search-artist"
                      type="search"
                      maxLength={200}
                      value={recordingSearch.artist}
                      onChange={(event) => updateRecordingSearch('artist', event.target.value)}
                      placeholder="ABBA"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void findSourceRecordings();
                        }
                      }}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy !== null || !recordingSearch.title.trim()}
                  onClick={() => void findSourceRecordings()}
                >
                  <Search size={17} aria-hidden="true" /> {t('musicbrainzFirst.search')}
                </button>
              </section>
              {recordingChoice.current && (
                <div className="song-selected-recording">
                  <span>{t('musicbrainzFirst.selectedRecording')}</span>
                  <strong>{draft.title}</strong>
                  <span>
                    {draft.artist} · {draft.year || t('songForm.noDate')}
                  </span>
                </div>
              )}
              {lookupFeedback}
              {recordingResults}
              {recordingLinks.length > 0 && (
                <fieldset className="song-spotify-choices">
                  <legend>{t('musicbrainzFirst.spotifyChoices')}</legend>
                  <p className="hint">
                    {t(
                      recordingLinkSource === 'listenbrainz'
                        ? 'musicbrainzFirst.suggestedSpotify'
                        : 'musicbrainzFirst.musicbrainzLinks',
                    )}
                  </p>
                  {spotifyChoice(recordingLinks[0], 0)}
                  {recordingLinks.length > 1 && (
                    <details className="song-other-spotify-links">
                      <summary>
                        {t('musicbrainzFirst.otherSpotify', { count: recordingLinks.length - 1 })}
                      </summary>
                      <div className="song-other-spotify-list">
                        {recordingLinks
                          .slice(1)
                          .map((link, index) => spotifyChoice(link, index + 1))}
                      </div>
                    </details>
                  )}
                  {recordingLinkSource === 'listenbrainz' && (
                    <a
                      className="text-button"
                      href="https://listenbrainz.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('musicbrainzFirst.listenBrainzSource')}{' '}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  )}
                </fieldset>
              )}
              <details
                className="song-spotify-finder song-spotify-entry"
                open={spotifyEntryOpen}
                onToggle={(event) => setSpotifyEntryOpen(event.currentTarget.open)}
              >
                <summary>{t('musicbrainzFirst.haveSpotifyLink')}</summary>
                <div className="song-spotify-link">
                  <label htmlFor={spotifyInputId}>{t('songForm.spotifyLink')}</label>
                  <div className="song-source-entry">
                    <input
                      id={spotifyInputId}
                      ref={spotifyRef}
                      aria-invalid={Boolean(error) || undefined}
                      aria-describedby={error ? `${spotifyInputId}-error` : undefined}
                      name="spotify"
                      inputMode="url"
                      required={!song?.sources.youtube}
                      value={draft.spotify}
                      onChange={(event) => update('spotify', event.target.value)}
                      placeholder="https://open.spotify.com/track/…"
                      autoComplete="off"
                      spellCheck={false}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          advance();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="song-search-entry">
                  <label>
                    {t('songForm.searchQuery')}
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t('songForm.searchPlaceholder')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                    />
                  </label>
                  <a
                    className="secondary"
                    href={spotifySearchUrl(searchQuery)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('songForm.findOnSpotify')} <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </div>
              </details>
              {sourcePreviewId && (
                <div className="song-spotify-player">
                  {sourcePreviewId !== trackId && (
                    <p className="hint">{t('musicbrainzFirst.previewCandidate')}</p>
                  )}
                  <iframe
                    key={sourcePreviewId}
                    title={t('songForm.previewTitle')}
                    src={`https://open.spotify.com/embed/track/${sourcePreviewId}`}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  <a
                    className="text-button"
                    href={`https://open.spotify.com/track/${sourcePreviewId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('songForm.openOnSpotify')} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                  <p className="hint">{t('songForm.previewHint')}</p>
                </div>
              )}
              {song?.sources.youtube && !song.sources.spotify && (
                <p className="hint">{t('songForm.existingSourceKept')}</p>
              )}
              {error && (
                <p className="error" role="alert" id={`${spotifyInputId}-error`}>
                  {displayTranslation(error)}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="song-source-summary">
                {trackId ? (
                  <a
                    className="text-button"
                    href={`https://open.spotify.com/track/${trackId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('songForm.openOnSpotify')} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="hint">{t('songForm.existingSourceKept')}</span>
                )}
              </div>
              {busy === 'title' && (
                <p className="song-title-loading hint" role="status">
                  <LoaderCircle size={15} className="spin" aria-hidden="true" />{' '}
                  {t('metadataAutofill.loading')}
                </p>
              )}
              <div className="form-grid">
                {gameMode !== 'music' && (
                  <label className="answer-entry">
                    {t('creator.answer.' + gameMode)}
                    <input
                      name="answer"
                      required
                      maxLength={200}
                      value={draft.answer}
                      onChange={(event) => update('answer', event.target.value)}
                      placeholder={
                        gameMode === 'movie'
                          ? t('app.eGJurassicPark')
                          : t('app.eGTheWitcher3WildHunt')
                      }
                    />
                  </label>
                )}
                <label>
                  {t('creator.recordingTitle')}
                  <input
                    name="title"
                    required
                    maxLength={200}
                    value={draft.title}
                    onChange={(event) => update('title', event.target.value)}
                    placeholder={
                      gameMode === 'music'
                        ? t('app.forExampleDancingQueen')
                        : t('creator.recordingExample.' + gameMode)
                    }
                  />
                </label>
                <label>
                  {gameMode === 'music' ? t('app.artist') : t('creator.recordingArtist')}
                  <input
                    name="artist"
                    required
                    maxLength={200}
                    value={draft.artist}
                    onChange={(event) => update('artist', event.target.value)}
                    placeholder={
                      gameMode === 'music'
                        ? 'ABBA'
                        : gameMode === 'game'
                          ? 'Jeremy Soule'
                          : 'John Williams'
                    }
                  />
                </label>
                <label>
                  {gameMode === 'music' ? t('app.yearForTheGame') : t('creator.recordingYear')}
                  <input
                    name="year"
                    type="number"
                    required
                    min="1000"
                    max="2100"
                    value={draft.year}
                    onChange={(event) => update('year', event.target.value)}
                    placeholder={
                      gameMode === 'game' ? '2011' : gameMode === 'movie' ? '1993' : '1976'
                    }
                  />
                </label>
                <CardThemeSelect
                  value={draft.theme as Theme | ''}
                  deckTheme={defaultTheme}
                  onChange={(theme) => update('theme', theme)}
                />
              </div>
              <details className="song-advanced-settings">
                <summary>{t('metadataAutofill.moreSettings')}</summary>
                <GameModePicker value={gameMode} onChange={setGameMode} compact />
              </details>
              <div className="song-year-actions">
                <button
                  className="text-button"
                  type="button"
                  disabled={busy !== null || !draft.title.trim()}
                  onClick={() => void findYear()}
                >
                  <Search size={15} aria-hidden="true" /> {t('metadataAutofill.findDetails')}
                </button>
              </div>
              {!busy && draft.title.trim() && !draft.artist.trim() && !lookupMessage && (
                <p className="hint">{t('metadataAutofill.titleSearch')}</p>
              )}
              {lookupFeedback}
              {recordingResults}
              <p className="hint">
                {gameMode === 'music'
                  ? t('app.theYearRefersToThisParticularRecording')
                  : t('creator.yearNotAnswer')}
              </p>
              {error && (
                <p className="error" role="alert">
                  {displayTranslation(error)}
                </p>
              )}
              {song && (
                <details className="song-extra-options">
                  <summary>{t('shell.moreSongOptions')}</summary>
                  <div>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!onMove?.up}
                      onClick={onMove?.up}
                    >
                      <ArrowUp size={18} /> {t('shell.moveUp')}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!onMove?.down}
                      onClick={onMove?.down}
                    >
                      <ArrowDown size={18} /> {t('shell.moveDown')}
                    </button>
                    <button type="button" className="danger" onClick={onDelete}>
                      <Trash2 size={18} /> {t('shell.deleteSong')}
                    </button>
                  </div>
                </details>
              )}
            </>
          )}
        </form>
      </div>
    </Modal>
  );
}
