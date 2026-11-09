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
  Pause,
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
  Square,
  Trash2,
  Upload,
  Wifi,
  X,
} from 'lucide-react';
import { qrImage } from './qr';
import { GameGuide } from './GameGuide';
import PlaylistExamples from './PlaylistExamples';
import { createExampleDeck } from './examples';
import playlistPrompt from '../docs/playlist-prompt.txt?raw';
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
  mergeSongs,
  newDeck,
  parseImport,
  readQR,
  themes,
  themeNames,
  validateSong,
} from './model';
import { imageData, loadDecks, saveDecks } from './storage';
import { asset, themeArt } from './themes';
import type { SourceCheck } from './availability';
import { useConnection, type Command } from './connection';
const Camera = lazy(() => import('./Camera'));
const christmasPlaylist = 'https://open.spotify.com/playlist/7wfTeAa7cxhA3qNE05XPKk';
import Players from './Players';
import { SpotifyRemotePanel, useSpotifyRemote } from './SpotifyRemote';
import {
  authorizeSpotify,
  disconnectSpotify,
  finishSpotify,
  importPlaylist,
  spotifyConfigured,
  spotifyConnected,
} from './spotify';
type Mode = 'editor' | 'scanner' | 'player';
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
        <button className="icon" aria-label="Zamknij" onClick={onClose}>
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
    <img className={'qr ' + className} src={url} alt="Kod QR" data-qr-value={value} />
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
          onClick={() => onChange(t)}
        >
          <span style={{ backgroundImage: `url("${themeArt(t)}")` }}>
            {value === t && <Check size={18} />}
          </span>
          <strong>{themeNames[t]}</strong>
          {t === 'fish' && <small>Autorska kolekcja</small>}
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
            hiciarz<span>✳</span>
          </span>
          <div className="card-qr">
            <QR value={cardUrl(song, deck.theme)} />
          </div>
          <small>ZESKANUJ. POSŁUCHAJ. ZGADNIJ.</small>
        </>
      ) : (
        <>
          <div className="card-topline">
            <span>HICIARZ</span>
            <span>♪</span>
          </div>
          <strong className="card-year">{song.year}</strong>
          <h3>{song.title}</h3>
          <p>{song.artist}</p>
          <div className="card-bottomline">
            <span>MUZYKA ŁĄCZY POKOLENIA</span>
            <span>✳</span>
          </div>
        </>
      )}
    </div>
  );
}
function SongForm({
  song,
  onSave,
  onClose,
}: {
  song?: Song;
  onSave: (s: Song) => void;
  onClose: () => void;
}) {
  const [error, setError] = useState('');
  return (
    <Modal title={song ? 'Edytuj utwór' : 'Dodaj swój hit'} onClose={onClose}>
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
              }),
            );
            onClose();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Tytuł
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={song?.title}
              placeholder="Na przykład Dancing Queen"
              autoFocus
            />
          </label>
          <label>
            Wykonawca
            <input
              name="artist"
              required
              maxLength={200}
              defaultValue={song?.artist}
              placeholder="ABBA"
            />
          </label>
          <label>
            Rok do gry
            <input
              name="year"
              type="number"
              required
              min="1000"
              max="2100"
              defaultValue={song?.year || ''}
              placeholder="1976"
            />
          </label>
          <label>
            Motyw karty
            <select name="theme" defaultValue={song?.theme || ''}>
              <option value="">Jak cała talia</option>
              {themes.map((t) => (
                <option key={t} value={t}>
                  {themeNames[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-divider">
          <span>ŹRÓDŁA ODTWARZANIA</span>
          <small>Dodaj przynajmniej jedno</small>
        </div>
        <label>
          Spotify
          <input
            name="spotify"
            defaultValue={
              song?.sources.spotify ? 'https://open.spotify.com/track/' + song.sources.spotify : ''
            }
            placeholder="https://open.spotify.com/track/…"
          />
        </label>
        <label>
          YouTube
          <input
            name="youtube"
            defaultValue={song?.sources.youtube ? 'https://youtu.be/' + song.sources.youtube : ''}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>
        <p className="hint">
          Rok dotyczy konkretnego nagrania. Sprawdź go zwłaszcza dla coverów i reedycji.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Anuluj
          </button>
          <button className="primary" type="submit">
            <Check size={17} /> Zapisz utwór
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
  return (
    <Modal title="Importuj playlistę ze Spotify" onClose={onClose}>
      <div className="notice spotify-import-access">
        <Info size={22} aria-hidden="true" />
        <div>
          <strong>Jakie playlisty możesz wczytać?</strong>
          <p>
            Własne oraz te, które współtworzysz. Spotify nie udostępnia tej aplikacji utworów z
            pozostałych playlist — również publicznych.
          </p>
          <button className="text-button" onClick={onExamples}>
            Wybierz przykład bez logowania <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <p className="muted">Wybierz, co zrobić z obecną listą utworów.</p>
      <div className="choice-list">
        <label>
          <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} />
          <span>
            <strong>Dodaj nowe piosenki na końcu</strong>
            <small>Zachowaj swoje utwory i poprawki. Pomiń duplikaty.</small>
          </span>
        </label>
        <label>
          <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
          <span>
            <strong>Zastąp obecną listę</strong>
            <small>Usuń obecną listę i wczytaj zawartość playlisty.</small>
          </span>
        </label>
      </div>
      {!spotifyConfigured() ? (
        <div className="notice">
          <Music2 size={22} />
          <div>
            <strong>Import Spotify czeka na konfigurację</strong>
            <p>
              Import ze Spotify nie jest obecnie dostępny. Możesz wczytać listę z pliku JSON lub CSV
              albo dodać utwory ręcznie.
            </p>
          </div>
        </div>
      ) : !spotifyConnected() ? (
        <button
          className="primary full"
          onClick={() => {
            sessionStorage.setItem('spotify-import-mode', mode);
            sessionStorage.setItem('spotify-import-playlist', initialPlaylist);
            authorizeSpotify().catch((e) => setError(e.message));
          }}
        >
          Połącz ze Spotify
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
              if (!r.songs.length)
                throw new Error('Playlista nie zawiera utworów możliwych do zaimportowania.');
              onImport(
                r.songs,
                mode,
                `${r.name}. ${r.skipped ? 'Pominięte pozycje: ' + r.skipped + '. ' : ''}Sprawdź lata wydania.`,
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
            Link do playlisty
            <input
              name="playlist"
              required
              defaultValue={initialPlaylist}
              placeholder="https://open.spotify.com/playlist/…"
            />
          </label>
          <p className="hint">
            Zachowamy kolejność playlisty. Lata pobrane z albumów oznaczymy do sprawdzenia.
          </p>
          <button disabled={busy} className="primary full" type="submit">
            {busy ? <LoaderCircle className="spin" size={18} /> : <Download size={18} />}{' '}
            {busy ? 'Pobieram utwory…' : 'Importuj playlistę'}
          </button>
          <button
            className="quiet"
            type="button"
            onClick={() => {
              disconnectSpotify();
              onClose();
            }}
          >
            Odłącz Spotify
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
export default function App() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [fullMobileApp, setFullMobileApp] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [showCoffee, setShowCoffee] = useState(localStorage.getItem('hiciarz-hide-coffee') !== '1');
  const [showDemoOffer, setShowDemoOffer] = useState(false);
  const updateAvailable = useSyncExternalStore(subscribeToUpdates, updateIsReady);
  const [updating, setUpdating] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]),
    [loaded, setLoaded] = useState(false),
    [activeId, setActiveId] = useState(''),
    [mode, setMode] = useState<Mode>(() =>
      window.matchMedia('(max-width: 700px)').matches ? 'scanner' : 'editor',
    ),
    [tab, setTab] = useState<'songs' | 'design' | 'print'>('songs');
  const focusedScanner = isMobile && !fullMobileApp && mode === 'scanner';
  const [modal, setModal] = useState<
      | 'song'
      | 'spotify'
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
    [playState, setPlayState] = useState('Przygotuj połączenie i zeskanuj kartę.'),
    [command, setCommand] = useState<{ type: Command; seq: number } | null>(null);
  const [output, setOutputState] = useState<'browser' | 'spotify'>(() =>
    localStorage.getItem('hiciarz-output') === 'spotify' ||
    (!localStorage.getItem('hiciarz-output') && spotifyConfigured())
      ? 'spotify'
      : 'browser',
  );
  const setOutput = (value: 'browser' | 'spotify') => {
    setOutputState(value);
    localStorage.setItem('hiciarz-output', value);
  };
  const spotifyRemote = useSpotifyRemote(card, command, output === 'spotify', setPlayState, mode);
  const outputRef = useRef(output);
  outputRef.current = output;
  const fileRef = useRef<HTMLInputElement>(null),
    lastScan = useRef({ id: '', time: 0 }),
    incomingCard = useRef<Card | null>(null),
    saveQueue = useRef(Promise.resolve()),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [checks, setChecks] = useState<SourceCheck[]>([]),
    [checking, setChecking] = useState(false),
    [checkProgress, setCheckProgress] = useState(0);
  const deck = decks.find((d) => d.id === activeId) || decks[0];
  const notify = useCallback((s: string) => {
    setMessage(s);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(''), 6000);
  }, []);
  function receive(c: Card) {
    setCard(c);
    setUiTheme(c.theme);
    setSource(c.sources[preferred] ? preferred : c.sources.spotify ? 'spotify' : 'youtube');
    setPlayState('Wczytuję utwór z karty…');
  }
  function playerCommand(c: Command) {
    setCommand({ type: c, seq: Date.now() });
    if (c === 'stop') {
      setCard(null);
      setPlayState('Zatrzymano. Czekam na kolejną kartę.');
    }
  }
  const room = useConnection(receive, playerCommand);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const resized = () => setIsMobile(query.matches);
    query.addEventListener('change', resized);
    return () => query.removeEventListener('change', resized);
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
        setShowDemoOffer(!localStorage.getItem('hiciarz-demo-offer-v1'));
      })
      .catch(() => {
        if (!live) return;
        const empty = newDeck();
        setDecks([empty]);
        setActiveId(empty.id);
        setLoaded(true);
        setStorageError('Nie można odczytać zapisu lokalnego. Pobieraj kopie projektu do pliku.');
      });
    return () => {
      live = false;
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(() => saveDecks(decks))
      .then(() => setStorageError(''))
      .catch(() =>
        setStorageError('Nie udało się zapisać projektu w przeglądarce. Pobierz kopię JSON.'),
      );
  }, [decks, loaded]);
  useEffect(() => {
    const t = themes.includes(uiTheme) ? uiTheme : 'classic';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('hiciarz-theme', t);
  }, [uiTheme]);
  useEffect(() => {
    setSelected(new Set());
    setPreviewIndex(0);
    if (activeId) localStorage.setItem('hiciarz-active-deck', activeId);
  }, [activeId]);
  const oauthStarted = useRef(false);
  useEffect(() => {
    if (oauthStarted.current) return;
    oauthStarted.current = true;
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
            notify('Połączono Spotify. Wybierz urządzenie odtwarzania.');
          } else {
            notify('Połączono Spotify. Wybierz playlistę do importu.');
            setModal('spotify');
          }
        }
      })
      .catch((e) => notify(e.message));
  }, []);
  useEffect(() => {
    function route() {
      if (!location.hash) return;
      try {
        const q = readQR(location.href);
        setMode('scanner');
        if (q.kind === 'pair') {
          setOutput('browser');
          room.join(q.peer, q.token);
        } else if (outputRef.current === 'spotify') {
          receive(q.card);
        } else if (room.send(q.card)) {
          setUiTheme(q.card.theme);
        } else incomingCard.current = q.card;
        history.replaceState(null, '', location.pathname + location.search);
      } catch {
        /* Non-QR hash ignored. */
      }
    }
    const initial = setTimeout(route, 0);
    window.addEventListener('hashchange', route);
    return () => {
      clearTimeout(initial);
      window.removeEventListener('hashchange', route);
    };
  }, []);
  useEffect(() => {
    if (room.connected && incomingCard.current) {
      room.send(incomingCard.current);
      setUiTheme(incomingCard.current.theme);
      incomingCard.current = null;
    }
  }, [room.connected]);
  function updateDeck(patch: Partial<Deck>) {
    setDecks((ds) => ds.map((d) => (d.id === deck.id ? { ...d, ...patch } : d)));
  }
  function importSongs(songs: Song[], mode: 'append' | 'replace', note = '') {
    const r = mergeSongs(deck.songs, songs, mode);
    updateDeck({ songs: r.songs });
    setSelected(new Set());
    notify(
      `Talia ma teraz ${r.songs.length} utworów.${r.skipped ? ' Pominięto duplikaty: ' + r.skipped + '.' : ''} ${note}`,
    );
  }
  function chooseExample(id: string, destination: 'new' | 'append' = 'new') {
    const example = createExampleDeck(id);
    if (destination === 'new') {
      setDecks((ds) => [...ds, example]);
      setActiveId(example.id);
      setUiTheme(example.theme);
      notify(
        `Utworzono „${example.name}”: ${example.songs.length} utworów. Sprawdź lata przed drukiem.`,
      );
    } else importSongs(example.songs, 'append', 'Sprawdź lata przed drukiem.');
    setFilter('');
    setSelected(new Set());
    setPreviewIndex(0);
    setTab('songs');
    setShowDemoOffer(false);
    localStorage.setItem('hiciarz-demo-offer-v1', 'accepted');
    setModal(null);
  }
  function handleScan(raw: string) {
    try {
      const q = readQR(raw);
      if (q.kind === 'pair') {
        setOutput('browser');
        room.join(q.peer, q.token);
        notify('Łączę z odtwarzaczem…');
        return;
      }
      const now = Date.now();
      if (lastScan.current.id === q.card.id && now - lastScan.current.time < 7000) return;
      if (output === 'spotify') {
        lastScan.current = { id: q.card.id, time: now };
        receive(q.card);
        notify('Karta zeskanowana. Wysyłam do Spotify.');
      } else if (room.send(q.card)) {
        lastScan.current = { id: q.card.id, time: now };
        setUiTheme(q.card.theme);
        notify('Karta zeskanowana. Polecenie wysłane.');
      } else notify('Najpierw zeskanuj QR parowania z ekranu odtwarzacza.');
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
  async function exportPDF() {
    setBusy(true);
    try {
      const { buildPDF } = await import('./pdf');
      const songs = selected.size ? deck.songs.filter((s) => selected.has(s.id)) : deck.songs;
      songs.forEach(validateSong);
      const doc = await buildPDF(deck, songs, location.origin + location.pathname);
      doc.save(`${deck.name.replace(/[^\p{L}\p{N} -]/gu, '') || 'hiciarz'}.pdf`);
      notify('PDF gotowy. Drukuj w skali 100%, bez dopasowania do strony.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function changeMode(next: Mode) {
    setMode(next);
    if (next === 'editor' && deck) setUiTheme(deck.theme);
  }
  const filtered =
    deck?.songs.filter((s) =>
      (s.title + ' ' + s.artist + ' ' + s.year)
        .toLocaleLowerCase('pl')
        .includes(filter.toLocaleLowerCase('pl')),
    ) || [];
  const previewSong = deck?.songs[Math.min(previewIndex, Math.max(0, deck.songs.length - 1))];
  if (!loaded || !deck)
    return (
      <div className="boot">
        <LoaderCircle className="spin" /> Przygotowuję Twoje studio…
      </div>
    );
  return (
    <div className={'app-shell' + (focusedScanner ? ' focused-scanner' : '')}>
      <aside className="sidebar">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Hiciarz — strona główna">
          <span className="brand-icon">
            <Music2 size={23} />
          </span>
          hiciarz<span className="brand-star">✳</span>
        </a>
        <div className="sidebar-group">
          <span className="eyebrow">TWOJA MUZYCZNA PRZESTRZEŃ</span>
          <nav aria-label="Tryby aplikacji">
            <button
              className={mode === 'editor' ? 'nav active' : 'nav'}
              onClick={() => changeMode('editor')}
            >
              <LayoutGrid size={19} /> Kreator kart <span className="nav-dot" />
            </button>
            <button
              className={mode === 'scanner' ? 'nav active' : 'nav'}
              onClick={() => changeMode('scanner')}
            >
              <ScanLine size={19} /> Skaner kart
            </button>
            <button
              className={mode === 'player' ? 'nav active' : 'nav'}
              onClick={() => changeMode('player')}
            >
              <Headphones size={19} /> Odtwarzacz {room.connected && <span className="live-dot" />}
            </button>
          </nav>
        </div>
        <div className="sidebar-group decks">
          <div className="label-row">
            <span className="eyebrow">TWOJE TALIE</span>
            <button
              className="icon small"
              aria-label="Utwórz nową talię"
              onClick={() => {
                const d = newDeck();
                setDecks([...decks, d]);
                setActiveId(d.id);
                setMode('editor');
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
                setUiTheme(d.theme);
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
              Dobry wieczór zaczyna
              <br />
              się od dobrej muzyki.
            </strong>
            <p>Stwórz coś, co Was połączy.</p>
          </div>
          <a href="https://buymeacoffee.com/szymonrybka" target="_blank" rel="noreferrer">
            <Coffee size={17} /> Postaw kawę <ArrowUpRight size={14} />
          </a>
          <a href="https://github.com/ArtifexEt/Hiciarz" target="_blank" rel="noreferrer">
            <FileJson size={17} /> Otwarty kod źródłowy <ArrowUpRight size={14} />
          </a>
          <button className="help-link" onClick={() => setModal('help')}>
            Jak to działa?
          </button>
          <span className="version">HICIARZ / STUDIO 01</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Twoje studio <ChevronRight size={13} />
            <strong>
              {mode === 'editor'
                ? 'Kreator kart'
                : mode === 'scanner'
                  ? 'Skaner kart'
                  : 'Odtwarzacz'}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="save-status">
              <span className={storageError ? 'warn-dot' : 'live-dot'} />
              {storageError ? 'Zapis niedostępny' : 'Zapis lokalny'}
            </span>
            <label className="theme-select">
              <Palette size={16} />
              <select
                aria-label="Motyw aplikacji"
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
              aria-label="O aplikacji"
              title="O aplikacji"
              onClick={() => setModal('about')}
            >
              <Info size={20} />
            </button>
            <button
              className="icon mobile-menu-toggle"
              aria-label="Menu aplikacji"
              aria-expanded={appMenuOpen}
              aria-controls="mobile-app-menu"
              onClick={() => setAppMenuOpen(!appMenuOpen)}
            >
              <Menu size={21} />
            </button>
          </div>
          {appMenuOpen && (
            <nav
              id="mobile-app-menu"
              className="mobile-app-menu"
              aria-label="Menu aplikacji"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAppMenuOpen(false);
              }}
            >
              <div className="label-row">
                <strong>Hiciarz</strong>
                <button
                  className="icon"
                  aria-label="Zamknij menu"
                  onClick={() => setAppMenuOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <button
                onClick={() => {
                  setFullMobileApp(false);
                  setMode('scanner');
                  setAppMenuOpen(false);
                }}
              >
                <ScanLine size={18} /> Tryb skanera
              </button>
              <button
                onClick={() => {
                  setFullMobileApp(true);
                  changeMode('editor');
                  setAppMenuOpen(false);
                }}
              >
                <LayoutGrid size={18} /> Pełna aplikacja i kreator
              </button>
              <button
                onClick={() => {
                  setFullMobileApp(true);
                  changeMode('player');
                  setAppMenuOpen(false);
                }}
              >
                <Headphones size={18} /> Odtwarzacz
              </button>
              <label>
                Wygląd
                <select
                  aria-label="Motyw w menu"
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
                <Info size={18} /> O aplikacji
              </button>
            </nav>
          )}
        </header>
        {updateAvailable && (
          <div className="update-banner" role="status">
            <span>
              <strong>Nowa wersja Hiciarza jest gotowa.</strong> Zapiszemy Twoje talie i odświeżymy
              aplikację.
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
                  notify(
                    'Nie udało się zapisać talii przed aktualizacją. Pobierz projekt i spróbuj ponownie.',
                  );
                }
              }}
            >
              {updating ? 'Wczytuję…' : 'Wczytaj nową wersję'}
            </button>
          </div>
        )}
        {showCoffee && !focusedScanner && (
          <div className="coffee-support">
            <a
              href="https://buymeacoffee.com/szymonrybka"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Coffee size={20} aria-hidden="true" />
              <span>
                Podoba Ci się Hiciarz? <strong>Postaw mi kawę</strong>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <button
              className="icon"
              aria-label="Ukryj baner kawy"
              title="Ukryj baner kawy"
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
          {focusedScanner && (
            <div className="scanner-app-actions">
              <span>Gotowy na kolejny hit?</span>
              <button
                className="text-button"
                onClick={() => {
                  setFullMobileApp(true);
                  changeMode('editor');
                }}
              >
                <LayoutGrid size={16} /> Pełna aplikacja
              </button>
            </div>
          )}
          {mode === 'editor' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="tiny-line" /> ZRÓB Z MUZYKI DOBRY WIECZÓR
                  </div>
                  <h1>
                    Twoje hity.
                    <br className="mobile-break" /> Wasza gra
                    <span className="heading-star">✳</span>
                  </h1>
                  <p>Wybierz piosenki, nadaj im charakter i wydrukuj swoją talię.</p>
                </div>
                <div className="heading-actions">
                  {spotifyConfigured() && (
                    <button
                      className="primary"
                      onClick={() => {
                        setOutput('spotify');
                        changeMode('scanner');
                      }}
                    >
                      <Play size={18} /> Graj przez Spotify
                    </button>
                  )}
                  <button
                    className={spotifyConfigured() ? 'secondary' : 'primary'}
                    disabled={!deck.songs.length || busy}
                    onClick={exportPDF}
                  >
                    {busy ? <LoaderCircle size={18} className="spin" /> : <Download size={18} />}{' '}
                    Pobierz PDF <span className="button-key">↗</span>
                  </button>
                </div>
              </section>
              {showDemoOffer && (
                <section className="demo-offer" aria-labelledby="demo-offer-title">
                  <div>
                    <span className="eyebrow">NA DOBRY POCZĄTEK</span>
                    <h2 id="demo-offer-title">Świąteczna talia na pierwszy wieczór?</h2>
                    <p>
                      Gotowa lista 151 piosenek i motyw „Rybki świąteczne”. Wczytaj przykład bez
                      logowania i dopasuj go do Waszego wieczoru.
                    </p>
                    <a href={christmasPlaylist} target="_blank" rel="noopener noreferrer">
                      Zobacz playlistę w Spotify <ArrowUpRight size={14} />
                    </a>
                  </div>
                  <div className="demo-offer-actions">
                    <button
                      className="primary"
                      onClick={() => {
                        chooseExample('christmas-hits');
                      }}
                    >
                      <Sparkles size={18} /> Utwórz świąteczną talię
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        localStorage.setItem('hiciarz-demo-offer-v1', 'dismissed');
                        setShowDemoOffer(false);
                      }}
                    >
                      Zacznę od własnych utworów
                    </button>
                  </div>
                </section>
              )}
              <GameGuide
                onStart={(route) => {
                  setOutput(route === 'spotify' ? 'spotify' : 'browser');
                  changeMode(route === 'spotify' ? 'scanner' : 'player');
                }}
              />
              {storageError && (
                <div className="notice error" role="alert">
                  {storageError}
                </div>
              )}
              <section className="deck-toolbar">
                <label className="mobile-deck-picker">
                  Twoje talie
                  <select
                    aria-label="Wybierz talię"
                    value={activeId}
                    onChange={(e) => {
                      setActiveId(e.target.value);
                      const chosen = decks.find((d) => d.id === e.target.value);
                      if (chosen) setUiTheme(chosen.theme);
                    }}
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.songs.length} utworów
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
                      Nazwa talii
                    </label>
                    <input
                      id="deck-name"
                      value={deck.name}
                      maxLength={100}
                      onChange={(e) => updateDeck({ name: e.target.value })}
                    />
                    <div className="deck-meta">
                      <span>{deck.songs.length} utworów</span>
                      <i /> <span>{themeNames[deck.theme]}</span>
                      <i />
                      <span>A4 · 60 × 60 mm</span>
                    </div>
                  </div>
                </div>
                <div className="toolbar-buttons">
                  <button
                    className="secondary"
                    aria-label="Nowa talia"
                    onClick={() => {
                      const d = newDeck();
                      setDecks([...decks, d]);
                      setActiveId(d.id);
                      setMode('editor');
                    }}
                  >
                    <Plus size={17} /> Nowa talia
                  </button>
                  <button className="secondary" onClick={() => fileRef.current?.click()}>
                    <FolderOpen size={17} /> Wczytaj
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(JSON.stringify(deck, null, 2), `${deck.name || 'talia'}.json`)
                    }
                  >
                    <Download size={17} /> Zapisz projekt
                  </button>
                  <button
                    className="secondary delete-deck-button"
                    aria-label="Usuń talię"
                    onClick={() => setModal('delete')}
                  >
                    <Trash2 size={17} /> Usuń talię
                  </button>
                </div>
              </section>
              <div className="studio-grid">
                <section className="editor-panel">
                  <div className="tabs" role="tablist" aria-label="Ustawienia talii">
                    {(
                      [
                        ['songs', 'Utwory', Music2],
                        ['design', 'Wygląd kart', Palette],
                        ['print', 'Ustawienia druku', Printer],
                      ] as const
                    ).map(([id, label, Icon]) => (
                      <button
                        role="tab"
                        aria-selected={tab === id}
                        key={id}
                        className={tab === id ? 'tab active' : 'tab'}
                        onClick={() => setTab(id)}
                      >
                        <Icon size={16} />
                        {label}
                        {id === 'songs' && <span>{deck.songs.length}</span>}
                      </button>
                    ))}
                  </div>
                  {tab === 'songs' ? (
                    <>
                      <div className="panel-heading">
                        <div>
                          <h2>Muzyka, którą znacie.</h2>
                          <p>Każdy utwór to kolejna historia do odgadnięcia.</p>
                        </div>
                        <button
                          className="secondary compact"
                          onClick={() => {
                            setEditSong(undefined);
                            setModal('song');
                          }}
                        >
                          <Plus size={17} /> Dodaj utwór
                        </button>
                      </div>
                      <div className="import-banner">
                        <span className="spotify-mark">≋</span>
                        <div>
                          <strong>Twoja playlista. Wasza talia.</strong>
                          <p>Wczytaj własną lub współtworzoną playlistę ze Spotify.</p>
                        </div>
                        <button onClick={() => setModal('spotify')}>
                          Importuj playlistę <ArrowUpRight size={17} />
                        </button>
                      </div>
                      <button className="example-entry" onClick={() => setModal('examples')}>
                        <Sparkles size={20} aria-hidden="true" />
                        <span>
                          <strong>Przykładowe playlisty</strong>
                          <small>Gotowa talia świąteczna — bez logowania</small>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                      <div className="table-tools">
                        <label className="search">
                          <Search size={17} />
                          <input
                            aria-label="Szukaj utworu"
                            placeholder="Szukaj tytułu, wykonawcy lub roku…"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          />
                        </label>
                        <button
                          className="icon"
                          aria-label="Sprawdź dostępność źródeł"
                          title="Sprawdź źródła"
                          disabled={!deck.songs.length || checking}
                          onClick={verifySources}
                        >
                          <ShieldCheck size={17} />
                        </button>
                        <button
                          className="icon"
                          aria-label="Wymieszaj kolejność utworów"
                          title="Wymieszaj kolejność"
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
                          <span>Wybrano: {selected.size}</span>
                          <button onClick={exportPDF}>PDF wybranych</button>
                          <button
                            onClick={() => {
                              updateDeck({ songs: deck.songs.filter((s) => !selected.has(s.id)) });
                              setSelected(new Set());
                            }}
                          >
                            Usuń wybrane
                          </button>
                          <button onClick={() => setSelected(new Set())}>Anuluj wybór</button>
                        </div>
                      )}
                      <div className="song-table">
                        <div className="table-head">
                          <input
                            type="checkbox"
                            aria-label="Zaznacz widoczne utwory"
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
                          <span>UTWÓR / WYKONAWCA</span>
                          <span>ROK</span>
                          <span>ŹRÓDŁA</span>
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
                                aria-label={'Zaznacz ' + s.title}
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
                                <strong>{s.title}</strong>
                                <small>{s.artist}</small>
                              </button>
                              <span
                                className={'year-pill ' + (s.review ? 'review' : '')}
                                title={s.review ? 'Rok pobrany z albumu — sprawdź' : ''}
                              >
                                {s.year}
                                {s.review && <span>•</span>}
                              </span>
                              <span className="source-icons">
                                {s.sources.spotify && (
                                  <span title="Spotify" className="source-spotify">
                                    ≋
                                  </span>
                                )}
                                {s.sources.youtube && (
                                  <span title="YouTube" className="source-youtube">
                                    <Play size={10} fill="currentColor" />
                                  </span>
                                )}
                              </span>
                              <div className="row-actions">
                                <button
                                  className="icon tiny"
                                  aria-label={'Przesuń w górę: ' + s.title}
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
                                  aria-label={'Przesuń w dół: ' + s.title}
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
                                  aria-label={'Usuń: ' + s.title}
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
                              {filter ? 'Nie znaleziono utworów' : 'Pierwszy hit należy do Ciebie'}
                            </h3>
                            <p>
                              {filter
                                ? 'Spróbuj zmienić wyszukiwanie.'
                                : 'Dodaj piosenkę, wczytaj plik lub zaimportuj playlistę.'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="table-footer">
                        <span>
                          {filtered.length} z {deck.songs.length} utworów
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
                          Eksportuj CSV <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <div className="file-drop">
                        <FileJson size={22} />
                        <div>
                          <strong>Masz gotową listę utworów?</strong>
                          <span>Wczytaj JSON lub CSV i dopracuj swoją talię.</span>
                        </div>
                        <button className="text-button" onClick={() => fileRef.current?.click()}>
                          Wybierz plik <ArrowUpRight size={15} />
                        </button>
                      </div>
                      <button
                        className="text-button prompt-copy"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(playlistPrompt);
                            notify('Prompt skopiowany. Wklej go do wybranego asystenta.');
                          } catch {
                            setModal('prompt');
                          }
                        }}
                      >
                        <Copy size={16} /> Skopiuj prompt do swojego AI
                      </button>
                    </>
                  ) : tab === 'design' ? (
                    <div className="design-content">
                      <div className="panel-heading">
                        <div>
                          <h2>Nadaj talii charakter.</h2>
                          <p>Motyw karty zmieni również wygląd skanera i odtwarzacza.</p>
                        </div>
                      </div>
                      <ThemePicker
                        value={deck.theme}
                        onChange={(theme) => {
                          updateDeck({ theme, back: undefined });
                          setUiTheme(theme);
                        }}
                      />
                      <label className="front-color-choice">
                        Kolory strony z odpowiedzią
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
                          <option value="varied">Różne odcienie dla poszczególnych kart</option>
                          <option value="theme">Jednolity kolor motywu</option>
                        </select>
                        <small>
                          Odcień karty pozostaje taki sam po zmianie kolejności. Preset laserowy
                          zachowuje białe tło i kolorowe kontury.
                        </small>
                      </label>
                      <div
                        className="fish-callout"
                        style={{
                          backgroundImage: `linear-gradient(90deg,rgba(4,36,36,.96),rgba(4,36,36,.2)),url("${themeArt('fish')}")`,
                        }}
                      >
                        <Sparkles size={25} />
                        <h3>Święta z charakterem.</h3>
                        <p>
                          Rybki-bombki, gałązki i odrobina magii.
                          <br />
                          Autorska kolekcja „Rybki świąteczne”.
                        </p>
                        <button
                          className="secondary"
                          onClick={() => {
                            updateDeck({ theme: 'fish', back: undefined });
                            setUiTheme('fish');
                          }}
                        >
                          Wybierz rybki <ArrowUpRight size={16} />
                        </button>
                      </div>
                      <div className="upload-panel">
                        <Upload size={23} />
                        <div>
                          <strong>A może coś własnego?</strong>
                          <p>PNG, JPG lub WebP · środkowy kwadrat zdjęcia · do 12 MB</p>
                        </div>
                        <label className="secondary file-label">
                          Wgraj tło
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              try {
                                updateDeck({ back: await imageData(f) });
                                setShowBack(true);
                              } catch (err) {
                                notify((err as Error).message);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {deck.back && (
                        <div className="notice">
                          <span>
                            Własne tło jest aktywne. Aplikacja użyje motywu „
                            {themeNames[deck.theme]}”.
                          </span>
                          <button
                            className="text-button"
                            onClick={() => updateDeck({ back: undefined })}
                          >
                            Usuń tło
                          </button>
                        </div>
                      )}
                      <p className="hint">
                        Inny motyw pojedynczej karty ustawisz podczas edycji utworu. Wybrany preset
                        zastępuje własne tło.
                      </p>
                    </div>
                  ) : (
                    <div className="print-content">
                      <div className="print-presets" role="group" aria-label="Preset wydruku">
                        <button
                          className={
                            deck.print.style === 'laser' ? 'print-preset chosen' : 'print-preset'
                          }
                          onClick={() => updateDeck({ print: { ...deck.print, style: 'laser' } })}
                        >
                          <Printer size={22} />
                          <strong>Laser — lekki kolor</strong>
                          <span>Białe tło, dwa kolory konturów, minimum wypełnień.</span>
                        </button>
                        <button
                          className={
                            deck.print.style !== 'laser' ? 'print-preset chosen' : 'print-preset'
                          }
                          onClick={() => updateDeck({ print: { ...deck.print, style: 'theme' } })}
                        >
                          <Palette size={22} />
                          <strong>Pełna grafika motywu</strong>
                          <span>Ilustracje, kolory i własne tło w pełnej wersji.</span>
                        </button>
                      </div>
                      {deck.print.style === 'laser' && (
                        <p className="hint">
                          Lekki wydruk nie zmienia motywu zapisanego w QR. Świąteczna karta nadal
                          włączy świąteczny wygląd aplikacji.
                        </p>
                      )}
                      <div className="panel-heading">
                        <div>
                          <h2>Gotowe do wycięcia.</h2>
                          <p>A4 · 12 kart na arkusz · 60 × 60 mm</p>
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
                          Najpierw odpowiedzi,
                          <br />
                          potem pasujące kody QR.
                          <br />
                          <strong>Druk dwustronny, skala 100%.</strong>
                        </p>
                      </div>
                      <label>
                        Obrót kartki
                        <select
                          value={deck.print.edge}
                          onChange={(e) =>
                            updateDeck({
                              print: { ...deck.print, edge: e.target.value as 'long' | 'short' },
                            })
                          }
                        >
                          <option value="long">Po długiej krawędzi</option>
                          <option value="short">Po krótkiej krawędzi</option>
                        </select>
                      </label>
                      <div className="form-grid">
                        <label>
                          Przesunięcie QR w poziomie (mm)
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
                          Przesunięcie QR w pionie (mm)
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
                        Pokaż znaczniki cięcia
                      </label>
                      <div className="notice">
                        <Printer size={22} />
                        <div>
                          <strong>Zacznij od jednej kartki.</strong>
                          <p>
                            Wydrukuj kalibrację dwustronnie. Sprawdź numery pod światło i skoryguj
                            przesunięcie, jeśli obie strony nie pokrywają się.
                          </p>
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
                        <Printer size={17} /> Pobierz stronę kalibracyjną
                      </button>
                    </div>
                  )}
                </section>
                <aside className="preview-panel">
                  <div className="preview-heading">
                    <span className="eyebrow">TAK BĘDZIE WYGLĄDAĆ</span>
                    <span className="live-tag">
                      <span /> PODGLĄD NA ŻYWO
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
                          Dodaj pierwszy utwór,
                          <br />
                          aby zobaczyć swoją kartę.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="side-switch">
                    <button
                      className={!showBack ? 'active' : ''}
                      onClick={() => setShowBack(false)}
                    >
                      Odpowiedź
                    </button>
                    <button className={showBack ? 'active' : ''} onClick={() => setShowBack(true)}>
                      Kod QR
                    </button>
                  </div>
                  <div className="preview-pagination">
                    <button
                      className="icon"
                      aria-label="Poprzednia karta"
                      disabled={!deck.songs.length}
                      onClick={() =>
                        setPreviewIndex((i) => (i - 1 + deck.songs.length) % deck.songs.length)
                      }
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>
                      Karta{' '}
                      <strong>
                        {deck.songs.length ? Math.min(previewIndex + 1, deck.songs.length) : 0}
                      </strong>{' '}
                      / {deck.songs.length}
                    </span>
                    <button
                      className="icon"
                      aria-label="Następna karta"
                      disabled={!deck.songs.length}
                      onClick={() => setPreviewIndex((i) => (i + 1) % deck.songs.length)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="preview-spec">
                    <span>
                      FORMAT KARTY<strong>60 × 60 mm</strong>
                    </span>
                    <span>
                      UKŁAD WYDRUKU<strong>12 kart / A4</strong>
                    </span>
                  </div>
                  <div className="preview-tip">
                    <span>✳</span>
                    <p>
                      <strong>Mała karta. Wielkie wspomnienia.</strong>
                      <br />
                      Rok, wykonawca i tytuł po jednej stronie. Muzyczna niespodzianka po drugiej.
                    </p>
                  </div>
                  <button
                    className="text-button full preview-theme"
                    onClick={() => setTab('design')}
                  >
                    <Palette size={16} /> Odkryj wszystkie motywy <ArrowUpRight size={16} />
                  </button>
                </aside>
              </div>
              <div className="bottom-note">
                <ShieldCheck size={15} />
                <span>
                  Twoje talie zostają w Twojej przeglądarce. Zapisz plik projektu, żeby zabrać je ze
                  sobą.
                </span>
              </div>
            </>
          ) : mode === 'scanner' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">JEDEN SKAN. KOLEJNY HIT.</div>
                  <h1>
                    Skanuj. Słuchaj<span className="heading-star">✳</span>
                  </h1>
                  <p>Wybierz urządzenie Spotify albo połącz skaner ze zdalnym odtwarzaczem.</p>
                </div>
              </section>
              <div className="play-layout">
                <section className="surface scan-surface">
                  <div className="output-switch" role="group" aria-label="Sposób odtwarzania">
                    <button
                      className={output === 'browser' ? 'active' : ''}
                      onClick={() => setOutput('browser')}
                    >
                      Zdalny odtwarzacz
                    </button>
                    <button
                      className={output === 'spotify' ? 'active' : ''}
                      onClick={() => setOutput('spotify')}
                    >
                      Spotify Connect
                    </button>
                  </div>
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
                          ? 'Konto Spotify połączone'
                          : 'Połącz konto Spotify'
                        : room.status}
                    </strong>
                    {output === 'browser' && room.connected && (
                      <button className="text-button" onClick={room.disconnect}>
                        Rozłącz
                      </button>
                    )}
                  </div>
                  {output === 'spotify' && <SpotifyRemotePanel remote={spotifyRemote} />}
                  <Suspense fallback={<p className="hint">Przygotowuję skaner…</p>}>
                    <Camera
                      onScan={handleScan}
                      pairingRequired={output === 'browser'}
                      ready={output === 'browser' || spotifyRemote.ready}
                    />
                  </Suspense>
                  <div className="scanner-controls">
                    <button
                      className="secondary"
                      disabled={output === 'spotify' ? !spotifyRemote.ready : !room.connected}
                      onClick={() =>
                        output === 'spotify'
                          ? playerCommand('pause')
                          : room.send(undefined, 'pause')
                      }
                    >
                      <Pause size={19} /> Pauza
                    </button>
                    <button
                      className="primary"
                      disabled={output === 'spotify' ? !spotifyRemote.ready : !room.connected}
                      onClick={() =>
                        output === 'spotify'
                          ? playerCommand('resume')
                          : room.send(undefined, 'resume')
                      }
                    >
                      <Play size={19} /> Wznów
                    </button>
                    <button
                      className="secondary"
                      disabled={output === 'spotify' ? !spotifyRemote.ready : !room.connected}
                      onClick={() =>
                        output === 'spotify' ? playerCommand('stop') : room.send(undefined, 'stop')
                      }
                    >
                      <Square size={17} /> Zatrzymaj
                    </button>
                  </div>
                  <p className="ack" aria-live="polite">
                    {output === 'spotify'
                      ? playState
                      : room.ack || 'Sterowanie będzie dostępne po sparowaniu urządzeń.'}
                  </p>
                </section>
                <aside className="surface instructions">
                  {output === 'spotify' ? (
                    <>
                      <span className="mini-icon">
                        <Music2 size={23} />
                      </span>
                      <h2>Twoje urządzenie. Twoje hity.</h2>
                      <p>
                        Po połączeniu konta i wybraniu urządzenia włącz aparat. Skanuj karty
                        pojedynczo — muzyka zagra tam, gdzie wybierzesz.
                      </p>
                      <p className="hint">
                        Przy odtwarzaniu przez Spotify nie potrzebujesz drugiego urządzenia ani kodu
                        parowania. Karty muszą zawierać utwory ze Spotify.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="mini-icon">
                        <Link2 />
                      </span>
                      <h2>
                        Jedno połączenie.
                        <br />
                        Cały wieczór muzyki.
                      </h2>
                      <ol>
                        <li>
                          <strong>Otwórz odtwarzacz</strong>
                          <p>Na tej samej stronie wybierz „Odtwarzacz”.</p>
                        </li>
                        <li>
                          <strong>Zeskanuj QR parowania</strong>
                          <p>
                            W odtwarzaczu wybierz „Połącz skaner”, a następnie zeskanuj wyświetlony
                            kod.
                          </p>
                        </li>
                        <li>
                          <strong>Skanuj muzyczne karty</strong>
                          <p>
                            Skaner wysyła polecenia, a połączony odtwarzacz uruchamia muzykę. Tytuł
                            pozostaje ukryty na ekranie skanera.
                          </p>
                        </li>
                      </ol>
                      <div className="hint-box">
                        <Wifi size={18} />
                        <span>
                          Oba urządzenia potrzebują internetu. Pozostaw skaner i odtwarzacz otwarte
                          podczas gry.
                        </span>
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
                  <div className="eyebrow">DOBRE BRZMIENIE ZACZYNA SIĘ TUTAJ</div>
                  <h1>
                    Niech gra<span className="heading-star">✳</span>
                  </h1>
                  <p>
                    {output === 'spotify'
                      ? 'Zaloguj się i wybierz urządzenie Spotify Connect.'
                      : 'Połącz skaner i odtwarzaj muzykę na tym urządzeniu.'}
                  </p>
                </div>
                <button className="primary" onClick={room.host}>
                  <Smartphone size={18} /> {room.pairUrl ? 'Nowy kod parowania' : 'Połącz skaner'}
                </button>
              </section>
              <div className="play-layout">
                <section className="surface player-surface">
                  <div className="output-switch" role="group" aria-label="Miejsce odtwarzania">
                    <button
                      className={output === 'browser' ? 'active' : ''}
                      onClick={() => setOutput('browser')}
                    >
                      Na tym urządzeniu
                    </button>
                    <button
                      className={output === 'spotify' ? 'active' : ''}
                      onClick={() => setOutput('spotify')}
                    >
                      Spotify Connect
                    </button>
                  </div>
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
                            ? 'Spotify gotowe do gry'
                            : spotifyRemote.linked
                              ? 'Wybierz urządzenie Spotify'
                              : 'Połącz konto Spotify'
                          : room.status}
                      </strong>
                    </div>
                    {output === 'browser' && (
                      <label className="source-picker">
                        Preferowane źródło
                        <select
                          value={preferred}
                          onChange={(e) => {
                            setPreferred(e.target.value as 'spotify' | 'youtube');
                            if (card?.sources[e.target.value as 'spotify' | 'youtube'])
                              setSource(e.target.value as 'spotify' | 'youtube');
                          }}
                        >
                          <option value="spotify">Spotify</option>
                          <option value="youtube">YouTube</option>
                        </select>
                      </label>
                    )}
                  </div>
                  {output === 'spotify' ? (
                    <SpotifyRemotePanel remote={spotifyRemote} />
                  ) : (
                    <Players card={card} source={source} command={command} onState={setPlayState} />
                  )}
                  <div className="play-state" role="status">
                    <Radio size={17} />
                    {playState}
                  </div>
                  {card && (
                    <>
                      {output === 'browser' && (
                        <div className="source-buttons">
                          {(['spotify', 'youtube'] as const).map((s) => (
                            <button
                              disabled={!card.sources[s]}
                              className={source === s ? 'secondary active-source' : 'secondary'}
                              key={s}
                              onClick={() => setSource(s)}
                            >
                              {s === 'spotify' ? 'Spotify' : 'YouTube'}
                              {source === s && <Check size={15} />}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="scanner-controls">
                        <button className="secondary" onClick={() => playerCommand('pause')}>
                          <Pause size={18} /> Pauza
                        </button>
                        <button className="primary" onClick={() => playerCommand('resume')}>
                          <Play size={18} /> Odtwórz
                        </button>
                        <button className="secondary" onClick={() => playerCommand('stop')}>
                          <Square size={17} /> Zatrzymaj
                        </button>
                      </div>
                      <button
                        className="quiet"
                        onClick={() => {
                          setCard({ ...card });
                          setPlayState('Ponawiam próbę…');
                        }}
                      >
                        Ponów próbę odtwarzania
                      </button>
                      <p className="hint">
                        Jeśli materiał jest niedostępny, wybierz inne źródło lub popraw kartę w
                        kreatorze i wydrukuj ją ponownie.
                      </p>
                    </>
                  )}
                </section>
                <aside className="surface pairing-panel">
                  <span className="mini-icon">
                    <ScanLine />
                  </span>
                  <h2>{room.connected ? 'Skaner połączony.' : 'Połącz skaner.\nZacznij grać.'}</h2>
                  {room.pairUrl ? (
                    <>
                      <div className="pair-qr">
                        <QR value={room.pairUrl} />
                      </div>
                      <p>
                        Otwórz Skaner kart na drugim urządzeniu i zeskanuj kod, aby dołączyć do tej
                        sesji.
                      </p>
                      <button className="secondary full" onClick={room.disconnect}>
                        Zakończ sesję
                      </button>
                    </>
                  ) : (
                    <>
                      <p>
                        Kliknij „Połącz skaner”, aby wyświetlić kod QR. Nie potrzebujesz konta
                        Hiciarza.
                      </p>
                      <button className="secondary full" onClick={room.host}>
                        Przygotuj QR parowania
                      </button>
                    </>
                  )}
                  <details className="audio-help">
                    <summary>Jak wybrać głośnik?</summary>
                    <p>
                      W trybie Spotify wybierz urządzenie z listy. W trybie „Na tym urządzeniu”
                      dźwiękiem zarządza przeglądarka i ustawienia tego urządzenia. Dostępne sposoby
                      połączenia z głośnikiem zależą od używanego sprzętu.
                    </p>
                  </details>
                </aside>
              </div>
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>Stworzone dla muzyki. I dobrego towarzystwa.</span>
          <button className="text-button" onClick={() => setModal('about')}>
            O aplikacji
          </button>
          <button
            className="text-button version-check"
            onClick={async () => {
              try {
                await checkForUpdates();
                notify(
                  updateIsReady()
                    ? 'Nowa wersja jest gotowa. Wybierz „Wczytaj nową wersję”.'
                    : 'Sprawdzanie aktualizacji uruchomione. Powiadomimy Cię, gdy nowa wersja będzie gotowa.',
                );
              } catch {
                notify('Nie udało się sprawdzić aktualizacji. Sprawdź połączenie z internetem.');
              }
            }}
          >
            Wersja {appVersion} · Sprawdź aktualizacje
          </button>
          <span>
            Hiciarz <span>✳</span> open source
          </span>
        </footer>
      </div>
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept=".json,.csv,application/json,text/csv"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            if (f.size > 8 * 1024 * 1024) throw new Error('Plik jest za duży. Limit wynosi 8 MB.');
            setPending({ data: parseImport(await f.text(), f.name), name: f.name });
            setImportMode('append');
            setModal('file');
          } catch (err) {
            notify((err as Error).message);
          }
          e.target.value = '';
        }}
      />
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button className="icon" aria-label="Zamknij komunikat" onClick={() => setMessage('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {modal === 'song' && (
        <SongForm
          song={editSong}
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
          onClose={() => setModal(null)}
          onImport={importSongs}
          onExamples={() => setModal('examples')}
        />
      )}
      {modal === 'examples' && (
        <Modal title="Przykładowe playlisty" onClose={() => setModal(null)}>
          <PlaylistExamples onChoose={chooseExample} />
        </Modal>
      )}
      {modal === 'file' && pending && (
        <Modal title="Wczytaj plik" onClose={() => setModal(null)}>
          <p className="muted">
            {pending.name} ·{' '}
            {Array.isArray(pending.data) ? pending.data.length : pending.data.songs.length} utworów
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
                  <strong>Otwórz pełny projekt jako nową talię</strong>
                  <small>Wczytaj utwory, tło, motyw i ustawienia druku.</small>
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
                  <strong>Zastąp obecną listę utworów</strong>
                  <small>Obecne utwory zostaną zastąpione.</small>
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
                <strong>Dodaj utwory na końcu obecnej talii</strong>
                <small>Zachowaj poprawki i pomiń duplikaty.</small>
              </span>
            </label>
          </div>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              Anuluj
            </button>
            <button
              className="primary"
              onClick={() => {
                if (!Array.isArray(pending.data) && importMode === 'replace') {
                  const d = { ...pending.data, id: crypto.randomUUID() };
                  setDecks([...decks, d]);
                  setActiveId(d.id);
                  setUiTheme(d.theme);
                  notify('Otworzono pełny projekt.');
                } else
                  importSongs(
                    Array.isArray(pending.data) ? pending.data : pending.data.songs,
                    importMode,
                  );
                setPending(undefined);
                setModal(null);
              }}
            >
              Wczytaj
            </button>
          </div>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="Usunąć tę talię?" onClose={() => setModal(null)}>
          <p>
            Usuniesz „{deck.name}” z tej przeglądarki. Wcześniej możesz zapisać projekt do pliku.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              Zachowaj talię
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
              Usuń talię
            </button>
          </div>
        </Modal>
      )}
      {modal === 'check' && (
        <Modal title="Sprawdzenie źródeł" onClose={() => setModal(null)} wide>
          <p className="hint">
            Sprawdzamy metadane linków. Dostępne metadane nie gwarantują odtwarzania w Twoim
            regionie. Błąd sieci lub blokada przeglądarki oznacza brak potwierdzenia, a nie
            usunięcie utworu.
          </p>
          {checking ? (
            <div className="check-progress">
              <LoaderCircle className="spin" size={22} />
              <span>Sprawdzam źródła… {checkProgress}</span>
            </div>
          ) : (
            <div className="check-results">
              {checks.map((c) => (
                <div key={c.songId + c.source}>
                  <span>
                    <strong>{deck.songs.find((s) => s.id === c.songId)?.title || c.songId}</strong>
                    <small>{c.source === 'spotify' ? 'Spotify' : 'YouTube'}</small>
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
              Zamknij
            </button>
          </div>
        </Modal>
      )}
      {modal === 'prompt' && (
        <Modal title="Prompt do przygotowania listy" onClose={() => setModal(null)} wide>
          <p>
            Schowek jest niedostępny. Zaznacz i skopiuj tekst, a następnie wklej go do wybranego
            asystenta.
          </p>
          <label>
            Treść promptu
            <textarea
              rows={16}
              readOnly
              value={playlistPrompt}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
        </Modal>
      )}
      {modal === 'about' && (
        <Modal title="Hiciarz — muzyka nas łączy" onClose={() => setModal(null)}>
          <p>
            Twoje piosenki, Twoje karty, Wasz dobry wieczór. Twórz talie, drukuj karty i odkrywaj
            muzykę ze znajomymi.
          </p>
          <div className="about-links">
            <a
              className="primary"
              href="https://buymeacoffee.com/szymonrybka"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Coffee size={18} /> Postaw mi kawę <ArrowUpRight size={16} />
            </a>
            <a
              className="secondary"
              href="https://github.com/ArtifexEt/Hiciarz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileJson size={18} /> Repozytorium projektu <ArrowUpRight size={16} />
            </a>
            <button className="secondary" onClick={() => setModal('help')}>
              Jak grać i przygotować talię?
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
            />{' '}
            Pokazuj baner „Postaw mi kawę”
          </label>
          <p className="hint">
            Twoje talie są zapisane w tej przeglądarce. Pobierz plik projektu, aby mieć kopię lub
            przenieść go na inne urządzenie.
          </p>
          <small>Wersja {appVersion}</small>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title="Od playlisty do dobrego wieczoru" onClose={() => setModal(null)} wide>
          <div className="help-grid">
            <div>
              <span>01</span>
              <h3>Przygotuj talię</h3>
              <p>
                Dodaj utwory ręcznie, z pliku lub przez import Spotify. Sprawdź lata wydania,
                wybierz motyw i pobierz PDF.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Wydrukuj i wytnij</h3>
              <p>
                A4, druk dwustronny, skala 100%. Najpierw wydrukuj kalibrację i wybierz właściwą
                krawędź obrotu.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Połącz i skanuj</h3>
              <p>
                Połącz konto Spotify i wybierz urządzenie albo sparuj skaner ze zdalnym odtwarzaczem
                przez QR. Następnie skanuj muzyczne karty.
              </p>
            </div>
          </div>
          <div className="notice">
            <FileJson size={22} />
            <div>
              <strong>Wczytaj listę utworów z pliku</strong>
              <p>
                JSON: tablica obiektów z polami title, artist, year, sources.spotify i/lub
                sources.youtube. Motyw theme jest opcjonalny. CSV: title, artist, year, spotify,
                youtube, theme. Pliki przykładowe znajdziesz poniżej.
              </p>
              <div className="inline-actions">
                <button
                  className="text-button"
                  onClick={() =>
                    download(JSON.stringify(newDeck(), null, 2), 'hiciarz-szablon.json')
                  }
                >
                  Pobierz szablon JSON
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
                  Pobierz szablon CSV
                </button>
              </div>
            </div>
          </div>
          <p className="hint">
            Projekty i własne tła są zapisane w tej przeglądarce. Pobierz plik projektu, żeby mieć
            kopię. PDF nie zawiera muzyki ani danych logowania. Karty można skanować bez wczytywania
            talii do odtwarzacza.
          </p>
        </Modal>
      )}
    </div>
  );
}
