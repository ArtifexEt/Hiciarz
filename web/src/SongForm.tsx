import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
  type RecordingSpotifyLinks,
} from './track-metadata';
import {
  backStage,
  visitStage,
  stageAfterSearch,
  decisionForLinks,
  draftForQuery,
  draftForSelectedRecording,
  type SongDraft,
  type Stage,
  type RecordingQuery,
} from './song-wizard';
import './song-form.css';
export type { SongDraft } from './song-wizard';

type SuggestedFields = Partial<Pick<SongDraft, 'title' | 'artist' | 'year'>>;
const recordingFields = ['title', 'artist', 'year'] as const;
type FieldRevisions = Record<(typeof recordingFields)[number], number>;

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
export function draftWithSpotifySource(
  draft: SongDraft,
  spotify: string,
  suggested: SuggestedFields,
): SongDraft {
  const next = { ...draft, spotify };
  for (const field of recordingFields)
    if (suggested[field] !== undefined && next[field] === suggested[field]) next[field] = '';
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
export function draftWithRecordingSpotifyLink(
  draft: SongDraft,
  spotify: string,
  sourceAtStart: string,
): SongDraft {
  return draft.spotify === sourceAtStart && !draft.spotify.trim() ? { ...draft, spotify } : draft;
}
export function songFromDraft(
  draft: SongDraft,
  gameMode: GameMode,
  previous?: Song,
  preserveSources = true,
): Song {
  if ((!previous || !preserveSources) && !draft.spotify.trim())
    throw new Error(t('songForm.spotifyRequired'));
  return validateSong({
    id: previous?.id,
    title: draft.title,
    artist: draft.artist,
    year: draft.year,
    theme: draft.theme || undefined,
    answer: draft.answer,
    gameMode,
    sources: { ...(preserveSources ? previous?.sources : {}), spotify: draft.spotify },
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
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [history, setHistory] = useState<Stage[]>(song ? ['review'] : ['query']);
  const stage = history[history.length - 1];
  const [gameMode, setGameMode] = useState<GameMode>(song ? song.gameMode || 'music' : defaultMode);
  const [draft, setDraft] = useState<SongDraft>({
    spotify: song?.sources.spotify ? 'https://open.spotify.com/track/' + song.sources.spotify : '',
    title: song?.title || '',
    artist: song?.artist || '',
    year: song?.year ? String(song.year) : '',
    theme: song?.theme || '',
    answer: song?.answer || '',
  });
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastQuery = useRef<RecordingQuery>({
    title: song?.title || '',
    artist: song?.artist || '',
  });
  const recordingBinding = useRef('');
  const replacingSources = useRef(false);
  const keepLegacySource = Boolean(song?.sources.youtube) && !replacingSources.current;
  const revisions = useRef<FieldRevisions>({ title: 0, artist: 0, year: 0 });
  const operation = useRef<{ revision: number; controller?: AbortController }>({ revision: 0 });
  const [busy, setBusy] = useState<'search' | 'links' | 'metadata' | null>(null);
  const [results, setResults] = useState<RecordingSuggestion[]>([]);
  const [selected, setSelected] = useState('');
  const [sources, setSources] = useState<RecordingSpotifyLinks>({
    links: [],
    source: 'musicbrainz',
  });
  const [manualSource, setManualSource] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function write(next: SongDraft) {
    draftRef.current = next;
    setDraft(next);
  }
  function invalidate() {
    operation.current.controller?.abort();
    operation.current = { revision: operation.current.revision + 1 };
  }
  function start(kind: NonNullable<typeof busy>) {
    invalidate();
    const revision = operation.current.revision;
    const controller = new AbortController();
    operation.current.controller = controller;
    setBusy(kind);
    setError('');
    return {
      controller,
      current: () => operation.current.revision === revision && !controller.signal.aborted,
    };
  }
  function go(next: Stage) {
    setHistory((previous) => visitStage(previous, next));
    setError('');
  }
  function back(target?: Stage) {
    invalidate();
    setBusy(null);
    setError('');
    setNotice('');
    const next = backStage(history, target);
    setHistory(next);
  }
  useEffect(() => () => invalidate(), []);
  useEffect(() => {
    const form = formRef.current;
    form?.closest<HTMLElement>('.modal-body')?.scrollTo({ top: 0, behavior: 'instant' });
    const selector =
      stage === 'query'
        ? '[name="title"]'
        : stage === 'source'
          ? manualSource
            ? '[name="spotify"]'
            : '[name="source-mode"]'
          : stage === 'results'
            ? '[name="recording"]'
            : '[name="year"]';
    form?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [stage]);

  function update(field: keyof SongDraft, value: string) {
    invalidate();
    setBusy(null);
    setError('');
    if (field === 'title' || field === 'artist' || field === 'year') revisions.current[field]++;
    if (stage === 'query') {
      recordingBinding.current = '';
      setResults([]);
      setSelected('');
      setSources({ links: [], source: 'musicbrainz' });
      setNotice('');
    }
    write({ ...draftRef.current, [field]: value });
  }
  let trackId = '';
  try {
    if (draft.spotify.trim()) trackId = spotifyId(draft.spotify);
  } catch {
    /* Validate on Continue. */
  }

  async function searchRecordings() {
    if (!draftRef.current.title.trim()) {
      setError(t('musicbrainzFirst.enterTitle'));
      return;
    }
    const query = { title: draftRef.current.title, artist: draftRef.current.artist };
    replacingSources.current = true;
    const known = results.find((item) => item.id === recordingBinding.current) || lastQuery.current;
    const normalized = (value: string) =>
      value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
    if (
      results.length &&
      normalized(query.title) === normalized(known.title) &&
      normalized(query.artist) === normalized(known.artist)
    ) {
      go('results');
      return;
    }
    const before = draftRef.current;
    const next = draftForQuery(before, query, lastQuery.current);
    recordingBinding.current = '';
    lastQuery.current = { title: next.title, artist: next.artist };
    write(next);
    const { controller, current } = start('search');
    setNotice('');
    setResults([]);
    setSources({ links: [], source: 'musicbrainz' });
    try {
      const found = await findRecordingSuggestions(next.title, next.artist, controller.signal);
      if (!current()) return;
      setResults(found);
      setSelected(
        found.some((item) => item.id === recordingBinding.current) ? recordingBinding.current : '',
      );
      if (!found.length) {
        recordingBinding.current = '';
        setManualSource(true);
        setNotice('songWizard.noResults');
      }
      go(stageAfterSearch(found));
    } catch {
      if (current()) {
        recordingBinding.current = '';
        setManualSource(true);
        setNotice('songWizard.queryUnavailable');
        go('source');
      }
    } finally {
      if (current()) setBusy(null);
    }
  }

  async function continueRecording() {
    if (selected === 'manual') {
      if (recordingBinding.current) write({ ...draftRef.current, spotify: '', year: '' });
      recordingBinding.current = '';
      setSources({ links: [], source: 'musicbrainz' });
      setManualSource(true);
      setNotice('songWizard.missingLink');
      go('source');
      return;
    }
    const recording = results.find((item) => item.id === selected);
    if (!recording) {
      setError(t('songWizard.selectRecording'));
      return;
    }
    if (recordingBinding.current !== recording.id) {
      write(draftForSelectedRecording(draftRef.current, recording, recordingBinding.current));
      lastQuery.current = { title: draftRef.current.title, artist: draftRef.current.artist };
    }
    recordingBinding.current = recording.id;
    setNotice('');
    const sourceAtStart = draftRef.current.spotify;
    const { controller, current } = start('links');
    try {
      const found = await loadRecordingSpotifyLinks(recording.id, controller.signal);
      if (!current()) return;
      setSources(found);
      const decision = decisionForLinks(found);
      if (decision.stage === 'review') {
        write(draftWithRecordingSpotifyLink(draftRef.current, decision.spotify, sourceAtStart));
        go('review');
      } else {
        setManualSource(
          !found.links.length ||
            (!!draftRef.current.spotify && !found.links.includes(draftRef.current.spotify)),
        );
        setNotice(found.links.length ? '' : 'songWizard.missingLink');
        go('source');
      }
    } catch {
      if (current()) {
        setSources({ links: [], source: 'musicbrainz' });
        setManualSource(true);
        setNotice('songWizard.linksUnavailable');
        go('source');
      }
    } finally {
      if (current()) setBusy(null);
    }
  }

  async function continueSource() {
    const raw = draftRef.current.spotify.trim();
    if (!raw && keepLegacySource) {
      go('review');
      return;
    }
    if (!raw && manualSource) {
      window.open(
        spotifySearchUrl(draftRef.current.artist + ' ' + draftRef.current.title),
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }
    try {
      spotifyId(raw);
    } catch {
      setError(t(raw ? 'songForm.useTrackLink' : 'songWizard.selectSource'));
      return;
    }
    if (
      recordingBinding.current ||
      (draftRef.current.artist.trim() && draftRef.current.year.trim())
    ) {
      lastQuery.current = { title: draftRef.current.title, artist: draftRef.current.artist };
      go('review');
      return;
    }
    const { controller, current } = start('metadata');
    const started = { ...revisions.current };
    try {
      const metadata = await loadSpotifyTrackDetails(raw, controller.signal);
      if (!current()) return;
      const recording = metadata.matchedRecording;
      write(
        draftWithMetadata(
          draftRef.current,
          {
            title: metadata.title,
            artist: recording?.artist,
            year: recording?.year ? String(recording.year) : undefined,
          },
          started,
          revisions.current,
        ),
      );
    } catch {
      /* All entered fields remain available for manual review. */
    } finally {
      if (current()) {
        setBusy(null);
        lastQuery.current = { title: draftRef.current.title, artist: draftRef.current.artist };
        go('review');
      }
    }
  }

  function submit() {
    if (busy) return;
    if (stage === 'query') {
      void searchRecordings();
      return;
    }
    if (stage === 'results') {
      void continueRecording();
      return;
    }
    if (stage === 'source') {
      void continueSource();
      return;
    }
    try {
      const next = songFromDraft(draftRef.current, gameMode, song, !replacingSources.current);
      invalidate();
      onSave(next);
      onClose();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const loading =
    busy === 'search'
      ? 'songWizard.loadingSearch'
      : busy === 'links'
        ? 'songWizard.loadingLinks'
        : 'songWizard.loadingMetadata';
  const opensSpotify =
    stage === 'source' && manualSource && !draft.spotify.trim() && !keepLegacySource;
  const primary =
    stage === 'query'
      ? t('songWizard.search')
      : stage === 'review'
        ? t(gameMode === 'music' ? 'app.saveTrack' : 'creator.saveCard')
        : opensSpotify
          ? t('songWizard.findSpotify')
          : t('songWizard.next');

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
        <ol className="song-wizard-progress" aria-label={t('songForm.progress')}>
          {song && history.length === 1 && stage === 'review' && (
            <li>
              <button
                type="button"
                onClick={() => {
                  invalidate();
                  setBusy(null);
                  setHistory(['query']);
                }}
              >
                {t('songWizard.changeQuery')}
              </button>
            </li>
          )}
          {history.map((item, index) => (
            <li key={item} aria-current={item === stage ? 'step' : undefined}>
              <button type="button" onClick={() => item !== stage && back(item)}>
                <span aria-hidden="true">{index + 1}</span>
                {t('songWizard.stage.' + item)}
              </button>
            </li>
          ))}
        </ol>
      }
      footer={
        <div className="modal-actions song-form-actions">
          <button
            className="secondary"
            type="button"
            onClick={history.length === 1 ? onClose : () => back()}
          >
            {history.length > 1 && <ArrowLeft size={17} aria-hidden="true" />}
            {t(history.length === 1 ? 'app.cancel' : 'songForm.back')}
          </button>
          <button
            className="primary"
            type="submit"
            form={formId}
            disabled={
              !!busy ||
              (stage === 'results' && !selected) ||
              (stage === 'source' && !manualSource && !trackId && !keepLegacySource)
            }
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={17} aria-hidden="true" />
                {t(loading)}
              </>
            ) : (
              <>
                {stage === 'query' ? (
                  <Search size={17} aria-hidden="true" />
                ) : stage === 'review' ? (
                  <Check size={17} aria-hidden="true" />
                ) : null}
                {primary}
                {stage !== 'query' && stage !== 'review' && (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="song-form">
        <form
          id={formId}
          key={stage}
          ref={formRef}
          className={'song-form-page song-wizard-' + stage}
          noValidate={stage !== 'review'}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {stage === 'query' && (
            <>
              <p className="hint">{t('songWizard.queryHint')}</p>
              <div className="form-grid">
                <label>
                  {t('creator.recordingTitle')}
                  <input
                    name="title"
                    type="text"
                    autoFocus={!song}
                    required
                    maxLength={200}
                    value={draft.title}
                    onChange={(event) => update('title', event.target.value)}
                    placeholder={t('app.forExampleDancingQueen')}
                  />
                </label>
                <label>
                  {t('songWizard.optionalArtist')}
                  <input
                    name="artist"
                    type="text"
                    maxLength={200}
                    value={draft.artist}
                    onChange={(event) => update('artist', event.target.value)}
                    placeholder="ABBA"
                  />
                </label>
              </div>
            </>
          )}

          {stage === 'results' && (
            <fieldset className="song-wizard-results-fieldset">
              <legend className="sr-only">{t('songWizard.chooseRecording')}</legend>
              <div className="song-wizard-list">
                {results.map((recording) => (
                  <label className="song-wizard-option" key={recording.id}>
                    <input
                      type="radio"
                      name="recording"
                      value={recording.id}
                      checked={selected === recording.id}
                      onChange={() => {
                        invalidate();
                        setBusy(null);
                        setSelected(recording.id);
                        setError('');
                      }}
                    />
                    <span className="song-recording-year">
                      {recording.year || t('songForm.noDate')}
                    </span>
                    <span className="song-recording-description">
                      <strong>{recording.title}</strong>
                      <span>{recording.artist}</span>
                      {recording.disambiguation && <small>{recording.disambiguation}</small>}
                    </span>
                  </label>
                ))}
                <label className="song-wizard-option">
                  <input
                    type="radio"
                    name="recording"
                    value="manual"
                    checked={selected === 'manual'}
                    onChange={() => {
                      invalidate();
                      setBusy(null);
                      setSelected('manual');
                    }}
                  />
                  <span>{t('songWizard.manualChoice')}</span>
                </label>
              </div>
            </fieldset>
          )}

          {stage === 'source' && (
            <>
              <div className="song-wizard-summary">
                <span>
                  {t(
                    recordingBinding.current
                      ? 'songWizard.selectedRecording'
                      : 'songWizard.stage.query',
                  )}
                </span>
                <strong>{draft.title}</strong>
                <span>
                  {draft.artist}
                  {draft.year ? ' · ' + draft.year : ''}
                </span>
              </div>
              {notice && (
                <p className="hint" role="status">
                  {t(notice)}
                </p>
              )}
              {sources.links.length > 0 && (
                <fieldset className="song-wizard-results-fieldset">
                  <legend>{t('songWizard.chooseSource')}</legend>
                  <p className="hint">
                    {t(
                      sources.source === 'listenbrainz'
                        ? 'songWizard.proposedSourceHint'
                        : 'songWizard.directSourceHint',
                    )}
                  </p>
                  <div className="song-wizard-list">
                    <label className="song-wizard-option">
                      <input
                        type="radio"
                        name="source-mode"
                        checked={manualSource}
                        onChange={() => {
                          setManualSource(true);
                          if (sources.links.includes(draft.spotify)) update('spotify', '');
                        }}
                      />
                      <span>{t('songWizard.manualSource')}</span>
                    </label>
                    {sources.links.map((link, index) => (
                      <label className="song-wizard-option" key={link}>
                        <input
                          type="radio"
                          name="source-mode"
                          checked={!manualSource && draft.spotify === link}
                          onChange={() => {
                            setManualSource(false);
                            update('spotify', link);
                          }}
                        />
                        <span className="song-recording-description">
                          <strong>{t('songWizard.spotifyOption', { number: index + 1 })}</strong>
                          <small>{link}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {manualSource && (
                <>
                  <label>
                    {t('songWizard.manualLink')}
                    <input
                      name="spotify"
                      type="text"
                      inputMode="url"
                      aria-describedby={formId + '-source-help'}
                      value={draft.spotify}
                      onChange={(event) => update('spotify', event.target.value)}
                      placeholder="https://open.spotify.com/track/…"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <p className="hint" id={formId + '-source-help'}>
                    {t('songWizard.sourceHint')}
                  </p>
                </>
              )}
              {trackId && (
                <div className="song-wizard-source-preview">
                  <iframe
                    key={trackId}
                    title={t('songForm.previewTitle')}
                    src={'https://open.spotify.com/embed/track/' + trackId}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  <p className="hint">{t('songForm.previewHint')}</p>
                </div>
              )}
            </>
          )}

          {stage === 'review' && (
            <>
              <p className="hint">{t('songWizard.reviewHint')}</p>
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
                  />
                </label>
                <CardThemeSelect
                  value={draft.theme as Theme | ''}
                  deckTheme={defaultTheme}
                  onChange={(theme) => update('theme', theme)}
                />
              </div>
              {trackId && (
                <div className="song-wizard-source-preview">
                  <iframe
                    key={trackId}
                    title={t('songForm.previewTitle')}
                    src={'https://open.spotify.com/embed/track/' + trackId}
                    width="100%"
                    height="152"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                  <p className="hint">{t('songForm.previewHint')}</p>
                </div>
              )}
              <details className="song-advanced-settings">
                <summary>{t('metadataAutofill.moreSettings')}</summary>
                <GameModePicker value={gameMode} onChange={setGameMode} compact />
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setManualSource(!sources.links.length);
                    setHistory((previous) =>
                      visitStage(
                        previous.filter((item) => item !== 'review'),
                        'source',
                      ),
                    );
                  }}
                >
                  {t('songWizard.stage.source')}
                </button>
              </details>
              <p className="hint">
                {gameMode === 'music'
                  ? t('app.theYearRefersToThisParticularRecording')
                  : t('creator.yearNotAnswer')}
              </p>
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
                      <ArrowUp size={18} />
                      {t('shell.moveUp')}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={!onMove?.down}
                      onClick={onMove?.down}
                    >
                      <ArrowDown size={18} />
                      {t('shell.moveDown')}
                    </button>
                    <button type="button" className="danger" onClick={onDelete}>
                      <Trash2 size={18} />
                      {t('shell.deleteSong')}
                    </button>
                  </div>
                </details>
              )}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {displayTranslation(error)}
            </p>
          )}
          {busy && (
            <p className="song-wizard-feedback hint" role="status">
              {t(loading)}
            </p>
          )}
        </form>
      </div>
    </Modal>
  );
}
