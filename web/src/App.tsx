import {
  t as tr,
  displayTranslation,
  getLanguage,
  useTranslation,
  languageNames,
  type Language,
} from './i18n';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  Suspense,
  lazy,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  Headphones,
  House,
  Info,
  LoaderCircle,
  MoreHorizontal,
  Music2,
  Palette,
  Play,
  Plus,
  Printer,
  Radio,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Shuffle,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { qrImage } from './qr';
import Landing from './Landing';
import Modal from './Modal';
import AppNavigation from './AppNavigation';
import PlaybackSettings from './PlaybackSettings';
import AppInstall, { ConnectionNotice } from './AppInstall';
import {
  parseAppView,
  parseEntryModal,
  parseBingoLevel,
  keepScannerPairing,
  urlForView,
  urlForModal,
  urlForBingoLevel,
  navigationState,
  readNavigationState,
  type AppView,
  type AppModal,
} from './navigation';
import type { BingoLevel } from './bingo';
import FishFestivities from './FishFestivities';
import SpotifyAccount from './SpotifyAccount';
import SpotifyLoginNotice from './SpotifyLoginNotice';
import SpotifySetup from './SpotifySetup';
import DocumentationLinks, { ReportIssueLink } from './DocumentationLinks';
import {
  isSpotifySettingsStorageKey,
  openSpotifySetup,
  spotifyClientId,
  spotifySettingsEvent,
  spotifySetupEvent,
  type SpotifyPurpose,
} from './spotify-settings';
import PlayingCard from './PlayingCard';
import GameModePicker from './GameModePicker';
import CreatorSteps, { type CreatorStep } from './CreatorSteps';
import type { PlaybackState } from './playback';
import { vibrateOnScan } from './scan-feedback';
import {
  cardPlaybackSource,
  initialPlaybackOutput,
  scannerPlaybackRoute,
  type PlaybackOutput,
} from './scanner-playback';
import PlaylistExamples from './PlaylistExamples';
import { createExampleDeck } from './examples';
import playlistPromptPl from '../docs/playlist-prompt.txt?raw';
import playlistPromptEn from '../docs/playlist-prompt.en.txt?raw';
import CardPreview from './CardPreview';
import {
  appVersion,
  applyUpdate,
  checkForUpdates,
  subscribeToUpdates,
  updateIsReady,
} from './updates';
import {
  type Card,
  type Deck,
  type Song,
  type Theme,
  csvExport,
  download,
  findDeckForCard,
  type GameMode,
  mergeSongs,
  newDeck,
  parseImport,
  readQR,
  themes,
  themeNames,
  validateSong,
} from './model';
import { imageData, loadDecks, saveDecks } from './storage';
import { createLatestRequest } from './latest-request';
import PDFExportProgress, { setPDFProgress } from './PDFExportProgress';
import PrintCards from './PrintCards';
import { preparePDFPreview } from './pdf-preview';
import { asset, themeArt, themeDescriptions } from './themes';
import type { SourceCheck } from './availability';
import { useConnection, type Command } from './connection';
const Camera = lazy(() => import('./Camera'));
import Players from './Players';
import { SpotifyRemotePanel, useSpotifyRemote } from './SpotifyRemote';
const BingoGame = lazy(() => import('./BingoGame'));
import {
  beginSpotifyLogin,
  disconnectSpotify,
  finishSpotify,
  importPlaylist,
  spotifyConfigured,
  spotifyConnected,
  spotifyLoginPurpose,
} from './spotify';
type Mode = AppView;
function trackCount(count: number) {
  const form = new Intl.PluralRules(getLanguage()).select(count);
  return tr('app.trackCount.' + form, { count });
}
export function QR({ value, className = '' }: { value: string; className?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let live = true;
    const image = qrImage(value);
    if (live) setUrl(image);
    return () => {
      live = false;
    };
  }, [value]);
  return url ? (
    <img className={'qr ' + className} src={url} alt={tr('app.qrCode')} data-qr-value={value} />
  ) : (
    <span className="qr-loading" />
  );
}
function ThemePicker({ value, onChange }: { value: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="theme-grid">
      {themes.map((t) => (
        <button
          key={t}
          className={'theme-option ' + (value === t ? 'chosen' : '')}
          aria-label={tr('app.cardTheme') + themeNames[t]}
          aria-pressed={value === t}
          onClick={() => onChange(t)}
        >
          <span style={{ backgroundImage: `url("${themeArt(t)}")` }}>
            {value === t && <Check size={18} />}
          </span>
          <strong>{themeNames[t]}</strong>
          <small>{themeDescriptions[t]}</small>
        </button>
      ))}
    </div>
  );
}
function SongForm({
  song,
  defaultMode = 'music',
  onSave,
  onClose,
  onDelete,
  onMove,
}: {
  song?: Song;
  defaultMode?: GameMode;
  onSave: (s: Song) => void;
  onClose: () => void;
  onDelete?: () => void;
  onMove?: { up?: () => void; down?: () => void };
}) {
  const [error, setError] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>(song ? song.gameMode || 'music' : defaultMode);
  return (
    <Modal
      title={
        song
          ? tr('app.editTrack')
          : gameMode === 'music'
            ? tr('app.addYourHit')
            : tr('creator.newCardTitle.' + gameMode)
      }
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            onSave(
              validateSong({
                id: song?.id,
                title: f.get('title'),
                artist: f.get('artist'),
                year: f.get('year'),
                theme: f.get('theme') || undefined,
                sources: { spotify: f.get('spotify'), youtube: f.get('youtube') },
                review: false,
                gameMode,
                answer: f.get('answer'),
              }),
            );
            onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <GameModePicker value={gameMode} onChange={setGameMode} compact />
        <div className="form-grid">
          {gameMode !== 'music' && (
            <label className="answer-entry">
              {tr('creator.answer.' + gameMode)}
              <input
                name="answer"
                autoFocus
                required
                maxLength={200}
                defaultValue={song?.answer || ''}
                placeholder={
                  gameMode === 'movie' ? tr('app.eGJurassicPark') : tr('app.eGTheWitcher3WildHunt')
                }
              />
            </label>
          )}
          <label>
            {tr('creator.recordingTitle')}
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={song?.title}
              placeholder={
                gameMode === 'music'
                  ? tr('app.forExampleDancingQueen')
                  : tr('creator.recordingExample.' + gameMode)
              }
              autoFocus={gameMode === 'music'}
            />
          </label>
          <label>
            {gameMode === 'music' ? tr('app.artist') : tr('creator.recordingArtist')}
            <input
              name="artist"
              required
              maxLength={200}
              defaultValue={song?.artist}
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
            {gameMode === 'music' ? tr('app.yearForTheGame') : tr('creator.recordingYear')}
            <input
              name="year"
              type="number"
              required
              min="1000"
              max="2100"
              defaultValue={song?.year || ''}
              placeholder={gameMode === 'game' ? '2011' : gameMode === 'movie' ? '1993' : '1976'}
            />
          </label>
          <label>
            {tr('app.cardTheme2')}
            <select name="theme" defaultValue={song?.theme || ''}>
              <option value="">{tr('app.sameAsTheDeck')}</option>
              {themes.map((t) => (
                <option key={t} value={t}>
                  {themeNames[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-divider">
          <span>{tr('app.playbackSources')}</span>
          <small>{tr('app.addAtLeastOne')}</small>
        </div>
        <label>
          {tr('app.spotify')}
          <input
            name="spotify"
            defaultValue={
              song?.sources.spotify ? 'https://open.spotify.com/track/' + song.sources.spotify : ''
            }
            placeholder="https://open.spotify.com/track/…"
          />
        </label>
        <label>
          {tr('app.youtube')}
          <input
            name="youtube"
            defaultValue={song?.sources.youtube ? 'https://youtu.be/' + song.sources.youtube : ''}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>
        <p className="hint">
          {gameMode === 'music'
            ? tr('app.theYearRefersToThisParticularRecording')
            : tr('creator.yearNotAnswer')}
        </p>
        {error && (
          <p className="error" role="alert">
            {displayTranslation(error)}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            {tr('app.cancel')}
          </button>
          <button className="primary" type="submit">
            <Check size={17} />{' '}
            {gameMode === 'music' ? tr('app.saveTrack') : tr('creator.saveCard')}
          </button>
        </div>
        {song && (
          <details className="song-extra-options">
            <summary>{tr('shell.moreSongOptions')}</summary>
            <div>
              <button
                type="button"
                className="secondary"
                disabled={!onMove?.up}
                onClick={onMove?.up}
              >
                <ArrowUp size={18} />
                {tr('shell.moveUp')}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!onMove?.down}
                onClick={onMove?.down}
              >
                <ArrowDown size={18} />
                {tr('shell.moveDown')}
              </button>
              <button type="button" className="danger" onClick={onDelete}>
                <Trash2 size={18} />
                {tr('shell.deleteSong')}
              </button>
            </div>
          </details>
        )}
      </form>
    </Modal>
  );
}
function SpotifyImport({
  onImport,
  onClose,
  initialPlaylist,
  onExamples,
}: {
  onImport: (songs: Song[], mode: 'append' | 'replace', note: string) => void;
  onClose: () => void;
  initialPlaylist: string;
  onExamples: () => void;
}) {
  const [mode, setMode] = useState<'append' | 'replace'>(() =>
      sessionStorage.getItem('spotify-import-mode') === 'replace' ? 'replace' : 'append',
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [playlist, setPlaylist] = useState(initialPlaylist);
  return (
    <Modal title={tr('app.importASpotifyPlaylist')} onClose={onClose}>
      <div className="notice spotify-import-access">
        <Info size={22} aria-hidden="true" />
        <div>
          <strong>{tr('app.whichPlaylistsCanYouImport')}</strong>
          <p>{tr('app.inDevelopmentModeSpotifyProvidesYourOwn')}</p>
          <button className="text-button" onClick={onExamples}>
            {tr('app.chooseAnExampleWithoutSigningIn')} <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <p className="muted">{tr('app.chooseWhatToDoWithYourCurrent')}</p>
      <div className="choice-list">
        <label>
          <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} />
          <span>
            <strong>{tr('app.appendNewTracks')}</strong>
            <small>{tr('app.keepYourTracksAndEditsSkipDuplicates')}</small>
          </span>
        </label>
        <label>
          <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
          <span>
            <strong>{tr('app.replaceTheCurrentList')}</strong>
            <small>{tr('app.removeTheCurrentListAndImportThe')}</small>
          </span>
        </label>
      </div>
      {!spotifyConnected() ? (
        <>
          <SpotifyLoginNotice purpose="import" />
          <button
            className="primary full"
            onClick={() => {
              sessionStorage.setItem('spotify-import-mode', mode);
              sessionStorage.setItem('spotify-import-playlist', playlist);
              beginSpotifyLogin().catch((e) => setError(e.message));
            }}
          >
            {spotifyConfigured() ? tr('app.connectToSpotify') : tr('app.setUpSpotifyConnection')}
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setError('');
            try {
              const r = await importPlaylist(String(f.get('playlist')));
              if (!r.songs.length) throw new Error(tr('app.thePlaylistHasNoTracksThatCan'));
              onImport(
                r.songs,
                mode,
                tr('app.importSummary', { name: r.name, skipped: r.skipped }),
              );
              sessionStorage.removeItem('spotify-import-playlist');
              onClose();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {tr('app.playlistLink')}
            <input
              name="playlist"
              required
              value={playlist}
              onChange={(e) => setPlaylist(e.target.value)}
              placeholder={tr('app.pasteALinkToYourPlaylist')}
            />
          </label>
          <p className="hint">{tr('app.weKeepPlaylistOrderYearsFromAlbum')}</p>
          <button disabled={busy} className="primary full" type="submit">
            {busy ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}{' '}
            {busy ? tr('app.fetchingTracks') : tr('app.importPlaylist')}
          </button>
          <button
            className="quiet"
            type="button"
            onClick={() => {
              disconnectSpotify();
              onClose();
            }}
          >
            {tr('app.disconnectSpotify')}
          </button>
        </form>
      )}
      <button
        className="spotify-settings-link"
        onClick={() => {
          sessionStorage.setItem('spotify-import-mode', mode);
          sessionStorage.setItem('spotify-import-playlist', playlist);
          openSpotifySetup('import');
        }}
      >
        <Settings2 size={15} /> {tr('app.spotifyConnectionSettings')}
      </button>
      {error && (
        <p className="error" role="alert">
          {displayTranslation(error)}
        </p>
      )}
    </Modal>
  );
}
export default function App() {
  const { language, setLanguage } = useTranslation();
  const playlistPrompt = language === 'en' ? playlistPromptEn : playlistPromptPl;
  const [draggingFile, setDraggingFile] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [bingoOpened, setBingoOpened] = useState(false);
  const [bingoLevel, setBingoLevel] = useState<BingoLevel>(() => parseBingoLevel(location.href));
  const updateAvailable = useSyncExternalStore(subscribeToUpdates, updateIsReady);
  const [updating, setUpdating] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]),
    [loaded, setLoaded] = useState(false),
    [activeId, setActiveIdState] = useState(''),
    [mode, setMode] = useState<Mode>(() => parseAppView(location.href)),
    [tab, setTab] = useState<CreatorStep>('songs');
  useEffect(() => {
    if (mode === 'bingo') setBingoOpened(true);
  }, [mode]);
  const [modal, setModal] = useState<AppModal>(() => parseEntryModal(location.href)),
    [editSong, setEditSong] = useState<Song>(),
    [filter, setFilter] = useState(''),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [previewIndex, setPreviewIndex] = useState(0),
    [showBack, setShowBack] = useState(false),
    [previewOpen, setPreviewOpen] = useState(false),
    [message, setMessage] = useState(''),
    [storageError, setStorageError] = useState(''),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<{ data: Deck | Song[]; name: string }>(),
    [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [uiTheme, setUiTheme] = useState<Theme>(
      (localStorage.getItem('hiciarz-theme') as Theme) || 'classic',
    ),
    [card, setCard] = useState<Card | null>(null),
    [source, setSource] = useState<'spotify' | 'youtube'>('spotify'),
    [preferred, setPreferred] = useState<'spotify' | 'youtube'>('spotify'),
    [playState, setPlayState] = useState(tr('app.setUpPlaybackAndScanACard')),
    [command, setCommand] = useState<{ type: Command; seq: number } | null>(null);
  const displayTheme = (mode === 'scanner' || mode === 'player') && card ? card.theme : uiTheme;
  const [spotifySetup, setSpotifySetup] = useState<{
    purpose?: SpotifyPurpose;
    clientId?: string;
    revision: number;
  }>({ revision: 0 });
  const [, refreshSpotifySettings] = useState(0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [playerRevision, setPlayerRevision] = useState(0);
  const playbackTransition = useRef(false);
  const historyPopPending = useRef(false);
  const [scanFeedback, setScanFeedback] = useState<{ sequence: number; kind: 'card' | 'pair' }>();
  const reportPlayback = useCallback((text: string, state?: PlaybackState) => {
    setPlayState(text);
    if (state) setPlaybackState(state);
  }, []);
  const [output, setOutputState] = useState<PlaybackOutput>(() =>
    mode === 'player'
      ? 'browser'
      : initialPlaybackOutput(localStorage.getItem('hiciarz-output'), spotifyConfigured()),
  );
  const setOutput = async (value: PlaybackOutput) => {
    if (playbackTransition.current) return false;
    if (value === outputRef.current) return true;
    playbackTransition.current = true;
    try {
      if (outputRef.current === 'spotify' && card) await spotifyRemote.stop();
      if (card && mode === 'scanner' && outputRef.current === 'browser')
        room.send(undefined, 'stop');
      if (mode !== 'player' && value !== 'browser' && (room.connected || room.pairUrl))
        room.disconnect();
      clearRound();
      outputRef.current = value;
      setOutputState(value);
      localStorage.setItem('hiciarz-output', value);
      return true;
    } catch (error) {
      notify((error as Error).message);
      return false;
    } finally {
      playbackTransition.current = false;
      if (historyPopPending.current) {
        historyPopPending.current = false;
        setTimeout(
          () => popNavigation.current(new PopStateEvent('popstate', { state: history.state })),
          0,
        );
      }
    }
  };
  const spotifyRemote = useSpotifyRemote(
    card,
    command,
    output === 'spotify' && (mode === 'scanner' || mode === 'player' || modal === 'playback'),
    reportPlayback,
    mode === 'player' ? 'player' : 'scanner',
  );
  const outputRef = useRef(output);
  outputRef.current = output;
  const backgroundRequests = useRef(createLatestRequest()).current;
  const invalidateBackground = useCallback(() => {
    backgroundRequests.invalidate();
    setBackgroundBusy(false);
  }, [backgroundRequests]);
  const setActiveId = useCallback(
    (id: string) => {
      invalidateBackground();
      setActiveIdState(id);
    },
    [invalidateBackground],
  );
  useEffect(() => () => backgroundRequests.invalidate(), [backgroundRequests]);
  const fileRef = useRef<HTMLInputElement>(null),
    lastScan = useRef({ id: '', time: 0 }),
    incomingCard = useRef<Card | null>(null),
    saveQueue = useRef(Promise.resolve()),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    scanFeedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    scanSequence = useRef(0);
  const [checks, setChecks] = useState<SourceCheck[]>([]),
    [checking, setChecking] = useState(false),
    [checkProgress, setCheckProgress] = useState(0);
  const pdfAbort = useRef<AbortController | null>(null);
  const [printError, setPrintError] = useState('');
  const [printReady, setPrintReady] = useState<{
    deck: Deck;
    count: number;
    destination: 'download' | 'print';
  }>();
  const deck = decks.find((d) => d.id === activeId) || decks[0];
  useEffect(() => {
    if (deck && !deck.songs.length) setTab('songs');
  }, [deck?.id, deck?.songs.length]);
  const printCount = deck
    ? selected.size
      ? deck.songs.filter((s) => selected.has(s.id)).length
      : deck.songs.length
    : 0;
  function openPrintCards() {
    setPrintError('');
    setModal('print-cards');
  }
  const notify = useCallback((s: string) => {
    setMessage(s);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), 6000);
  }, []);
  async function readImportFile(file: File) {
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error(tr('app.theFileIsTooLargeTheLimit'));
      setPending({ data: parseImport(await file.text(), file.name), name: file.name });
      setImportMode('append');
      setModal('file');
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function readBackground(file: File) {
    setBackgroundBusy(true);
    await backgroundRequests.run(
      () => imageData(file),
      (back) => {
        setBackgroundBusy(false);
        updateDeck({ back });
        setShowBack(true);
      },
      (error) => {
        setBackgroundBusy(false);
        notify((error as Error).message);
      },
    );
  }
  function clearScanFeedback() {
    clearTimeout(scanFeedbackTimer.current);
    setScanFeedback(undefined);
  }
  function confirmScan(kind: 'card' | 'pair') {
    clearTimeout(scanFeedbackTimer.current);
    setScanFeedback({ sequence: ++scanSequence.current, kind });
    scanFeedbackTimer.current = setTimeout(() => setScanFeedback(undefined), 2400);
    vibrateOnScan();
  }
  function receive(c: Card) {
    if (playbackTransition.current) return;
    setMessage('');
    setCard(c);
    setCommand(null);
    setSource(cardPlaybackSource(c, preferred));
    setPlayState(tr('app.loadingTheTrackFromYourCard'));
    setPlaybackState('loading');
  }
  function playerCommand(c: Command) {
    setCommand({ type: c, seq: Date.now() });
    setPlaybackState('loading');
  }
  const room = useConnection(receive, playerCommand, (feedback) => {
    if (mode === 'scanner' && output === 'browser' && feedback.cardId === card?.id)
      reportPlayback(feedback.message, feedback.state);
  });
  useEffect(() => {
    if (mode === 'player' && card && room.connected)
      room.reportPlayback({ cardId: card.id, state: playbackState, message: playState });
  }, [mode, card, room.connected, playbackState, playState]);
  const gameReady =
    output === 'spotify' ? spotifyRemote.ready : output === 'local' || room.connected;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [mode, card?.id]);
  useEffect(() => {
    if (mode === 'scanner' && output === 'browser' && card && !room.connected) {
      setCard(null);
      setCommand(null);
      setPlayState(tr('app.thePlayerConnectionWasLostScanThe'));
    }
  }, [mode, output, card, room.connected]);
  useEffect(() => {
    if (mode !== 'scanner' || output !== 'browser' || !card || playbackState !== 'loading') return;
    const timeout = setTimeout(
      () => reportPlayback(tr('app.thePlayerHasNotConfirmedPlaybackCheck'), 'error'),
      22000,
    );
    return () => clearTimeout(timeout);
  }, [mode, output, card, playbackState, reportPlayback]);
  const cardDeck = card ? findDeckForCard(decks, card) : undefined;
  const playingBack = cardDeck?.print.style === 'laser' ? themeArt('laser') : cardDeck?.back;
  function clearRound() {
    clearScanFeedback();
    setCard(null);
    setCommand(null);
    lastScan.current = { id: '', time: 0 };
    setPlaybackState('paused');
    setPlayState(tr('app.startTheCameraAndScanTheNext'));
  }
  async function nextCard() {
    if (playbackTransition.current) return;
    playbackTransition.current = true;
    try {
      if (outputRef.current === 'spotify' && card) await spotifyRemote.stop();
      if (outputRef.current === 'browser' && mode === 'scanner' && card)
        room.send(undefined, 'stop');
      clearRound();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      playbackTransition.current = false;
      if (historyPopPending.current) {
        historyPopPending.current = false;
        setTimeout(
          () => popNavigation.current(new PopStateEvent('popstate', { state: history.state })),
          0,
        );
      }
    }
  }
  function togglePlayback() {
    if (!card) return;
    if (playbackState === 'error') {
      if (mode === 'scanner' && output === 'browser') {
        if (room.send(card)) reportPlayback(tr('app.waitingForThePlayer'), 'loading');
      } else {
        setPlayerRevision((revision) => revision + 1);
        receive({ ...card });
      }
      return;
    }
    const action = playbackState === 'playing' ? 'pause' : 'resume';
    sendPlaybackCommand(action);
  }
  function sendPlaybackCommand(action: Command) {
    if (mode === 'scanner' && output === 'browser') {
      if (room.send(undefined, action)) reportPlayback(tr('app.waitingForThePlayer'), 'loading');
    } else playerCommand(action);
  }
  useEffect(() => {
    const show = (event: Event) => {
      const purpose = (event as CustomEvent<{ purpose?: SpotifyPurpose }>).detail?.purpose;
      if (purpose === 'player')
        sessionStorage.setItem(
          'hiciarz-spotify-return-mode',
          mode === 'player' ? 'player' : 'scanner',
        );
      setSpotifySetup((previous) => ({ purpose, revision: previous.revision + 1 }));
      setModal('spotify-setup');
    };
    window.addEventListener(spotifySetupEvent, show);
    return () => window.removeEventListener(spotifySetupEvent, show);
  }, [mode]);
  useEffect(() => {
    let previousClientId = spotifyClientId();
    const changed = () => {
      previousClientId = spotifyClientId();
      refreshSpotifySettings((n) => n + 1);
    };
    const storageChanged = (event: StorageEvent) => {
      if (!isSpotifySettingsStorageKey(event.key)) return;
      if (previousClientId !== spotifyClientId() || event.key === null) disconnectSpotify();
      changed();
    };
    window.addEventListener(spotifySettingsEvent, changed);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener(spotifySettingsEvent, changed);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);
  useEffect(() => {
    let live = true;
    loadDecks()
      .then((ds) => {
        if (!live) return;
        const initial = ds.length ? ds : [newDeck()];
        setDecks(initial);
        const savedId = localStorage.getItem('hiciarz-active-deck');
        setActiveId(initial.some((d) => d.id === savedId) ? savedId! : initial[0].id);
        setLoaded(true);
      })
      .catch(() => {
        if (!live) return;
        const empty = newDeck();
        setDecks([empty]);
        setActiveId(empty.id);
        setLoaded(true);
        setStorageError(tr('app.localDataCouldNotBeReadDownload'));
      });
    return () => {
      live = false;
      clearTimeout(toastTimer.current);
      clearTimeout(scanFeedbackTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => saveDecks(decks))
      .then(() => setStorageError(''))
      .catch(() => setStorageError(tr('app.theProjectCouldNotBeSavedIn')));
  }, [decks, loaded]);
  useEffect(() => {
    document.documentElement.dataset.theme = themes.includes(displayTheme)
      ? displayTheme
      : 'classic';
  }, [displayTheme]);
  useEffect(() => {
    localStorage.setItem('hiciarz-theme', themes.includes(uiTheme) ? uiTheme : 'classic');
  }, [uiTheme]);
  useEffect(() => {
    setSelected(new Set());
    setPreviewIndex(0);
    setTab('songs');
    if (activeId) localStorage.setItem('hiciarz-active-deck', activeId);
  }, [activeId]);
  const oauthStarted = useRef(false);
  useEffect(() => {
    if (oauthStarted.current) return;
    oauthStarted.current = true;
    const purpose = spotifyLoginPurpose();
    finishSpotify()
      .then((done) => {
        if (done) {
          if (done === 'player') {
            setOutput('spotify');
            setMode(
              sessionStorage.getItem('hiciarz-spotify-return-mode') === 'scanner'
                ? 'scanner'
                : 'player',
            );
            sessionStorage.removeItem('hiciarz-spotify-return-mode');
            notify(tr('app.spotifyConnectedSelectAPlaybackDevice'));
          } else {
            setMode('editor');
            notify(tr('app.spotifyConnectedSelectAPlaylistToImport'));
            setModal('spotify');
          }
        }
      })
      .catch((e) => {
        if (purpose === 'import') {
          setMode('editor');
          setModal('spotify');
        } else if (purpose === 'player')
          setMode(
            sessionStorage.getItem('hiciarz-spotify-return-mode') === 'scanner'
              ? 'scanner'
              : 'player',
          );
        notify(e.message);
      });
  }, []);
  const routeHandler = useRef<() => Promise<void>>(async () => {});
  routeHandler.current = async () => {
    if (!location.hash || playbackTransition.current) return;
    const raw = location.href;
    try {
      const q = readQR(raw);
      if (q.kind === 'spotify-setup') {
        if (!(await setOutput('spotify')) || location.href !== raw) return;
        setMode('scanner');
        sessionStorage.setItem('hiciarz-spotify-return-mode', 'scanner');
        setSpotifySetup((previous) => ({
          purpose: 'player',
          clientId: q.clientId,
          revision: previous.revision + 1,
        }));
        setModal('spotify-setup');
      } else if (q.kind === 'pair') {
        if (!(await setOutput('browser')) || location.href !== raw) return;
        setMode('scanner');
        room.join(q.peer, q.token);
      } else {
        setMode('scanner');
        if (
          scannerPlaybackRoute(outputRef.current, room.connected) === 'direct' ||
          room.send(q.card)
        )
          receive(q.card);
        else incomingCard.current = q.card;
      }
      if (location.href === raw) {
        const consumed = new URL(urlForView(location.href, 'scanner'));
        consumed.hash = '';
        history.replaceState(navigationState(history.state, 'scanner', null), '', consumed.href);
        if (q.kind !== 'spotify-setup') setModal(null);
      }
    } catch {
      // Ignore hashes that are not valid Hiciarz QR payloads.
    }
  };
  useEffect(() => {
    const route = () => {
      void routeHandler.current();
    };
    const initial = setTimeout(route, 0);
    window.addEventListener('hashchange', route);
    return () => {
      clearTimeout(initial);
      window.removeEventListener('hashchange', route);
    };
  }, []);
  useEffect(() => {
    if (incomingCard.current && scannerPlaybackRoute(output, room.connected) !== 'pair-required') {
      if (output === 'browser' && !room.send(incomingCard.current)) return;
      receive(incomingCard.current);
      incomingCard.current = null;
    }
  }, [room.connected, output]);
  function moveEditedSong(direction: -1 | 1) {
    if (!editSong) return;
    const index = deck.songs.findIndex((song) => song.id === editSong.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= deck.songs.length) return;
    const songs = [...deck.songs];
    [songs[index], songs[target]] = [songs[target], songs[index]];
    updateDeck({ songs });
    setPreviewIndex(target);
  }
  function goToCreatorStep(next: CreatorStep) {
    if (next !== 'songs' && !deck.songs.length) return;
    setTab(next);
    if (next === 'design') setPreviewOpen(true);
    requestAnimationFrame(() =>
      document
        .querySelector('[data-deck-settings]')
        ?.scrollIntoView({ block: 'start', behavior: 'auto' }),
    );
  }
  function updateDeck(patch: Partial<Deck>) {
    setDecks((ds) => ds.map((d) => (d.id === deck.id ? { ...d, ...patch } : d)));
  }
  function importSongs(songs: Song[], mode: 'append' | 'replace', note = '') {
    const r = mergeSongs(deck.songs, songs, mode);
    updateDeck({ songs: r.songs });
    setSelected(new Set());
    notify(tr('app.deckImportSummary', { count: r.songs.length, skipped: r.skipped, note }));
  }
  function chooseExample(id: string, destination: 'new' | 'append' = 'new') {
    const example = createExampleDeck(id);
    if (destination === 'new') {
      setDecks((ds) => [...ds, example]);
      setActiveId(example.id);
      notify(tr('app.exampleCreated', { name: example.name, count: example.songs.length }));
    } else importSongs(example.songs, 'append', tr('app.checkTheYearsBeforePrinting'));
    setFilter('');
    setSelected(new Set());
    setPreviewIndex(0);
    setTab('songs');
    localStorage.setItem('hiciarz-demo-offer-v1', 'accepted');
    setModal(null);
  }
  async function handleScan(raw: string) {
    if (playbackTransition.current) return;
    try {
      const q = readQR(raw);
      if (q.kind === 'spotify-setup') {
        setSpotifySetup((previous) => ({
          purpose: 'player',
          clientId: q.clientId,
          revision: previous.revision + 1,
        }));
        sessionStorage.setItem('hiciarz-spotify-return-mode', 'scanner');
        setModal('spotify-setup');
        clearScanFeedback();
        vibrateOnScan();
        return;
      }
      const now = Date.now();
      const scanId = q.kind === 'pair' ? 'pair:' + q.peer : q.card.id;
      if (lastScan.current.id === scanId && now - lastScan.current.time < 7000) return;
      if (q.kind === 'pair') {
        lastScan.current = { id: scanId, time: now };
        const scanLocation = location.href;
        if (!(await setOutput('browser')) || location.href !== scanLocation) return;
        room.join(q.peer, q.token);
        confirmScan('pair');
        return;
      }
      if (scannerPlaybackRoute(output, room.connected) === 'direct') {
        lastScan.current = { id: q.card.id, time: now };
        receive(q.card);
        confirmScan('card');
      } else if (room.send(q.card)) {
        lastScan.current = { id: q.card.id, time: now };
        receive(q.card);
        confirmScan('card');
      } else notify(tr('app.firstScanThePairingQrCodeOn'));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function verifySources() {
    setModal('check');
    setChecking(true);
    setCheckProgress(0);
    setChecks([]);
    try {
      const { checkSources } = await import('./availability');
      setChecks(await checkSources(deck.songs, setCheckProgress));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setChecking(false);
    }
  }
  async function exportPDF(destination: 'download' | 'print' = 'download') {
    if (pdfAbort.current || backgroundBusy) return;
    const songs = selected.size ? deck.songs.filter((s) => selected.has(s.id)) : deck.songs;
    if (!songs.length) return;
    const controller = new AbortController();
    const preview = destination === 'print' ? preparePDFPreview(() => controller.abort()) : null;
    if (destination === 'print' && !preview) {
      setPrintError(tr('app.aNewTabCouldNotBeOpened'));
      return;
    }
    pdfAbort.current = controller;
    setModal(null);
    setPrintReady(undefined);
    setBusy(true);
    setPDFProgress({ phase: 'preparing', completed: 0, total: songs.length, percent: 0 });
    try {
      const { buildPDF, yieldForPDF } = await import('./pdf');
      songs.forEach(validateSong);
      const shortened = new Set<string>();
      const doc = await buildPDF(deck, songs, location.origin + location.pathname, {
        signal: controller.signal,
        onProgress: (progress) => {
          setPDFProgress(progress);
          preview?.update(progress);
        },
        onTextShortened: (song) => shortened.add(song.id),
      });
      await yieldForPDF();
      controller.signal.throwIfAborted();
      if (preview) preview.show(doc.output('blob'));
      else
        await doc.save(`${deck.name.replace(/[^\p{L}\p{N} -]/gu, '') || tr('app.hiciarz')}.pdf`, {
          returnPromise: true,
        });
      setPrintReady({ deck, count: songs.length, destination });
      notify(
        shortened.size
          ? tr('app.pdfNamesShortened', { count: shortened.size })
          : tr('app.pdfReadyPrintAt100ScaleWithout'),
      );
    } catch (e) {
      preview?.close();
      notify(controller.signal.aborted ? tr('app.pdfGenerationCancelled') : (e as Error).message);
    } finally {
      pdfAbort.current = null;
      setPDFProgress(undefined);
      setBusy(false);
    }
  }
  async function changeMode(next: Mode, recordHistory = true) {
    if (playbackTransition.current) return false;
    if (next === mode) {
      setModal(null);
      return true;
    }
    playbackTransition.current = true;
    try {
      if (outputRef.current === 'spotify' && card) {
        try {
          await spotifyRemote.stop();
        } catch (error) {
          notify((error as Error).message);
        }
      }
      if (mode === 'scanner' && outputRef.current === 'browser' && card)
        room.send(undefined, 'stop');
      const shouldRecord = recordHistory && !historyPopPending.current;
      const destination = shouldRecord ? next : parseAppView(location.href);
      if (!keepScannerPairing(mode, destination) && (room.connected || room.pairUrl))
        room.disconnect();
      clearRound();
      incomingCard.current = null;
      historyPopPending.current = false;
      if (shouldRecord) {
        const method = readNavigationState(history.state).modal ? 'replaceState' : 'pushState';
        history[method](
          navigationState(history.state, destination, null),
          '',
          urlForView(location.href, destination),
        );
        setModal(null);
      }
      if (!shouldRecord) {
        const nextModal = availableModal(readNavigationState(history.state).modal, destination);
        history.replaceState(
          navigationState(history.state, destination, nextModal),
          '',
          urlForView(location.href, destination),
        );
        setModal(nextModal);
      }
      setMode(destination);
      if (destination === 'player') {
        outputRef.current = 'browser';
        setOutputState('browser');
        localStorage.setItem('hiciarz-output', 'browser');
      }
      return true;
    } catch (error) {
      notify((error as Error).message);
      if (!recordHistory)
        history.replaceState(
          navigationState(history.state, mode, modal),
          '',
          urlForView(location.href, mode),
        );
      return false;
    } finally {
      playbackTransition.current = false;
      if (historyPopPending.current) {
        historyPopPending.current = false;
        setTimeout(
          () => popNavigation.current(new PopStateEvent('popstate', { state: history.state })),
          0,
        );
      }
    }
  }
  const historyReady = useRef(false);
  const popNavigation = useRef<(event: PopStateEvent) => void>(() => {});
  function availableModal(candidate: AppModal, view = mode): AppModal {
    if ((candidate === 'bingo-help' || candidate === 'bingo-print') && view !== 'bingo')
      return null;
    if (candidate === 'file' && !pending) return null;
    if (candidate === 'print-cards' && !printCount) return null;
    if (candidate === 'song' && editSong && !deck?.songs.some((song) => song.id === editSong.id))
      return null;
    return candidate;
  }
  popNavigation.current = (event) => {
    if (playbackTransition.current) {
      historyPopPending.current = true;
      return;
    }
    const target = parseAppView(location.href);
    const candidate = readNavigationState(event.state).modal ?? parseEntryModal(location.href);
    const nextModal = availableModal(candidate, target);
    if (nextModal !== candidate)
      history.replaceState(navigationState(history.state, target, nextModal), '', location.href);
    setModal(nextModal);
    if (target === 'bingo') setBingoLevel(parseBingoLevel(location.href));
    if (target !== mode) void changeMode(target, false);
  };
  useEffect(() => {
    const activeModal = historyReady.current ? readNavigationState(history.state).modal : null;
    history.replaceState(
      navigationState(history.state, mode, activeModal),
      '',
      urlForModal(location.href, mode, activeModal),
    );
    historyReady.current = true;
  }, [mode]);
  useEffect(() => {
    const activeModal = readNavigationState(history.state).modal;
    if (modal === activeModal) return;
    if (modal) {
      const method = activeModal ? 'replaceState' : 'pushState';
      history[method](
        navigationState(history.state, mode, modal),
        '',
        urlForModal(location.href, mode, modal),
      );
    } else if (activeModal) history.back();
  }, [modal, mode]);
  useEffect(() => {
    const onPop = (event: PopStateEvent) => popNavigation.current(event);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const filtered =
    deck?.songs.filter((s) =>
      [s.title, s.artist, s.year, s.answer]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase(language)
        .includes(filter.toLocaleLowerCase(language)),
    ) || [];
  const themeOverrides = deck?.songs.filter((song) => song.theme).length || 0;
  const previewSong = deck?.songs[Math.min(previewIndex, Math.max(0, deck.songs.length - 1))];
  const playbackDestination =
    output === 'local' || (mode === 'player' && output === 'browser')
      ? tr('app.onThisDevice')
      : output === 'spotify'
        ? spotifyRemote.devices.find((device) => device.id === spotifyRemote.device)?.name ||
          'Spotify Connect'
        : tr('app.secondScreen');
  if (!loaded || !deck)
    return (
      <div className="boot">
        <LoaderCircle className="spin" /> {tr('app.preparingYourStudio')}
      </div>
    );
  return (
    <div
      className={
        'app-shell mode-' +
        mode +
        ((mode === 'scanner' || mode === 'player') && card ? ' playback-active' : '')
      }
    >
      <a className="skip-content" href="#app-content">
        {tr('shell.skipContent')}
      </a>
      <AppNavigation
        current={mode}
        menuOpen={modal === 'menu'}
        playbackOpen={modal === 'playback'}
        onChoose={changeMode}
        onMenu={() => setModal('menu')}
        onPlayback={() => setModal('playback')}
        onSettings={() => setModal('about')}
        onHelp={() => setModal('help')}
      />
      <div className="workspace">
        <header className="app-header">
          {mode === 'scanner' && (
            <div className="scanner-app-toolbar">
              <span className="game-view-title">{tr('shell.view.scanner')}</span>
              <button
                className="scanner-output-chip"
                aria-label={tr('sound.title') + ': ' + playbackDestination}
                aria-haspopup="dialog"
                onClick={() => setModal('playback')}
              >
                <span className={gameReady ? 'live-dot' : 'warn-dot'} aria-hidden="true" />
                <span>{playbackDestination}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            className="header-brand"
            onClick={() => changeMode('home')}
            aria-label={tr('app.hiciarzHome')}
          >
            <img src={asset('icon.svg')} width="32" height="32" alt="" />
            <span>hiciarz</span>
          </button>
          <span className="app-current-view">{tr('shell.view.' + mode)}</span>
          <div className="app-header-actions">
            {mode === 'editor' && (
              <span className="save-status">
                <span className={storageError ? 'warn-dot' : 'live-dot'} />
                {storageError ? tr('app.savingUnavailable') : tr('shell.saved')}
              </span>
            )}
            <button
              className="icon"
              aria-label={tr('app.settings')}
              title={tr('app.settings')}
              onClick={() => setModal('about')}
            >
              <Settings2 size={21} />
            </button>
          </div>
        </header>
        <ConnectionNotice />
        {updateAvailable && (
          <div className="update-banner" role="status">
            <span>
              <strong>{tr('app.aNewVersionOfHiciarzIsReady')}</strong>{' '}
              {tr('app.weWillSaveYourDecksAndRefresh')}
            </span>
            <button
              className="primary"
              disabled={updating}
              onClick={async () => {
                setUpdating(true);
                try {
                  await saveQueue.current;
                  await saveDecks(decks);
                  await applyUpdate();
                } catch {
                  setUpdating(false);
                  notify(tr('app.yourDecksCouldNotBeSavedBefore'));
                }
              }}
            >
              {updating ? tr('app.loading') : tr('app.loadNewVersion')}
            </button>
          </div>
        )}
        <main id="app-content" tabIndex={-1}>
          {uiTheme === 'fish' &&
            mode !== 'bingo' &&
            mode !== 'scanner' &&
            !(mode === 'player' && card) && <FishFestivities compact={mode !== 'home'} />}
          {(bingoOpened || mode === 'bingo') && (
            <div className="bingo-container" hidden={mode !== 'bingo'}>
              <Suspense fallback={<p className="hint">{tr('app.preparingBingo')}</p>}>
                <BingoGame
                  onScanner={() => changeMode('scanner')}
                  level={bingoLevel}
                  onLevelChange={(level) => {
                    setBingoLevel(level);
                    history.replaceState(history.state, '', urlForBingoLevel(location.href, level));
                  }}
                  sheet={modal === 'bingo-help' ? 'help' : modal === 'bingo-print' ? 'print' : null}
                  onSheetChange={(sheet) =>
                    setModal(
                      sheet === 'help' ? 'bingo-help' : sheet === 'print' ? 'bingo-print' : null,
                    )
                  }
                />
              </Suspense>
            </div>
          )}
          {mode === 'bingo' ? null : mode === 'home' ? (
            <Landing onChoose={changeMode} theme={uiTheme} />
          ) : mode === 'editor' ? (
            <>
              <h1 className="sr-only">{tr('shell.view.editor')}</h1>
              {printReady?.deck === deck && (
                <section className="print-ready-note" role="status">
                  <Printer size={22} aria-hidden="true" />
                  <div>
                    <strong>{tr('app.pdfReadyNowPrintAndCutOut')}</strong>
                    <p>
                      {tr('app.printReadySummary', {
                        count: printReady.count,
                        action:
                          printReady.destination === 'print'
                            ? tr('app.choosePrintInThePdfPreview')
                            : tr('app.openTheDownloadedPdfAndChoosePrint'),
                        edge: deck.print.edge === 'long' ? tr('app.long') : tr('app.short'),
                      })}
                    </p>
                  </div>
                  <button
                    className="icon"
                    aria-label={tr('app.hidePrintingTips')}
                    onClick={() => setPrintReady(undefined)}
                  >
                    <X size={17} />
                  </button>
                </section>
              )}
              {storageError && (
                <div className="notice error" role="alert">
                  {displayTranslation(storageError)}
                </div>
              )}
              <section
                className="deck-toolbar deck-workspace-bar"
                inert={busy}
                aria-label={tr('shell.deckChoose')}
              >
                <div className="deck-title">
                  <label className="sr-only" htmlFor="deck-name">
                    {tr('app.deckName')}
                  </label>
                  <input
                    id="deck-name"
                    value={deck.name}
                    maxLength={100}
                    onChange={(event) => updateDeck({ name: event.target.value })}
                  />
                  <span className="deck-count">{trackCount(deck.songs.length)}</span>
                </div>
                <div className="deck-controls">
                  <details className="deck-actions-menu">
                    <summary aria-label={tr('shell.deckMenu')} title={tr('shell.deckMenu')}>
                      <MoreHorizontal size={22} />
                    </summary>
                    <div className="deck-actions-list">
                      {' '}
                      {decks.length > 1 && (
                        <select
                          aria-label={tr('shell.deckChoose')}
                          value={activeId}
                          onChange={(event) => {
                            setActiveId(event.target.value);
                            event.currentTarget.closest('details')?.removeAttribute('open');
                          }}
                        >
                          {decks.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          const next = newDeck();
                          setDecks([...decks, next]);
                          setActiveId(next.id);
                        }}
                      >
                        <Plus size={18} />
                        {tr('shell.newDeck')}
                      </button>
                      <button
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          fileRef.current?.click();
                        }}
                      >
                        <FolderOpen size={18} />
                        {tr('shell.importDeck')}
                      </button>
                      <button
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          download(JSON.stringify(deck, null, 2), `${deck.name || 'talia'}.json`);
                        }}
                      >
                        <Download size={18} />
                        {tr('shell.saveDeck')}
                      </button>
                      <button
                        className="delete-action"
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          setModal('delete');
                        }}
                      >
                        <Trash2 size={18} />
                        {tr('shell.deleteDeck')}
                      </button>
                    </div>
                  </details>
                </div>
              </section>
              <div className="studio-grid" inert={busy} aria-busy={busy}>
                <section className="editor-panel">
                  <CreatorSteps
                    current={tab}
                    hasSongs={deck.songs.length > 0}
                    onChange={goToCreatorStep}
                  />
                  {tab === 'songs' ? (
                    <>
                      <div className="creator-game-choice">
                        {deck.songs.length ? (
                          <details className="deck-variation">
                            <summary>
                              {tr('creator.variant.' + (deck.gameMode || 'music'))}
                              <ChevronDown size={17} aria-hidden="true" />
                            </summary>
                            <GameModePicker
                              value={deck.gameMode || 'music'}
                              onChange={(gameMode) => updateDeck({ gameMode })}
                              compact
                            />
                          </details>
                        ) : (
                          <GameModePicker
                            value={deck.gameMode || 'music'}
                            onChange={(gameMode) => updateDeck({ gameMode })}
                          />
                        )}
                        {deck.songs.some(
                          (song) => (song.gameMode || 'music') !== (deck.gameMode || 'music'),
                        ) && <p className="hint">{tr('creator.mixedModes')}</p>}
                      </div>
                      <div className="panel-heading">
                        <div>
                          <h2>{tr('creator.collection.' + (deck.gameMode || 'music'))}</h2>
                        </div>
                        <button
                          className="secondary compact"
                          onClick={() => {
                            setEditSong(undefined);
                            setModal('song');
                          }}
                        >
                          <Plus size={17} /> {tr('creator.add.' + (deck.gameMode || 'music'))}
                        </button>
                      </div>
                      <button className="example-entry" onClick={() => setModal('examples')}>
                        <Sparkles size={20} aria-hidden="true" />
                        <span>
                          <strong>{tr('creator.chooseExamples')}</strong>
                          <small>
                            {tr('creator.exampleDescription.' + (deck.gameMode || 'music'))}
                          </small>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                      <details className="creator-import-options">
                        <summary>
                          {tr('shell.addFrom')}
                          <ChevronDown size={17} aria-hidden="true" />
                        </summary>
                        <button
                          className="secondary spotify-import-button"
                          onClick={() => {
                            sessionStorage.removeItem('spotify-import-playlist');
                            setModal('spotify');
                          }}
                        >
                          <Music2 size={18} />
                          {tr('shell.spotify')}
                        </button>
                        <div
                          className={'file-drop' + (draggingFile ? ' is-dragging' : '')}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'copy';
                            setDraggingFile(true);
                          }}
                          onDragLeave={(event) => {
                            if (
                              !(event.relatedTarget instanceof Node) ||
                              !event.currentTarget.contains(event.relatedTarget)
                            )
                              setDraggingFile(false);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDraggingFile(false);
                            const file = event.dataTransfer.files[0];
                            if (file) void readImportFile(file);
                          }}
                        >
                          <FileJson size={22} />
                          <div>
                            <strong>{tr('shell.file')}</strong>
                            <span>{tr('shell.dropFile')}</span>
                          </div>
                          <button className="text-button" onClick={() => fileRef.current?.click()}>
                            {tr('app.chooseFile')} <ArrowUpRight size={15} />
                          </button>
                        </div>
                        <button
                          className="secondary prompt-copy"
                          aria-describedby="playlist-ai-help"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(playlistPrompt);
                              notify(tr('app.promptCopiedPasteItIntoYourPreferred'));
                            } catch {
                              setModal('prompt');
                            }
                          }}
                        >
                          <Copy size={16} /> {tr('app.copyPromptForYourAi')}
                        </button>
                        <p id="playlist-ai-help" className="hint prompt-copy-help">
                          {tr('app.playlistAiHelp')}
                        </p>{' '}
                      </details>
                      {deck.songs.length > 0 && (
                        <div className="table-tools">
                          <label className="search">
                            <Search size={17} />
                            <input
                              aria-label={tr('shell.searchCards')}
                              placeholder={tr('shell.searchCards')}
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                            />
                          </label>
                          <button
                            className="icon"
                            aria-label={tr('app.checkSourceAvailability')}
                            title={tr('app.checkSources')}
                            disabled={!deck.songs.length || checking}
                            onClick={verifySources}
                          >
                            <ShieldCheck size={17} />
                          </button>
                          <button
                            className="icon"
                            aria-label={tr('app.shuffleTrackOrder')}
                            title={tr('app.shuffleTracks')}
                            onClick={() => {
                              const songs = [...deck.songs];
                              for (let i = songs.length - 1; i > 0; i--) {
                                const random = new Uint32Array(1);
                                crypto.getRandomValues(random);
                                const j = random[0] % (i + 1);
                                [songs[i], songs[j]] = [songs[j], songs[i]];
                              }
                              updateDeck({ songs });
                            }}
                          >
                            <Shuffle size={17} />
                          </button>
                        </div>
                      )}
                      {selected.size > 0 && (
                        <div className="selection-bar">
                          <span>
                            {tr('app.selected')} {selected.size}
                          </span>
                          <button
                            onClick={openPrintCards}
                            disabled={busy || backgroundBusy || !printCount}
                          >
                            {tr('app.downloadPrintSelected')}
                          </button>
                          <button
                            onClick={() => {
                              updateDeck({ songs: deck.songs.filter((s) => !selected.has(s.id)) });
                              setSelected(new Set());
                            }}
                          >
                            {tr('app.deleteSelected')}
                          </button>
                          <button onClick={() => setSelected(new Set())}>
                            {tr('app.clearSelection')}
                          </button>
                        </div>
                      )}
                      {deck.songs.length > 0 && (
                        <div
                          className="song-table"
                          role="region"
                          aria-label={tr('creator.collection.' + (deck.gameMode || 'music'))}
                          tabIndex={filtered.length > 8 ? 0 : -1}
                        >
                          <div className="table-head">
                            <label className="track-select">
                              <input
                                type="checkbox"
                                aria-label={tr('shell.selectTracks')}
                                checked={
                                  filtered.length > 0 && filtered.every((s) => selected.has(s.id))
                                }
                                onChange={(e) => {
                                  const set = new Set(selected);
                                  filtered.forEach((s) =>
                                    e.target.checked ? set.add(s.id) : set.delete(s.id),
                                  );
                                  setSelected(set);
                                }}
                              />
                            </label>
                            <span>#</span>
                            <span>{tr('app.trackArtist')}</span>
                            <span>{tr('app.year')}</span>
                            <span>{tr('app.sources')}</span>
                            <span />
                          </div>
                          {filtered.map((s) => {
                            const i = deck.songs.findIndex((x) => x.id === s.id);
                            return (
                              <div
                                className={
                                  'song-row ' + (previewSong?.id === s.id ? 'previewed' : '')
                                }
                                key={s.id}
                              >
                                <label className="track-select">
                                  <input
                                    type="checkbox"
                                    aria-label={tr('app.select') + s.title}
                                    checked={selected.has(s.id)}
                                    onChange={(e) => {
                                      const set = new Set(selected);
                                      e.target.checked ? set.add(s.id) : set.delete(s.id);
                                      setSelected(set);
                                    }}
                                  />
                                </label>
                                <span className="row-index">{String(i + 1).padStart(2, '0')}</span>
                                <button
                                  className="song-name"
                                  onClick={() => {
                                    setPreviewIndex(i);
                                    setEditSong(s);
                                    setModal('song');
                                  }}
                                >
                                  <strong>{s.answer ? s.answer + ' · ' + s.title : s.title}</strong>
                                  <small>{s.artist}</small>
                                </button>
                                <span
                                  className={'year-pill ' + (s.review ? 'review' : '')}
                                  title={s.review ? tr('app.yearFromAlbumMetadataCheckIt') : ''}
                                >
                                  {s.year}
                                  {s.review && <span>•</span>}
                                </span>
                                <span className="source-icons">
                                  {s.sources.spotify && (
                                    <span title={tr('app.spotify')} className="source-spotify">
                                      ≋
                                    </span>
                                  )}
                                  {s.sources.youtube && (
                                    <span title={tr('app.youtube')} className="source-youtube">
                                      <Play size={10} fill="currentColor" />
                                    </span>
                                  )}
                                </span>
                                <div className="row-actions">
                                  <button
                                    className="icon"
                                    aria-label={tr('shell.editSong', { title: s.title })}
                                    onClick={() => {
                                      setPreviewIndex(i);
                                      setEditSong(s);
                                      setModal('song');
                                    }}
                                  >
                                    <MoreHorizontal size={20} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {!filtered.length && (
                            <div className="empty-list">
                              <Music2 size={28} />
                              <h3>{filter ? tr('app.noTracksFound') : tr('shell.emptyDeck')}</h3>
                              <p>
                                {filter ? tr('app.tryChangingYourSearch') : tr('shell.emptyHint')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {deck.songs.length > 0 && (
                        <div className="table-footer">
                          <span>
                            {tr('shell.visibleTracks', {
                              shown: filtered.length,
                              total: deck.songs.length,
                            })}
                          </span>
                          <button
                            className="text-button"
                            onClick={() =>
                              download(
                                csvExport(deck.songs),
                                'hiciarz-utwory.csv',
                                'text/csv;charset=utf-8',
                              )
                            }
                          >
                            {tr('app.exportCsv')} <ArrowUpRight size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : tab === 'design' ? (
                    <div className="design-content">
                      <div className="panel-heading">
                        <div>
                          <h2>{tr('shell.designTitle')}</h2>
                          <p>{tr('shell.designHint')}</p>
                        </div>
                      </div>
                      <ThemePicker
                        value={deck.theme}
                        onChange={(theme) => {
                          invalidateBackground();
                          updateDeck({ theme, back: undefined });
                        }}
                      />
                      {themeOverrides > 0 && (
                        <div className="theme-override-notice">
                          <span>{tr('printPreview.overrides', { count: themeOverrides })}</span>
                          <button
                            className="text-button"
                            onClick={() =>
                              updateDeck({
                                songs: deck.songs.map((song) =>
                                  song.theme ? { ...song, theme: undefined } : song,
                                ),
                              })
                            }
                          >
                            {tr('printPreview.applyAll')}
                          </button>
                        </div>
                      )}
                      <label className="front-color-choice">
                        {tr('app.answerSideColours')}
                        <select
                          value={deck.print.frontColors || 'varied'}
                          onChange={(e) =>
                            updateDeck({
                              print: {
                                ...deck.print,
                                frontColors: e.target.value as 'varied' | 'theme',
                              },
                            })
                          }
                        >
                          <option value="varied">{tr('app.differentShadesForEachCard')}</option>
                          <option value="theme">{tr('app.uniformThemeColour')}</option>
                        </select>
                        <small>{tr('app.aCardKeepsItsShadeWhenReordered')}</small>
                      </label>
                      <div
                        className={'upload-panel' + (draggingImage ? ' is-dragging' : '')}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'copy';
                          setDraggingImage(true);
                        }}
                        onDragLeave={(event) => {
                          if (
                            !(event.relatedTarget instanceof Node) ||
                            !event.currentTarget.contains(event.relatedTarget)
                          )
                            setDraggingImage(false);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          setDraggingImage(false);
                          const file = event.dataTransfer.files[0];
                          if (file) void readBackground(file);
                        }}
                      >
                        <Upload size={23} />
                        <div>
                          <strong>{tr('app.dropBackground')}</strong>
                          <p>{tr('app.pngJpgOrWebpCentreSquareCrop')}</p>
                        </div>
                        <label className="secondary file-label">
                          {tr('app.uploadBackground')}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void readBackground(file);
                              event.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {backgroundBusy && (
                        <p className="hint" role="status">
                          {tr('printPreview.loadingBackground')}
                        </p>
                      )}
                      {deck.back && (
                        <div className="notice">
                          <span>
                            {tr('app.yourCustomBackgroundIsActiveCardColours')}
                            {themeNames[deck.theme]}”.
                          </span>
                          <button
                            className="text-button"
                            onClick={() => {
                              invalidateBackground();
                              updateDeck({ back: undefined });
                            }}
                          >
                            {tr('app.removeBackground')}
                          </button>
                        </div>
                      )}
                      <p className="hint">{tr('app.setADifferentThemeForAnIndividual')}</p>
                    </div>
                  ) : (
                    <div className="print-content">
                      <div
                        className="print-presets"
                        role="group"
                        aria-label={tr('app.printPreset')}
                      >
                        <button
                          className={
                            deck.print.style === 'laser' ? 'print-preset chosen' : 'print-preset'
                          }
                          onClick={() => updateDeck({ print: { ...deck.print, style: 'laser' } })}
                        >
                          <Printer size={22} />
                          <strong>{tr('app.laserLightColour')}</strong>
                          <span>{tr('app.whiteBackgroundTwoOutlineColoursMinimalFill')}</span>
                        </button>
                        <button
                          className={
                            deck.print.style !== 'laser' ? 'print-preset chosen' : 'print-preset'
                          }
                          onClick={() => updateDeck({ print: { ...deck.print, style: 'theme' } })}
                        >
                          <Palette size={22} />
                          <strong>{tr('app.fullThemeArtwork')}</strong>
                          <span>{tr('app.completeIllustrationsColoursAndCustomBackground')}</span>
                        </button>
                      </div>
                      {deck.print.style === 'laser' && (
                        <p className="hint">{tr('app.lightPrintingDoesNotChangeTheTheme')}</p>
                      )}
                      <div className="panel-heading">
                        <div>
                          <h2>{tr('shell.printTitle')}</h2>
                          <p>{tr('shell.printHint')}</p>
                        </div>
                      </div>
                      <div className="print-diagram">
                        <div>
                          {Array.from({ length: 12 }, (_, i) => (
                            <span key={i}>{i + 1}</span>
                          ))}
                        </div>
                        <ArrowUpRight size={25} />
                        <p>
                          {tr('app.answersFirst')}
                          <br />
                          {tr('app.thenMatchingQrCodes')}
                          <br />
                          <strong>{tr('app.doubleSidedPrinting100Scale')}</strong>
                        </p>
                      </div>
                      <label>
                        {tr('app.pageFlip')}
                        <select
                          value={deck.print.edge}
                          onChange={(e) =>
                            updateDeck({
                              print: { ...deck.print, edge: e.target.value as 'long' | 'short' },
                            })
                          }
                        >
                          <option value="long">{tr('app.flipOnLongEdge')}</option>
                          <option value="short">{tr('app.flipOnShortEdge')}</option>
                        </select>
                      </label>
                      <details className="advanced-print">
                        <summary>{tr('shell.advancedPrint')}</summary>
                        <div className="form-grid">
                          <label>
                            {tr('app.horizontalQrOffsetMm')}
                            <input
                              type="number"
                              min="-10"
                              max="10"
                              step="0.5"
                              value={deck.print.offsetX}
                              onChange={(e) =>
                                updateDeck({
                                  print: {
                                    ...deck.print,
                                    offsetX: Math.max(-10, Math.min(10, Number(e.target.value))),
                                  },
                                })
                              }
                            />
                          </label>
                          <label>
                            {tr('app.verticalQrOffsetMm')}
                            <input
                              type="number"
                              min="-10"
                              max="10"
                              step="0.5"
                              value={deck.print.offsetY}
                              onChange={(e) =>
                                updateDeck({
                                  print: {
                                    ...deck.print,
                                    offsetY: Math.max(-10, Math.min(10, Number(e.target.value))),
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={deck.print.cuts}
                            onChange={(e) =>
                              updateDeck({ print: { ...deck.print, cuts: e.target.checked } })
                            }
                          />{' '}
                          {tr('app.showCuttingMarks')}
                        </label>
                        <div className="notice">
                          <Printer size={22} />
                          <div>
                            <strong>{tr('app.startWithASingleSheet')}</strong>
                            <p>{tr('app.printCalibrationDoubleSidedCheckTheNumbers')}</p>
                          </div>
                        </div>
                        <button
                          className="secondary"
                          onClick={() =>
                            import('./pdf')
                              .then((m) => m.calibrationPDF(deck.print.edge))
                              .catch((e) => notify(e.message))
                          }
                        >
                          <Printer size={17} /> {tr('app.downloadCalibrationSheet')}
                        </button>
                      </details>
                    </div>
                  )}
                  <div className="creator-navigation">
                    {tab !== 'songs' && (
                      <button
                        className="secondary"
                        onClick={() => goToCreatorStep(tab === 'print' ? 'design' : 'songs')}
                      >
                        <ChevronLeft size={17} />
                        {tr(tab === 'print' ? 'creator.backDesign' : 'creator.backSongs')}
                      </button>
                    )}
                    {tab === 'songs' && !deck.songs.length && <p>{tr('creator.addFirst')}</p>}
                    {tab === 'print' ? (
                      <button
                        className="primary"
                        disabled={!printCount || busy || backgroundBusy}
                        onClick={openPrintCards}
                      >
                        <Printer size={18} />
                        {tr('app.downloadPrintCards')}
                      </button>
                    ) : (
                      <button
                        className="primary"
                        disabled={!deck.songs.length}
                        onClick={() => goToCreatorStep(tab === 'songs' ? 'design' : 'print')}
                      >
                        {tr(tab === 'songs' ? 'creator.nextDesign' : 'creator.nextPrint')}
                        <ChevronRight size={17} />
                      </button>
                    )}
                  </div>
                </section>
                <aside className={'preview-panel' + (previewOpen ? ' is-open' : '')}>
                  <div className="preview-heading">
                    <h2>{tr('shell.preview')}</h2>
                    <button
                      className="icon preview-toggle"
                      aria-expanded={previewOpen}
                      aria-label={tr(previewOpen ? 'shell.previewClose' : 'shell.previewOpen')}
                      onClick={() => setPreviewOpen(!previewOpen)}
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                  <div className="preview-content">
                    <div className="preview-stage">
                      {previewSong ? (
                        <div className="print-preview-card">
                          <CardPreview song={previewSong} deck={deck} back={showBack} />
                        </div>
                      ) : (
                        <div className="empty-preview">
                          <Music2 size={40} />
                          <p>
                            {tr('app.addYourFirstTrack')}
                            <br />
                            {tr('app.toSeeYourCard')}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="side-switch">
                      <button
                        className={!showBack ? 'active' : ''}
                        onClick={() => setShowBack(false)}
                      >
                        {tr('app.answer')}
                      </button>
                      <button
                        className={showBack ? 'active' : ''}
                        onClick={() => setShowBack(true)}
                      >
                        {tr('app.qrCode')}
                      </button>
                    </div>
                    {previewSong?.theme && previewSong.theme !== deck.theme && (
                      <p className="card-theme-note">
                        {tr('printPreview.ownTheme', { theme: themeNames[previewSong.theme] })}
                      </p>
                    )}
                    <div className="preview-pagination">
                      <button
                        className="icon"
                        aria-label={tr('app.previousCard')}
                        disabled={!deck.songs.length}
                        onClick={() =>
                          setPreviewIndex((i) => (i - 1 + deck.songs.length) % deck.songs.length)
                        }
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span>
                        {tr('app.card')}{' '}
                        <strong>
                          {deck.songs.length ? Math.min(previewIndex + 1, deck.songs.length) : 0}
                        </strong>{' '}
                        / {deck.songs.length}
                      </span>
                      <button
                        className="icon"
                        aria-label={tr('app.nextCard')}
                        disabled={!deck.songs.length}
                        onClick={() => setPreviewIndex((i) => (i + 1) % deck.songs.length)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : mode === 'scanner' ? (
            <>
              <h1 className="sr-only">{tr('app.cardScanner')}</h1>
              <div className={'play-layout' + (gameReady ? ' game-ready' : '')}>
                <section className="surface scan-surface">
                  <button
                    className="playback-location-button scanner-sound-button"
                    aria-haspopup="dialog"
                    onClick={() => setModal('playback')}
                  >
                    <span className={gameReady ? 'live-dot' : 'warn-dot'} aria-hidden="true" />
                    <strong>{playbackDestination}</strong>
                    <span>{tr('sound.change')}</span>
                    <Settings2 size={18} aria-hidden="true" />
                  </button>
                  {card ? (
                    <>
                      {output === 'local' && (
                        <div className="scanner-local-player">
                          <Players
                            key={playerRevision}
                            card={card}
                            source={source}
                            command={command}
                            onState={reportPlayback}
                          />
                          <div className="source-buttons">
                            {(['spotify', 'youtube'] as const).map((s) => (
                              <button
                                disabled={!card.sources[s]}
                                className={source === s ? 'secondary active-source' : 'secondary'}
                                key={s}
                                onClick={() => setSource(s)}
                              >
                                {s === 'spotify' ? tr('app.spotify') : tr('app.youtube')}
                                {source === s && <Check size={15} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <PlayingCard
                        card={card}
                        back={playingBack}
                        state={playbackState}
                        message={displayTranslation(playState)}
                        disabled={!gameReady}
                        onToggle={togglePlayback}
                        onNext={nextCard}
                      />
                    </>
                  ) : (
                    <Suspense fallback={<p className="hint">{tr('app.preparingScanner')}</p>}>
                      <Camera
                        immersive
                        onConfigure={() => setModal('playback')}
                        onScan={handleScan}
                        onStart={() => {
                          clearScanFeedback();
                          lastScan.current = { id: '', time: 0 };
                        }}
                        pairingRequired={output === 'browser'}
                        paired={room.connected}
                        ready={
                          modal !== 'spotify-setup' && (output !== 'spotify' || spotifyRemote.ready)
                        }
                      />
                    </Suspense>
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <h1>{tr('app.player')}</h1>
                </div>
              </section>
              <div className={'play-layout' + (card && gameReady ? ' game-ready' : '')}>
                <section className="surface player-surface">
                  <button
                    className="playback-location-button"
                    aria-haspopup="dialog"
                    onClick={() => setModal('playback')}
                  >
                    <span className={gameReady ? 'live-dot' : 'warn-dot'} aria-hidden="true" />
                    <strong>{playbackDestination}</strong>
                    <span>{tr('sound.change')}</span>
                    <Settings2 size={18} aria-hidden="true" />
                  </button>
                  {card && (
                    <>
                      <PlayingCard
                        card={card}
                        back={playingBack}
                        state={playbackState}
                        message={displayTranslation(playState)}
                        disabled={output === 'spotify' && !spotifyRemote.ready}
                        onToggle={togglePlayback}
                      />
                      {output === 'browser' && (
                        <Players
                          card={card}
                          key={playerRevision}
                          source={source}
                          command={command}
                          onState={reportPlayback}
                        />
                      )}
                      {output === 'browser' && (
                        <div className="source-buttons">
                          {(['spotify', 'youtube'] as const).map((s) => (
                            <button
                              disabled={!card.sources[s]}
                              className={source === s ? 'secondary active-source' : 'secondary'}
                              key={s}
                              onClick={() => setSource(s)}
                            >
                              {s === 'spotify' ? tr('app.spotify') : tr('app.youtube')}
                              {source === s && <Check size={15} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
                <aside className="surface pairing-panel">
                  <span className="mini-icon">
                    <ScanLine />
                  </span>
                  <h2>
                    {room.connected
                      ? tr('app.scannerConnected')
                      : tr('plainPlayback.remoteScanner')}
                  </h2>
                  {room.pairUrl ? (
                    <>
                      {room.connected ? (
                        <>
                          <p>{tr('plainPlayback.scanOnConnectedDevice')}</p>
                          <details>
                            <summary>{tr('plainPlayback.pairingCode')}</summary>
                            <div className="pair-qr">
                              <QR value={room.pairUrl} />
                            </div>
                          </details>
                        </>
                      ) : (
                        <>
                          <div className="pair-qr">
                            <QR value={room.pairUrl} />
                          </div>
                          <p>{tr('plainPlayback.pairingInstructions')}</p>
                        </>
                      )}
                      <button className="secondary full" onClick={room.disconnect}>
                        {tr('app.endSession')}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>{tr('plainPlayback.pairPlayerDescription')}</p>
                      <button className="primary full" onClick={room.host}>
                        {tr('app.connectScanner')}
                      </button>
                    </>
                  )}
                  <details className="audio-help">
                    <summary>{tr('app.howDoIChooseASpeaker')}</summary>
                    <p>{tr('app.inSpotifyModeSelectADeviceFrom')}</p>
                  </details>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>
      <input
        ref={fileRef}
        aria-label={tr('app.importFile')}
        className="sr-only"
        type="file"
        accept=".json,.csv,application/json,text/csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void readImportFile(file);
          event.target.value = '';
        }}
      />
      <div
        className="scan-announcement"
        role="status"
        aria-label={tr('app.scanConfirmation')}
        aria-atomic="true"
      >
        {mode === 'scanner' && scanFeedback && (
          <div className="scan-confirmation" key={scanFeedback.sequence}>
            <span className="scan-confirmation-icon" aria-hidden="true">
              <Check size={18} />
            </span>
            <span>
              {scanFeedback.kind === 'card' ? tr('app.cardScanned') : tr('app.pairingCodeRead')}
            </span>
          </div>
        )}
      </div>
      {message && (
        <div className="toast" role="status">
          <span>{displayTranslation(message)}</span>
          <button
            className="icon"
            aria-label={tr('app.closeMessage')}
            onClick={() => setMessage('')}
          >
            <X size={17} />
          </button>
        </div>
      )}
      <PDFExportProgress onCancel={() => pdfAbort.current?.abort()} />
      {modal === 'print-cards' && (
        <Modal title={tr('app.printYourDeck')} onClose={() => setModal(null)} wide>
          <PrintCards
            count={printCount}
            selected={selected.size > 0}
            settings={deck.print}
            error={displayTranslation(printError)}
            onDownload={() => void exportPDF('download')}
            onPreview={() => void exportPDF('print')}
            onSettings={() => {
              setTab('print');
              setModal(null);
              requestAnimationFrame(() =>
                document.querySelector('[data-deck-settings]')?.scrollIntoView({ block: 'start' }),
              );
            }}
          />
        </Modal>
      )}
      {modal === 'song' && (
        <SongForm
          song={editSong}
          defaultMode={deck.gameMode}
          onDelete={
            editSong
              ? () => {
                  updateDeck({ songs: deck.songs.filter((song) => song.id !== editSong.id) });
                  setSelected(new Set([...selected].filter((id) => id !== editSong.id)));
                  setModal(null);
                }
              : undefined
          }
          onMove={
            editSong
              ? {
                  up:
                    deck.songs.findIndex((song) => song.id === editSong.id) > 0
                      ? () => moveEditedSong(-1)
                      : undefined,
                  down:
                    deck.songs.findIndex((song) => song.id === editSong.id) < deck.songs.length - 1
                      ? () => moveEditedSong(1)
                      : undefined,
                }
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={(song) =>
            updateDeck({
              songs: editSong
                ? deck.songs.map((s) => (s.id === song.id ? song : s))
                : [...deck.songs, song],
            })
          }
        />
      )}
      {modal === 'spotify' && (
        <SpotifyImport
          initialPlaylist={sessionStorage.getItem('spotify-import-playlist') || ''}
          onClose={() => {
            sessionStorage.removeItem('spotify-import-playlist');
            setModal(null);
          }}
          onImport={importSongs}
          onExamples={() => setModal('examples')}
        />
      )}
      {modal === 'examples' && (
        <Modal title={tr('app.examplePlaylists')} onClose={() => setModal(null)}>
          <PlaylistExamples
            onChoose={chooseExample}
            initialMode={deck.gameMode || 'music'}
            currentMode={deck.gameMode || 'music'}
          />
        </Modal>
      )}
      {modal === 'file' && pending && (
        <Modal title={tr('app.importFile')} onClose={() => setModal(null)}>
          <p className="muted">
            {pending.name} ·{' '}
            {trackCount(
              Array.isArray(pending.data) ? pending.data.length : pending.data.songs.length,
            )}
          </p>
          <div className="choice-list">
            {!Array.isArray(pending.data) && (
              <label>
                <input
                  type="radio"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>
                  <strong>{tr('app.openFullProjectAsANewDeck')}</strong>
                  <small>{tr('app.importTracksBackgroundThemeAndPrintSettings')}</small>
                </span>
              </label>
            )}
            {Array.isArray(pending.data) && (
              <label>
                <input
                  type="radio"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                />
                <span>
                  <strong>{tr('app.replaceTheCurrentTrackList')}</strong>
                  <small>{tr('app.theCurrentTracksWillBeReplaced')}</small>
                </span>
              </label>
            )}
            <label>
              <input
                type="radio"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
              />
              <span>
                <strong>{tr('app.appendTracksToTheCurrentDeck')}</strong>
                <small>{tr('app.keepEditsAndSkipDuplicates')}</small>
              </span>
            </label>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              {tr('app.cancel')}
            </button>
            <button
              className="primary"
              onClick={() => {
                if (!Array.isArray(pending.data) && importMode === 'replace') {
                  const d = { ...pending.data, id: crypto.randomUUID() };
                  setDecks([...decks, d]);
                  setActiveId(d.id);
                  notify(tr('app.fullProjectOpened'));
                } else
                  importSongs(
                    Array.isArray(pending.data) ? pending.data : pending.data.songs,
                    importMode,
                  );
                setPending(undefined);
                setModal(null);
              }}
            >
              {tr('app.import')}
            </button>
          </div>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title={tr('app.deleteThisDeck')} onClose={() => setModal(null)}>
          <p>
            {tr('app.youWillDelete')}
            {deck.name}
            {tr('app.fromThisBrowserYouCanSaveA')}
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              {tr('app.keepDeck')}
            </button>
            <button
              className="danger"
              onClick={() => {
                const remaining = decks.filter((d) => d.id !== deck.id);
                const next = remaining.length ? remaining : [newDeck()];
                setDecks(next);
                setActiveId(next[0].id);
                setModal(null);
              }}
            >
              {tr('app.deleteDeck')}
            </button>
          </div>
        </Modal>
      )}
      {modal === 'check' && (
        <Modal title={tr('app.sourceCheck')} onClose={() => setModal(null)} wide>
          <p className="hint">{tr('app.weCheckLinkMetadataAvailableMetadataDoes')}</p>
          {checking ? (
            <div className="check-progress">
              <LoaderCircle className="spin" size={22} />
              <span>
                {tr('app.checkingSources')} {checkProgress}
              </span>
            </div>
          ) : (
            <div className="check-results">
              {checks.map((c) => (
                <div key={c.songId + c.source}>
                  <span>
                    <strong>{deck.songs.find((s) => s.id === c.songId)?.title || c.songId}</strong>
                    <small>{c.source === 'spotify' ? tr('app.spotify') : tr('app.youtube')}</small>
                  </span>
                  <span
                    className={
                      c.state === 'metadata'
                        ? 'check-ok'
                        : c.state === 'unavailable'
                          ? 'check-bad'
                          : 'check-unknown'
                    }
                  >
                    {c.message}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              {tr('app.close')}
            </button>
          </div>
        </Modal>
      )}
      {modal === 'prompt' && (
        <Modal title={tr('app.promptForPreparingATrackList')} onClose={() => setModal(null)} wide>
          <p>{tr('app.theClipboardIsUnavailableSelectAndCopy')}</p>
          <label>
            {tr('app.promptText')}
            <textarea
              rows={16}
              readOnly
              value={playlistPrompt}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
        </Modal>
      )}
      {modal === 'spotify-setup' && (
        <Modal
          title={tr('app.spotifyInHiciarz')}
          wide
          onClose={() => setModal(spotifySetup.purpose === 'import' ? 'spotify' : null)}
        >
          <SpotifySetup
            key={spotifySetup.revision}
            purpose={spotifySetup.purpose}
            incomingClientId={spotifySetup.clientId}
            onDone={() => {
              if (spotifySetup.purpose === 'player') setOutput('spotify');
              setModal(spotifySetup.purpose === 'import' ? 'spotify' : null);
            }}
          />
        </Modal>
      )}
      {modal === 'playback' && (
        <Modal title={tr('sound.title')} sheet onClose={() => setModal(null)}>
          <PlaybackSettings
            output={output}
            receiver={mode === 'player'}
            preferred={preferred}
            paired={room.connected}
            scanning={mode === 'scanner'}
            spotify={<SpotifyRemotePanel remote={spotifyRemote} compact />}
            onOutput={setOutput}
            onPreferred={(value) => {
              setPreferred(value);
              if (mode === 'player' && card?.sources[value]) setSource(value);
            }}
            onDisconnect={room.disconnect}
            onStop={
              card && (output !== 'spotify' || spotifyRemote.ready)
                ? () => sendPlaybackCommand('stop')
                : undefined
            }
            onScanner={() => {
              void changeMode('scanner');
            }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === 'menu' && (
        <Modal title={tr('shell.more')} sheet onClose={() => setModal(null)}>
          <div className="app-more-menu">
            <button onClick={() => changeMode('home')}>
              <House size={22} />
              {tr('shell.view.home')}
            </button>
            <button onClick={() => changeMode('player')}>
              <Headphones size={22} />
              {tr('shell.view.player')}
            </button>
            <button onClick={() => setModal('about')}>
              <Settings2 size={22} />
              {tr('app.settings')}
            </button>
            <button onClick={() => setModal('help')}>
              <Info size={22} />
              {tr('shell.help')}
            </button>
          </div>
        </Modal>
      )}
      {modal === 'about' && (
        <Modal title={tr('app.settings')} onClose={() => setModal(null)}>
          <section className="settings-section">
            <h3>{tr('shell.appearance')}</h3>
            <label>
              {tr('app.language')}
              <select
                aria-label={tr('app.language')}
                value={language}
                onChange={(event) => {
                  const nextLanguage = event.target.value as Language;
                  setLanguage(nextLanguage);
                  const url = new URL(location.href);
                  if (url.searchParams.has('lang')) {
                    url.searchParams.set('lang', nextLanguage);
                    history.replaceState(history.state, '', url.href);
                  }
                }}
              >
                {Object.entries(languageNames).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {tr('app.appearance')}
              <select value={uiTheme} onChange={(event) => setUiTheme(event.target.value as Theme)}>
                {themes.map((value) => (
                  <option key={value} value={value}>
                    {themeNames[value]}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="settings-section">
            <div className="settings-row">
              <h3>Spotify</h3>
              <SpotifyAccount />
            </div>
            <button className="secondary full" onClick={() => openSpotifySetup()}>
              <Settings2 size={18} />
              {tr('app.spotifySettings')}
            </button>
          </section>
          <AppInstall />
          <section className="settings-section">
            <h3>{tr('shell.data')}</h3>
            <p>{tr('shell.localData')}</p>
          </section>
          <div className="settings-links">
            <button onClick={() => setModal('help')}>{tr('shell.help')}</button>
            <ReportIssueLink />
            <a
              href="https://github.com/ArtifexEt/Hiciarz"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr('app.projectRepository')}
              <ArrowUpRight size={16} />
            </a>
            <a
              href="https://buymeacoffee.com/szymonrybka"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr('shell.support')}
              <ArrowUpRight size={16} />
            </a>
            <button
              onClick={async () => {
                if (!navigator.onLine) {
                  notify(tr('shell.updateUnavailable'));
                  return;
                }
                try {
                  await checkForUpdates();
                  notify(
                    updateIsReady()
                      ? tr('app.aNewVersionIsReadyChooseLoad')
                      : tr('shell.updateNotReady'),
                  );
                } catch {
                  notify(tr('app.couldNotCheckForUpdatesCheckYour'));
                }
              }}
            >
              {tr('shell.updateCheck')}
            </button>
            <small>
              {tr('app.version')} {appVersion}
            </small>
          </div>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title={tr('shell.help')} onClose={() => setModal(null)} wide>
          <div className="help-grid">
            <div>
              <span>01</span>
              <h3>{tr('app.prepareADeck')}</h3>
              <p>{tr('app.addTracksManuallyFromAFileOr')}</p>
            </div>
            <div>
              <span>02</span>
              <h3>{tr('app.printAndCutOut')}</h3>
              <p>{tr('app.a4DoubleSidedPrinting100ScalePrint')}</p>
            </div>
            <div>
              <span>03</span>
              <h3>{tr('app.connectAndScan')}</h3>
              <p>{tr('app.connectSpotifyAndChooseADeviceOr')}</p>
            </div>
          </div>
          <div className="notice">
            <FileJson size={22} />
            <div>
              <strong>{tr('app.importATrackListFromAFile')}</strong>
              <p>{tr('app.jsonAnArrayOfObjectsWithTitle')}</p>
              <div className="inline-actions">
                <button
                  className="text-button"
                  onClick={() =>
                    download(JSON.stringify(newDeck(), null, 2), 'hiciarz-szablon.json')
                  }
                >
                  {tr('app.downloadJsonTemplate')}
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      '\ufefftitle,artist,year,theme,spotify,youtube\r\n',
                      'hiciarz-szablon.csv',
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  {tr('app.downloadCsvTemplate')}
                </button>
              </div>
            </div>
          </div>
          <p className="hint">{tr('app.projectsAndCustomBackgroundsAreSavedIn')}</p>
          <DocumentationLinks />
        </Modal>
      )}
    </div>
  );
}
