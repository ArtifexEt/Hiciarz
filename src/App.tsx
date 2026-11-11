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
  type ReactNode,
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
  Coffee,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  Grid3X3,
  Headphones,
  Info,
  LayoutGrid,
  Link2,
  LoaderCircle,
  Monitor,
  MoreHorizontal,
  Music2,
  Menu,
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
  Wifi,
  X,
} from 'lucide-react';
import { qrImage } from './qr';
import Landing from './Landing';
import FishFestivities from './FishFestivities';
import SpotifyAccount from './SpotifyAccount';
import SpotifySetup from './SpotifySetup';
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
import { frontDesign, frontImage } from './front';
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
  cardUrl,
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
type Mode = 'home' | 'editor' | 'scanner' | 'player' | 'bingo';
function trackCount(count: number) {
  const form = new Intl.PluralRules(getLanguage()).select(count);
  return tr('app.trackCount.' + form, { count });
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'modal wide' : 'modal'}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon" aria-label={tr('app.close')} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
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
function CardPreview({ song, deck, back = false }: { song: Song; deck: Deck; back?: boolean }) {
  const theme = deck.print.style === 'laser' ? 'laser' : song.theme || deck.theme;
  return (
    <div
      className={'music-card ' + (back ? 'back' : 'front') + ' card-' + theme}
      style={
        back
          ? {
              backgroundImage: `url("${theme === 'laser' ? themeArt('laser') : deck.back || themeArt(theme)}")`,
            }
          : {
              backgroundImage: `url("${frontImage(song, deck)}")`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              color: frontDesign(song, deck).ink,
            }
      }
    >
      {back ? (
        <>
          <span className="card-wordmark">
            {tr('app.hiciarz')}
            <span>✳</span>
          </span>
          <div className="card-qr">
            <QR value={cardUrl(song, deck.theme)} />
          </div>
          <small>
            {song.gameMode === 'movie'
              ? tr('app.guessTheMovie')
              : song.gameMode === 'game'
                ? tr('app.guessTheGame')
                : tr('app.scanListenGuess')}
          </small>
        </>
      ) : (
        <>
          <div className="card-topline">
            <span>{tr('app.hiciarz2')}</span>
          </div>
          <strong className="card-year">
            {song.gameMode === 'movie'
              ? tr('app.movie')
              : song.gameMode === 'game'
                ? tr('app.game')
                : song.year}
          </strong>
          <h3>{song.gameMode && song.gameMode !== 'music' ? song.answer : song.title}</h3>
          <p>{song.gameMode && song.gameMode !== 'music' ? song.title : song.artist}</p>
          <div className="card-bottomline">
            <span>{song.id.slice(0, 12)}</span>
          </div>
        </>
      )}
    </div>
  );
}
function SongForm({
  song,
  defaultMode = 'music',
  onSave,
  onClose,
}: {
  song?: Song;
  defaultMode?: GameMode;
  onSave: (s: Song) => void;
  onClose: () => void;
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
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [bingoOpened, setBingoOpened] = useState(false);
  const [showCoffee, setShowCoffee] = useState(localStorage.getItem('hiciarz-hide-coffee') !== '1');
  const updateAvailable = useSyncExternalStore(subscribeToUpdates, updateIsReady);
  const [updating, setUpdating] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]),
    [loaded, setLoaded] = useState(false),
    [activeId, setActiveId] = useState(''),
    [mode, setMode] = useState<Mode>('home'),
    [tab, setTab] = useState<CreatorStep>('songs');
  useEffect(() => {
    if (mode === 'bingo') setBingoOpened(true);
  }, [mode]);
  const focusedScanner = isMobile && mode === 'scanner';
  const [modal, setModal] = useState<
      | 'song'
      | 'spotify'
      | 'spotify-setup'
      | 'print-cards'
      | 'examples'
      | 'file'
      | 'help'
      | 'about'
      | 'delete'
      | 'check'
      | 'prompt'
      | null
    >(null),
    [editSong, setEditSong] = useState<Song>(),
    [filter, setFilter] = useState(''),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [previewIndex, setPreviewIndex] = useState(0),
    [showBack, setShowBack] = useState(false),
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
  const [scanFeedback, setScanFeedback] = useState<{ sequence: number; kind: 'card' | 'pair' }>();
  const reportPlayback = useCallback((text: string, state?: PlaybackState) => {
    setPlayState(text);
    if (state) setPlaybackState(state);
  }, []);
  const [output, setOutputState] = useState<PlaybackOutput>(() =>
    initialPlaybackOutput(localStorage.getItem('hiciarz-output'), spotifyConfigured()),
  );
  const setOutput = async (value: PlaybackOutput) => {
    if (playbackTransition.current) return false;
    if (value === outputRef.current) return true;
    playbackTransition.current = true;
    try {
      if (outputRef.current === 'spotify' && card) await spotifyRemote.stop();
      if (card && mode === 'scanner' && outputRef.current === 'browser')
        room.send(undefined, 'stop');
      if (mode === 'scanner' && value !== 'browser' && (room.connected || room.pairUrl))
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
    }
  };
  const spotifyRemote = useSpotifyRemote(
    card,
    command,
    output === 'spotify' && (mode === 'scanner' || mode === 'player'),
    reportPlayback,
    mode === 'scanner' ? 'scanner' : 'player',
  );
  const outputRef = useRef(output);
  outputRef.current = output;
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
    try {
      updateDeck({ back: await imageData(file) });
      setShowBack(true);
    } catch (error) {
      notify((error as Error).message);
    }
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
    const query = window.matchMedia('(max-width: 700px)');
    const resized = () => setIsMobile(query.matches);
    query.addEventListener('change', resized);
    return () => query.removeEventListener('change', resized);
  }, []);
  useEffect(() => {
    const show = (event: Event) => {
      const purpose = (event as CustomEvent<{ purpose?: SpotifyPurpose }>).detail?.purpose;
      if (purpose === 'player')
        sessionStorage.setItem(
          'hiciarz-spotify-return-mode',
          mode === 'scanner' ? 'scanner' : 'player',
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
    if (!appMenuOpen) return;
    const dismiss = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.mobile-app-menu, .mobile-menu-toggle'))
        setAppMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [appMenuOpen]);
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
        if (!(await setOutput('spotify'))) return;
        setMode('scanner');
        sessionStorage.setItem('hiciarz-spotify-return-mode', 'scanner');
        setSpotifySetup((previous) => ({
          purpose: 'player',
          clientId: q.clientId,
          revision: previous.revision + 1,
        }));
        setModal('spotify-setup');
      } else if (q.kind === 'pair') {
        if (!(await setOutput('browser'))) return;
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
      if (location.href === raw)
        history.replaceState(null, '', location.pathname + location.search);
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
  function goToCreatorStep(next: CreatorStep) {
    if (next !== 'songs' && !deck.songs.length) return;
    setTab(next);
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
        if (!(await setOutput('browser'))) return;
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
    if (pdfAbort.current) return;
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
  async function changeMode(next: Mode) {
    setAppMenuOpen(false);
    if (next === mode || playbackTransition.current) return;
    playbackTransition.current = true;
    try {
      if (outputRef.current === 'spotify' && card) await spotifyRemote.stop();
      if (mode === 'scanner' && outputRef.current === 'browser' && card)
        room.send(undefined, 'stop');
      if (room.connected || room.pairUrl) room.disconnect();
      clearRound();
      incomingCard.current = null;
      setMode(next);
      if (next === 'player') {
        outputRef.current = 'browser';
        setOutputState('browser');
        localStorage.setItem('hiciarz-output', 'browser');
      }
    } catch (error) {
      notify((error as Error).message);
    } finally {
      playbackTransition.current = false;
    }
  }
  const filtered =
    deck?.songs.filter((s) =>
      (s.title + ' ' + s.artist + ' ' + s.year)
        .toLocaleLowerCase(language)
        .includes(filter.toLocaleLowerCase(language)),
    ) || [];
  const previewSong = deck?.songs[Math.min(previewIndex, Math.max(0, deck.songs.length - 1))];
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
        (focusedScanner ? ' focused-scanner' : '') +
        ((mode === 'scanner' || mode === 'player') && card ? ' playback-active' : '')
      }
    >
      <aside className="sidebar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label={tr('app.hiciarzHome')}>
          <span className="brand-icon">
            <img src={asset('icon.svg')} alt="" aria-hidden="true" width="38" height="38" />
          </span>
          {tr('app.hiciarz')}
          <span className="brand-star">✳</span>
        </a>
        <div className="sidebar-group">
          <span className="eyebrow">{tr('app.yourMusicSpace')}</span>
          <nav aria-label={tr('app.appModes')}>
            <button
              className={mode === 'editor' ? 'nav active' : 'nav'}
              onClick={() => changeMode('editor')}
            >
              <LayoutGrid size={19} /> {tr('app.cardCreator')} <span className="nav-dot" />
            </button>
            <button
              className={mode === 'scanner' ? 'nav active' : 'nav'}
              onClick={() => changeMode('scanner')}
            >
              <ScanLine size={19} /> {tr('app.cardScanner')}
            </button>
            <button
              className={mode === 'player' ? 'nav active' : 'nav'}
              onClick={() => changeMode('player')}
            >
              <Headphones size={19} /> {tr('app.player')}{' '}
              {room.connected && <span className="live-dot" />}
            </button>
            {!isMobile && (
              <button
                className={mode === 'bingo' ? 'nav active' : 'nav'}
                onClick={() => changeMode('bingo')}
              >
                <Grid3X3 size={19} /> {tr('app.bingo')}
              </button>
            )}
          </nav>
        </div>
        <div className="sidebar-group decks">
          <div className="label-row">
            <span className="eyebrow">{tr('app.yourDecks')}</span>
            <button
              className="icon small"
              aria-label={tr('app.createANewDeck')}
              onClick={() => {
                const d = newDeck();
                setDecks([...decks, d]);
                setActiveId(d.id);
                void changeMode('editor');
              }}
            >
              <Plus size={17} />
            </button>
          </div>
          {decks.map((d) => (
            <button
              key={d.id}
              className={'deck-nav ' + (d.id === deck.id ? 'selected' : '')}
              onClick={() => {
                setActiveId(d.id);
                changeMode('editor');
              }}
            >
              <span className={'deck-dot ' + d.theme} />
              <span>{d.name}</span>
              <small>{d.songs.length}</small>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={20} />
            <strong>
              {tr('app.aGreatEveningStarts')}
              <br />
              {tr('app.withGreatMusic')}
            </strong>
            <p>{tr('app.createSomethingThatBringsYouTogether')}</p>
          </div>
          <a href="https://buymeacoffee.com/szymonrybka" target="_blank" rel="noreferrer">
            <Coffee size={17} /> {tr('app.buyACoffee')} <ArrowUpRight size={14} />
          </a>
          <a href="https://github.com/ArtifexEt/Hiciarz" target="_blank" rel="noreferrer">
            <FileJson size={17} /> {tr('app.openSourceCode')} <ArrowUpRight size={14} />
          </a>
          <button className="help-link" onClick={() => setModal('help')}>
            <Info size={17} /> {tr('app.howDoesItWork')}
          </button>
          <span className="version">{tr('app.hiciarzStudio01')}</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            {mode === 'home' ? (
              <span className="start-brand">
                {tr('app.hiciarz')} <span aria-hidden="true">✳</span>
              </span>
            ) : (
              <>
                <button
                  className="start-link"
                  onClick={() => changeMode('home')}
                  aria-label={tr('app.backToHome')}
                >
                  <ChevronLeft size={16} />
                  {tr('app.home')}
                </button>
                <ChevronRight size={13} />
                <strong>
                  {mode === 'editor'
                    ? tr('app.cardCreator')
                    : mode === 'scanner'
                      ? tr('app.cardScanner')
                      : mode === 'bingo'
                        ? tr('app.bingo')
                        : tr('app.player')}
                </strong>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className="save-status">
              <span className={storageError ? 'warn-dot' : 'live-dot'} />
              {storageError ? tr('app.savingUnavailable') : tr('app.savedLocally')}
            </span>
            <label className="theme-select">
              <Palette size={16} />
              <select
                aria-label={tr('app.appTheme')}
                value={uiTheme}
                onChange={(e) => setUiTheme(e.target.value as Theme)}
              >
                {themes.map((t) => (
                  <option key={t} value={t}>
                    {themeNames[t]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="icon about-button"
              aria-label={tr('app.settings')}
              title={tr('app.settings')}
              onClick={() => setModal('about')}
            >
              <Settings2 size={20} />
            </button>
            <button
              className="icon mobile-menu-toggle"
              aria-label={tr('app.appMenu')}
              aria-expanded={appMenuOpen}
              aria-controls="mobile-app-menu"
              onClick={() => setAppMenuOpen(!appMenuOpen)}
            >
              <Menu size={21} />
            </button>
            <SpotifyAccount />
          </div>
          {appMenuOpen && (
            <nav
              id="mobile-app-menu"
              className="mobile-app-menu"
              aria-label={tr('app.appMenu')}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAppMenuOpen(false);
              }}
            >
              <div className="label-row">
                <strong>{tr('app.hiciarz3')}</strong>
                <button
                  className="icon"
                  aria-label={tr('app.closeMenu')}
                  onClick={() => setAppMenuOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <button onClick={() => changeMode('home')}>
                <Music2 size={18} /> {tr('app.homePage')}
              </button>
              <button
                onClick={() => {
                  changeMode('scanner');
                  setAppMenuOpen(false);
                }}
              >
                <ScanLine size={18} /> {tr('app.scanAndPlay')}
              </button>
              <button
                onClick={() => {
                  changeMode('editor');
                  setAppMenuOpen(false);
                }}
              >
                <LayoutGrid size={18} /> {tr('app.createCards')}
              </button>
              <button
                onClick={() => {
                  changeMode('player');
                  setAppMenuOpen(false);
                }}
              >
                <Headphones size={18} /> {tr('app.player')}
              </button>
              <button onClick={() => changeMode('bingo')}>
                <Grid3X3 size={18} /> {tr('app.bingo')}
              </button>
              <label>
                {tr('app.appearance')}
                <select
                  aria-label={tr('app.menuTheme')}
                  value={uiTheme}
                  onChange={(e) => setUiTheme(e.target.value as Theme)}
                >
                  {themes.map((t) => (
                    <option key={t} value={t}>
                      {themeNames[t]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => {
                  setModal('about');
                  setAppMenuOpen(false);
                }}
              >
                <Settings2 size={18} /> {tr('app.settings')}
              </button>
            </nav>
          )}
        </header>
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
        {showCoffee && mode === 'editor' && (
          <div className="coffee-support">
            <a
              href="https://buymeacoffee.com/szymonrybka"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Coffee size={20} aria-hidden="true" />
              <span>
                {tr('app.enjoyingHiciarz')} <strong>{tr('app.buyMeACoffee')}</strong>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <button
              className="icon"
              aria-label={tr('app.hideCoffeeBanner')}
              title={tr('app.hideCoffeeBanner')}
              onClick={() => {
                setShowCoffee(false);
                localStorage.setItem('hiciarz-hide-coffee', '1');
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <main>
          {uiTheme === 'fish' &&
            mode !== 'bingo' &&
            !((mode === 'scanner' || mode === 'player') && card) && (
              <FishFestivities compact={mode !== 'home'} />
            )}
          {(bingoOpened || mode === 'bingo') && (
            <div className="bingo-container" hidden={mode !== 'bingo'}>
              <Suspense fallback={<p className="hint">{tr('app.preparingBingo')}</p>}>
                <BingoGame onScanner={() => changeMode('scanner')} />
              </Suspense>
            </div>
          )}
          {mode === 'bingo' ? null : mode === 'home' ? (
            <Landing onChoose={changeMode} theme={uiTheme} />
          ) : mode === 'editor' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="tiny-line" /> {tr('app.makeMusicAGreatEvening')}
                  </div>
                  <h1>
                    {tr('app.createYourOwnCards')}
                    <span className="heading-star">✳</span>
                  </h1>
                </div>
                <div className="heading-actions print-action">
                  <button
                    className="primary"
                    disabled={!printCount || busy}
                    onClick={openPrintCards}
                    aria-haspopup="dialog"
                  >
                    {busy ? <LoaderCircle size={18} className="spin" /> : <Printer size={18} />}{' '}
                    {busy ? tr('app.preparingCards') : tr('app.downloadPrintCards')}{' '}
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                </div>
              </section>
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
              <section className="deck-toolbar">
                <label className="mobile-deck-picker">
                  {tr('app.yourDecks2')}
                  <select
                    aria-label={tr('app.selectADeck')}
                    value={activeId}
                    onChange={(e) => {
                      setActiveId(e.target.value);
                    }}
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {trackCount(d.songs.length)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="deck-title">
                  <span
                    className="deck-art"
                    style={{ backgroundImage: `url("${themeArt(deck.theme)}")` }}
                  >
                    <Music2 size={22} />
                  </span>
                  <div>
                    <label className="sr-only" htmlFor="deck-name">
                      {tr('app.deckName')}
                    </label>
                    <input
                      id="deck-name"
                      value={deck.name}
                      maxLength={100}
                      onChange={(e) => updateDeck({ name: e.target.value })}
                    />
                    <div className="deck-meta">
                      <span>{trackCount(deck.songs.length)}</span>
                      <i /> <span>{themeNames[deck.theme]}</span>
                      <i />
                      <span>{tr('app.a46060Mm')}</span>
                    </div>
                  </div>
                </div>
                <div className="toolbar-buttons">
                  <button
                    className="secondary"
                    aria-label={tr('app.newDeck')}
                    onClick={() => {
                      const d = newDeck();
                      setDecks([...decks, d]);
                      setActiveId(d.id);
                      void changeMode('editor');
                    }}
                  >
                    <Plus size={17} /> {tr('app.newDeck')}
                  </button>
                  <button className="secondary" onClick={() => fileRef.current?.click()}>
                    <FolderOpen size={17} /> {tr('app.import')}
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(JSON.stringify(deck, null, 2), `${deck.name || 'talia'}.json`)
                    }
                  >
                    <Download size={17} /> {tr('app.saveProject')}
                  </button>
                  <button
                    className="secondary delete-deck-button"
                    aria-label={tr('app.deleteDeck')}
                    onClick={() => setModal('delete')}
                  >
                    <Trash2 size={17} /> {tr('app.deleteDeck')}
                  </button>
                </div>
              </section>
              <div className="studio-grid">
                <section className="editor-panel">
                  <CreatorSteps
                    current={tab}
                    hasSongs={deck.songs.length > 0}
                    onChange={goToCreatorStep}
                  />
                  {tab === 'songs' ? (
                    <>
                      <div className="creator-game-choice">
                        <GameModePicker
                          value={deck.gameMode || 'music'}
                          onChange={(gameMode) => updateDeck({ gameMode })}
                        />
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
                      <div className="import-banner">
                        <span className="spotify-mark">≋</span>
                        <div>
                          <strong>{tr('app.yourPlaylistYourDeck')}</strong>
                          <p>
                            {deck.gameMode && deck.gameMode !== 'music'
                              ? tr('creator.importRecordingNote')
                              : tr('app.importYourOwnOrACollaborativeSpotify')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            sessionStorage.removeItem('spotify-import-playlist');
                            setModal('spotify');
                          }}
                        >
                          {tr('app.importPlaylist')} <ArrowUpRight size={17} />
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
                      <div className="table-tools">
                        <label className="search">
                          <Search size={17} />
                          <input
                            aria-label={tr('app.searchTracks')}
                            placeholder={tr('app.searchByTitleArtistOrYear')}
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
                      {selected.size > 0 && (
                        <div className="selection-bar">
                          <span>
                            {tr('app.selected')} {selected.size}
                          </span>
                          <button onClick={openPrintCards} disabled={busy || !printCount}>
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
                      <div
                        className="song-table"
                        role="region"
                        aria-label={tr('creator.collection.' + (deck.gameMode || 'music'))}
                        tabIndex={filtered.length > 8 ? 0 : -1}
                      >
                        <div className="table-head">
                          <input
                            type="checkbox"
                            aria-label={tr('app.selectVisibleTracks')}
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
                                  className="icon tiny"
                                  aria-label={tr('app.moveUp') + s.title}
                                  disabled={i === 0}
                                  onClick={() => {
                                    const songs = [...deck.songs];
                                    [songs[i - 1], songs[i]] = [songs[i], songs[i - 1]];
                                    updateDeck({ songs });
                                  }}
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  className="icon tiny"
                                  aria-label={tr('app.moveDown') + s.title}
                                  disabled={i === deck.songs.length - 1}
                                  onClick={() => {
                                    const songs = [...deck.songs];
                                    [songs[i + 1], songs[i]] = [songs[i], songs[i + 1]];
                                    updateDeck({ songs });
                                  }}
                                >
                                  <ArrowDown size={13} />
                                </button>
                                <button
                                  className="icon tiny"
                                  aria-label={tr('app.delete') + s.title}
                                  onClick={() => {
                                    updateDeck({ songs: deck.songs.filter((x) => x.id !== s.id) });
                                    setSelected(new Set([...selected].filter((id) => id !== s.id)));
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!filtered.length && (
                          <div className="empty-list">
                            <Music2 size={28} />
                            <h3>
                              {filter ? tr('app.noTracksFound') : tr('app.theFirstHitIsYours')}
                            </h3>
                            <p>
                              {filter
                                ? tr('app.tryChangingYourSearch')
                                : tr('app.addASongImportAFileOr')}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="table-footer">
                        <span>
                          {filtered.length} {tr('app.of')} {trackCount(deck.songs.length)}
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
                          <strong>{tr('app.alreadyHaveATrackList')}</strong>
                          <span>{tr('app.dropTrackFile')}</span>
                        </div>
                        <button className="text-button" onClick={() => fileRef.current?.click()}>
                          {tr('app.chooseFile')} <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <button
                        className="text-button prompt-copy"
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
                      </p>
                    </>
                  ) : tab === 'design' ? (
                    <div className="design-content">
                      <div className="panel-heading">
                        <div>
                          <h2>{tr('app.giveYourDeckCharacter')}</h2>
                          <p>{tr('app.chooseACardBackgroundSetThePage')}</p>
                        </div>
                      </div>
                      <ThemePicker
                        value={deck.theme}
                        onChange={(theme) => {
                          updateDeck({ theme, back: undefined });
                        }}
                      />
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
                      {deck.back && (
                        <div className="notice">
                          <span>
                            {tr('app.yourCustomBackgroundIsActiveCardColours')}
                            {themeNames[deck.theme]}”.
                          </span>
                          <button
                            className="text-button"
                            onClick={() => updateDeck({ back: undefined })}
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
                          <h2>{tr('app.readyToCutOut')}</h2>
                          <p>{tr('app.a412CardsPerSheet6060')}</p>
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
                        disabled={!printCount || busy}
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
                <aside className="preview-panel">
                  <div className="preview-heading">
                    <span className="eyebrow">{tr('app.howItWillLook')}</span>
                    <span className="live-tag">
                      <span /> {tr('app.livePreview')}
                    </span>
                  </div>
                  <div className="preview-stage">
                    {previewSong ? (
                      <>
                        <div className="ghost-card" />
                        <div className="main-card">
                          <CardPreview song={previewSong} deck={deck} back={showBack} />
                        </div>
                      </>
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
                    <button className={showBack ? 'active' : ''} onClick={() => setShowBack(true)}>
                      {tr('app.qrCode')}
                    </button>
                  </div>
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
                  <div className="preview-spec">
                    <span>
                      {tr('app.cardSize')}
                      <strong>{tr('app.6060Mm')}</strong>
                    </span>
                    <span>
                      {tr('app.printLayout')}
                      <strong>{tr('app.12CardsA4')}</strong>
                    </span>
                  </div>
                  <div className="preview-tip">
                    <span>✳</span>
                    <p>
                      <strong>{tr('app.smallCardGreatMemories')}</strong>
                      <br />
                      {tr('app.yearArtistAndTitleOnOneSide')}
                    </p>
                  </div>
                  <button
                    className="text-button full preview-theme"
                    disabled={!deck.songs.length}
                    onClick={() => goToCreatorStep('design')}
                  >
                    <Palette size={16} /> {tr('app.exploreAllThemes')} <ArrowUpRight size={16} />
                  </button>
                </aside>
              </div>
              <div className="bottom-note">
                <ShieldCheck size={15} />
                <span>{tr('app.yourDecksStayInYourBrowserSave')}</span>
              </div>
            </>
          ) : mode === 'scanner' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">{tr('app.oneScanAnotherHit')}</div>
                  <h1>
                    {card ? tr('app.listenAndGuess') : tr('app.scanAndPlay')}
                    <span className="heading-star">✳</span>
                  </h1>
                  {!card && output !== 'local' && (
                    <p>
                      {gameReady
                        ? tr('app.playbackIsReadyStartTheCameraAnd')
                        : tr('app.firstChooseWhereMusicShouldPlayThen')}
                    </p>
                  )}
                </div>
              </section>
              <div className={'play-layout' + (gameReady ? ' game-ready' : '')}>
                <section className="surface scan-surface">
                  <details
                    className="playback-setup"
                    open={!gameReady || Boolean(spotifyRemote.error && output === 'spotify')}
                  >
                    <summary>
                      <span className={gameReady ? 'live-dot' : 'warn-dot'} />
                      {gameReady
                        ? output === 'spotify'
                          ? tr('app.playingOnDevice', {
                              name:
                                spotifyRemote.devices.find((d) => d.id === spotifyRemote.device)
                                  ?.name || 'Spotify',
                            })
                          : output === 'local'
                            ? tr('app.playingOnThisDevice')
                            : tr('app.connectedToPlayer')
                        : tr('app.setUpPlayback')}
                      <Settings2 size={16} />
                    </summary>
                    <div
                      className="output-switch"
                      role="group"
                      aria-label={tr('app.playbackMethod')}
                    >
                      <button
                        className={output === 'local' ? 'active' : ''}
                        aria-pressed={output === 'local'}
                        onClick={() => setOutput('local')}
                      >
                        {tr('app.onThisDevice')}
                      </button>
                      <button
                        className={output === 'browser' ? 'active' : ''}
                        aria-pressed={output === 'browser'}
                        onClick={() => setOutput('browser')}
                      >
                        {tr('app.secondScreen')}
                      </button>
                      <button
                        className={output === 'spotify' ? 'active' : ''}
                        aria-pressed={output === 'spotify'}
                        onClick={() => setOutput('spotify')}
                      >
                        {tr('app.mySpotify')}
                      </button>
                    </div>
                    {output === 'local' ? (
                      <>
                        <label className="source-picker">
                          {tr('app.preferredSource')}
                          <select
                            value={preferred}
                            onChange={(e) => setPreferred(e.target.value as 'spotify' | 'youtube')}
                          >
                            <option value="spotify">{tr('app.spotify')}</option>
                            <option value="youtube">{tr('app.youtube')}</option>
                          </select>
                        </label>
                        <p className="hint">{tr('app.theSpotifyOrYoutubePlayerMayShow')}</p>
                      </>
                    ) : (
                      <details
                        className="mode-help"
                        key={output}
                        open={
                          !(
                            (output === 'spotify' && spotifyRemote.ready) ||
                            (output === 'browser' && room.connected)
                          )
                        }
                      >
                        <summary>
                          {output === 'spotify'
                            ? tr('app.howToPlayThroughSpotify')
                            : tr('app.howToConnectASecondScreen')}
                        </summary>
                        {output === 'spotify' ? (
                          <>
                            <ol>
                              <li>{tr('app.openSpotifyOnTheDeviceWhereYou')}</li>
                              <li>{tr('app.signInBelowAndSelectThatDevice')}</li>
                              <li>{tr('app.startTheCameraEveryCardQrCode')}</li>
                            </ol>
                            <p>{tr('app.youNeedSpotifyPremiumIfYourAccount')}</p>
                          </>
                        ) : (
                          <>
                            <ol>
                              <li>{tr('app.openHiciarzOnThePlaybackDeviceAnd')}</li>
                              <li>{tr('app.clickConnectScannerThereToShowThe')}</li>
                              <li>{tr('app.startTheCameraHereScanTheScreen')}</li>
                            </ol>
                            <p>{tr('app.pairingNeedsNoSignInBothDevices')}</p>
                          </>
                        )}
                      </details>
                    )}
                    {output !== 'local' && (
                      <div className="status-bar">
                        <span
                          className={
                            (output === 'spotify' ? spotifyRemote.linked : room.connected)
                              ? 'live-dot'
                              : 'warn-dot'
                          }
                        />
                        <strong>
                          {output === 'spotify'
                            ? spotifyRemote.linked
                              ? tr('app.spotifyAccountConnected')
                              : tr('app.connectSpotifyAccount')
                            : room.status}
                        </strong>
                        {output === 'browser' && room.connected && (
                          <button className="text-button" onClick={room.disconnect}>
                            {tr('app.disconnect')}
                          </button>
                        )}
                      </div>
                    )}
                    {output === 'spotify' && <SpotifyRemotePanel remote={spotifyRemote} />}
                    {card && (
                      <button
                        className="quiet"
                        disabled={!gameReady}
                        onClick={() => sendPlaybackCommand('stop')}
                      >
                        {tr('app.stopPlayback')}
                      </button>
                    )}
                  </details>
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
                  {!card && output !== 'local' && (
                    <p className="ack" aria-live="polite">
                      {output !== 'browser'
                        ? displayTranslation(playState)
                        : room.ack ||
                          (room.connected
                            ? tr('app.connectedScanAMusicCard')
                            : tr('app.controlsWillBeAvailableAfterPairingDevices'))}
                    </p>
                  )}
                </section>
                <aside className="surface instructions">
                  {output === 'local' ? (
                    <>
                      <span className="mini-icon">
                        <Headphones size={23} />
                      </span>
                      <h2>{tr('app.scanAndListenHere')}</h2>
                      <p>{tr('app.scannedTrackPlaysHere')}</p>
                    </>
                  ) : output === 'spotify' ? (
                    <>
                      <span className="mini-icon">
                        <Music2 size={23} />
                      </span>
                      <h2>{tr('app.yourDeviceYourHits')}</h2>
                      <p>{tr('app.connectYourAccountSelectADeviceAnd')}</p>
                      <p className="hint">{tr('app.spotifyPlaybackNeedsNoSecondDeviceOr')}</p>
                    </>
                  ) : (
                    <>
                      <span className="mini-icon">
                        <Link2 />
                      </span>
                      <h2>
                        {tr('app.oneConnection')}
                        <br />
                        {tr('app.aWholeEveningOfMusic')}
                      </h2>
                      <ol>
                        <li>
                          <strong>{tr('app.openPlayer')}</strong>
                          <p>{tr('app.choosePlayerOnThisSamePage')}</p>
                        </li>
                        <li>
                          <strong>{tr('app.scanThePairingQrCode')}</strong>
                          <p>{tr('app.inThePlayerChooseConnectScannerThen')}</p>
                        </li>
                        <li>
                          <strong>{tr('app.scanYourMusicCards')}</strong>
                          <p>{tr('app.theScannerSendsCommandsAndTheConnected')}</p>
                        </li>
                      </ol>
                      <div className="hint-box">
                        <Wifi size={18} />
                        <span>{tr('app.bothDevicesNeedInternetKeepTheScanner')}</span>
                      </div>
                    </>
                  )}
                </aside>
              </div>
            </>
          ) : (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">{tr('app.greatSoundStartsHere')}</div>
                  <h1>
                    {tr('app.player')}
                    <span className="heading-star">✳</span>
                  </h1>
                  <p>
                    {output === 'spotify'
                      ? tr('app.signInAndChooseASpotifyConnect')
                      : tr('app.connectAScannerAndPlayMusicOn')}
                  </p>
                </div>
                <button className="primary" onClick={room.host}>
                  <Smartphone size={18} />{' '}
                  {room.pairUrl ? tr('app.newPairingCode') : tr('app.connectScanner')}
                </button>
              </section>
              <div className={'play-layout' + (card && gameReady ? ' game-ready' : '')}>
                <section className="surface player-surface">
                  <details className="mode-help">
                    <summary>{tr('app.anotherPlaybackMethod')}</summary>
                    <div
                      className="output-switch"
                      role="group"
                      aria-label={tr('app.playbackLocation')}
                    >
                      <button
                        className={output === 'browser' ? 'active' : ''}
                        onClick={() => setOutput('browser')}
                      >
                        {tr('app.onThisDevice')}
                      </button>
                      <button
                        className={output === 'spotify' ? 'active' : ''}
                        onClick={() => setOutput('spotify')}
                      >
                        {tr('app.mySpotify')}
                      </button>
                    </div>
                    {card && output === 'browser' && (
                      <button className="quiet" onClick={() => sendPlaybackCommand('stop')}>
                        {tr('app.stopPlayback')}
                      </button>
                    )}
                    {room.connected && (
                      <button className="quiet" onClick={room.disconnect}>
                        {tr('app.disconnectScanner')}
                      </button>
                    )}
                  </details>
                  <div className="player-top">
                    <div className="status-bar">
                      <span
                        className={
                          (output === 'spotify' ? spotifyRemote.ready : room.connected)
                            ? 'live-dot'
                            : 'warn-dot'
                        }
                      />
                      <strong>
                        {output === 'spotify'
                          ? spotifyRemote.ready
                            ? tr('app.spotifyReady')
                            : spotifyRemote.linked
                              ? tr('app.selectSpotifyDevice')
                              : tr('app.connectSpotifyAccount')
                          : room.status}
                      </strong>
                    </div>
                    {output === 'browser' && (
                      <label className="source-picker">
                        {tr('app.preferredSource')}
                        <select
                          value={preferred}
                          onChange={(e) => {
                            setPreferred(e.target.value as 'spotify' | 'youtube');
                            if (card?.sources[e.target.value as 'spotify' | 'youtube'])
                              setSource(e.target.value as 'spotify' | 'youtube');
                          }}
                        >
                          <option value="spotify">{tr('app.spotify')}</option>
                          <option value="youtube">{tr('app.youtube')}</option>
                        </select>
                      </label>
                    )}
                  </div>
                  {output === 'spotify' ? (
                    <details
                      className="playback-setup"
                      open={!spotifyRemote.ready || Boolean(spotifyRemote.error)}
                    >
                      <summary>
                        <span className={spotifyRemote.ready ? 'live-dot' : 'warn-dot'} />
                        {tr('app.spotifyDevice')}
                        <Settings2 size={16} />
                      </summary>
                      <SpotifyRemotePanel remote={spotifyRemote} />
                      {card && (
                        <button
                          className="quiet"
                          disabled={!spotifyRemote.ready}
                          onClick={() => sendPlaybackCommand('stop')}
                        >
                          {tr('app.stopPlayback')}
                        </button>
                      )}
                    </details>
                  ) : (
                    !card && (
                      <Players
                        card={null}
                        source={source}
                        command={command}
                        onState={reportPlayback}
                      />
                    )
                  )}
                  {!card && (
                    <div className="play-state" role="status">
                      <Radio size={17} />
                      {displayTranslation(playState)}
                    </div>
                  )}
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
                      : tr('app.connectAScannerStartPlaying')}
                  </h2>
                  {room.pairUrl ? (
                    <>
                      <div className="pair-qr">
                        <QR value={room.pairUrl} />
                      </div>
                      <p>{tr('app.openCardScannerOnTheOtherDevice')}</p>
                      <button className="secondary full" onClick={room.disconnect}>
                        {tr('app.endSession')}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>{tr('app.clickConnectScannerToShowAQr')}</p>
                      <button className="secondary full" onClick={room.host}>
                        {tr('app.preparePairingQrCode')}
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
        <footer className="workspace-footer">
          <span>{tr('app.madeForMusicAndGoodCompany')}</span>
          <button className="text-button" onClick={() => setModal('about')}>
            {tr('app.about')}
          </button>
          <button
            className="text-button version-check"
            onClick={async () => {
              try {
                await checkForUpdates();
                notify(
                  updateIsReady()
                    ? tr('app.aNewVersionIsReadyChooseLoad')
                    : tr('app.updateCheckStartedWeWillLetYou'),
                );
              } catch {
                notify(tr('app.couldNotCheckForUpdatesCheckYour'));
              }
            }}
          >
            {tr('app.version')} {appVersion} {tr('app.checkForUpdates')}
          </button>
          <span>
            {tr('app.hiciarz3')} <span>✳</span> {tr('app.openSource')}
          </span>
        </footer>
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
      {modal === 'about' && (
        <Modal title={tr('app.settingsAndAbout')} onClose={() => setModal(null)}>
          <label className="language-setting">
            {tr('app.language')}
            <select
              aria-label={tr('app.language')}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {Object.entries(languageNames).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <p>{tr('app.yourSongsYourCardsYourGreatEvening')}</p>
          <div className="about-links">
            <a
              className="primary"
              href="https://buymeacoffee.com/szymonrybka"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Coffee size={18} /> {tr('app.buyMeACoffee')} <ArrowUpRight size={16} />
            </a>
            <a
              className="secondary"
              href="https://github.com/ArtifexEt/Hiciarz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileJson size={18} /> {tr('app.projectRepository')} <ArrowUpRight size={16} />
            </a>
            <button className="secondary" onClick={() => setModal('help')}>
              {tr('app.howToPlayAndPrepareADeck')}
            </button>
            <button className="secondary" onClick={() => openSpotifySetup()}>
              <Settings2 size={18} /> {tr('app.spotifySettings')}
            </button>
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={showCoffee}
              onChange={(e) => {
                setShowCoffee(e.target.checked);
                localStorage.setItem('hiciarz-hide-coffee', e.target.checked ? '0' : '1');
              }}
            />
            <span>{tr('app.showTheBuyMeACoffeeBanner')}</span>
          </label>
          <p className="hint">{tr('app.yourDecksAreSavedInThisBrowser')}</p>
          <small>
            {tr('app.version')} {appVersion}
          </small>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title={tr('app.fromPlaylistToAGreatEvening')} onClose={() => setModal(null)} wide>
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
        </Modal>
      )}
    </div>
  );
}
