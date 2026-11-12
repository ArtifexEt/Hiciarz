import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDown,
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
import { spotifyId, themeNames, themes, validateSong, type GameMode, type Song } from './model';
import {
  findRecordingSuggestions,
  loadSpotifyTrack,
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

export function draftForRecording(draft: SongDraft, recording: RecordingSuggestion): SongDraft {
  return {
    ...draft,
    title: recording.title,
    artist: recording.artist,
    year: recording.year ? String(recording.year) : '',
  };
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
  onSave,
  onClose,
  onDelete,
  onMove,
}: {
  song?: Song;
  defaultMode?: GameMode;
  onSave: (song: Song) => void;
  onClose: () => void;
  onDelete?: () => void;
  onMove?: { up?: () => void; down?: () => void };
}) {
  const { t } = useTranslation();
  const spotifyInputId = useId();
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
  const operation = useRef<{ revision: number; controller?: AbortController }>({ revision: 0 });
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
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

  function update(field: keyof SongDraft, value: string) {
    let next = { ...draftRef.current, [field]: value };
    if (field === 'spotify') {
      invalidate();
      setBusy(false);
      setSuggestions([]);
      setSelectedRecording('');
      setLookupMessage('');
      setLookupError('');
      next = draftWithSpotifySource(draftRef.current, value, suggestedFields.current);
      suggestedFields.current = {};
    } else if (field === 'title' || field === 'artist' || field === 'year') {
      revisions.current[field]++;
      setSelectedRecording('');
      delete suggestedFields.current[field];
    }
    draftRef.current = next;
    setDraft(next);
    setError('');
  }

  let trackId = '';
  try {
    if (draft.spotify.trim()) trackId = spotifyId(draft.spotify);
  } catch {
    // Keep the input editable. Validation errors appear when loading or saving.
  }

  async function lookup(includeSpotify: boolean) {
    if (includeSpotify) {
      try {
        spotifyId(draftRef.current.spotify);
      } catch (error) {
        setLookupError(t('songForm.useTrackLink'));
        return;
      }
    }
    invalidate();
    const revision = operation.current.revision;
    const controller = new AbortController();
    operation.current.controller = controller;
    const current = () => operation.current.revision === revision && !controller.signal.aborted;
    setBusy(true);
    setLookupError('');
    setLookupMessage('');
    setSuggestions([]);
    setSelectedRecording('');
    try {
      if (includeSpotify) {
        const titleRevision = revisions.current.title;
        const metadata = await loadSpotifyTrack(draftRef.current.spotify, controller.signal);
        if (!current()) return;
        if (!draftRef.current.title.trim() && revisions.current.title === titleRevision) {
          const next = { ...draftRef.current, title: metadata.title };
          suggestedFields.current.title = metadata.title;
          draftRef.current = next;
          setDraft(next);
        }
      }
      if (!draftRef.current.title.trim()) {
        setLookupMessage('songForm.enterTitleForYear');
        return;
      }
      // Spotify oEmbed provides no performer. Confirm it before looking up a year.
      if (!draftRef.current.artist.trim()) return;
      const titleRevision = revisions.current.title;
      const artistRevision = revisions.current.artist;
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
      if (!found.length) setLookupMessage('songForm.noSuggestions');
    } catch (error) {
      if (current()) setLookupError((error as Error).message);
    } finally {
      if (current()) setBusy(false);
    }
  }

  function chooseRecording(recording: RecordingSuggestion) {
    const next = draftForRecording(draftRef.current, recording);
    suggestedFields.current = { title: next.title, artist: next.artist, year: next.year };
    revisions.current.title++;
    revisions.current.artist++;
    revisions.current.year++;
    draftRef.current = next;
    setDraft(next);
    setSelectedRecording(recording.id);
    setError('');
  }

  const searchQuery = search.trim() || `${draft.artist} ${draft.title}`.trim();
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
    >
      <form
        className="song-form"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const next = songFromDraft(draftRef.current, gameMode, song);
            invalidate();
            onSave(next);
            onClose();
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        <div className="song-spotify-link">
          <label htmlFor={spotifyInputId}>{t('songForm.spotifyLink')}</label>
          <div className="song-source-entry">
            <input
              id={spotifyInputId}
              name="spotify"
              inputMode="url"
              autoFocus={!song}
              required={!song?.sources.youtube}
              value={draft.spotify}
              onChange={(event) => update('spotify', event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (!busy) void lookup(true);
                }
              }}
              placeholder="https://open.spotify.com/track/…"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="secondary"
              disabled={busy || !draft.spotify.trim()}
              onClick={() => void lookup(true)}
            >
              {busy ? <LoaderCircle size={17} className="spin" /> : <Search size={17} />}
              {t('songForm.loadDetails')}
            </button>
          </div>
        </div>
        <details className="song-spotify-finder">
          <summary>{t('songForm.needLink')}</summary>
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
        {trackId && (
          <div className="song-spotify-player">
            <iframe
              key={trackId}
              title={t('songForm.previewTitle')}
              src={`https://open.spotify.com/embed/track/${trackId}`}
              width="100%"
              height="152"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <a
              className="text-button"
              href={`https://open.spotify.com/track/${trackId}`}
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
        <GameModePicker value={gameMode} onChange={setGameMode} compact />
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
                  gameMode === 'movie' ? t('app.eGJurassicPark') : t('app.eGTheWitcher3WildHunt')
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
              placeholder={gameMode === 'game' ? '2011' : gameMode === 'movie' ? '1993' : '1976'}
            />
          </label>
          <label>
            {t('app.cardTheme2')}
            <select
              name="theme"
              value={draft.theme}
              onChange={(event) => update('theme', event.target.value)}
            >
              <option value="">{t('app.sameAsTheDeck')}</option>
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {themeNames[theme]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="song-year-actions">
          <button
            className="text-button"
            type="button"
            disabled={busy || !draft.title.trim() || !draft.artist.trim()}
            onClick={() => void lookup(false)}
          >
            <Search size={15} aria-hidden="true" /> {t('songForm.findYear')}
          </button>
        </div>
        <div className="song-lookup-feedback" aria-live="polite" aria-atomic="true">
          {busy && (
            <p className="hint" role="status">
              {t('songForm.lookingUp')}
            </p>
          )}
          {!busy && draft.title.trim() && !draft.artist.trim() && (
            <p className="hint" role="status">
              {t('songForm.enterArtistForYear')}
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
        {suggestions.length > 0 && (
          <fieldset className="song-recording-results">
            <legend>{t('songForm.chooseRecording')}</legend>
            <div className="song-recording-list">
              {suggestions.map((recording) => (
                <button
                  key={recording.id}
                  type="button"
                  className="song-recording-choice"
                  aria-pressed={selectedRecording === recording.id}
                  onClick={() => chooseRecording(recording)}
                >
                  <span className="song-recording-year">
                    {recording.year || t('songForm.noDate')}
                  </span>
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
        )}
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
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {t('app.cancel')}
          </button>
          <button className="primary" type="submit">
            <Check size={17} /> {gameMode === 'music' ? t('app.saveTrack') : t('creator.saveCard')}
          </button>
        </div>
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
      </form>
    </Modal>
  );
}
