import { lazy, Suspense, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  QrCode,
  Settings2,
} from 'lucide-react';
import { qrImage } from './qr';
import { readQR } from './model';
import { authorizeSpotify } from './spotify';
import {
  acknowledgeSpotifySetup,
  customSpotifyClientId,
  defaultSpotifyClientId,
  saveSpotifyClientId,
  spotifyRedirectUri,
  spotifySetupUrl,
  validateSpotifyClientId,
  type SpotifyPurpose,
} from './spotify-settings';
import { vibrateOnScan } from './scan-feedback';
import './spotify-setup.css';

const Camera = lazy(() => import('./Camera'));
const dashboard = 'https://developer.spotify.com/dashboard';
const rules = 'https://developer.spotify.com/documentation/web-api/concepts/quota-modes';

export default function SpotifySetup({
  purpose,
  incomingClientId,
  onDone,
}: {
  purpose?: SpotifyPurpose;
  incomingClientId?: string;
  onDone: () => void;
}) {
  const defaultId = defaultSpotifyClientId();
  const [step, setStep] = useState(purpose && !incomingClientId ? 0 : 1);
  const [choice, setChoice] = useState<'default' | 'own'>(
    incomingClientId || customSpotifyClientId() || !defaultId ? 'own' : 'default',
  );
  const [clientId, setClientId] = useState(incomingClientId || customSpotifyClientId());
  const [error, setError] = useState('');
  const [idError, setIdError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(
    !incomingClientId && !customSpotifyClientId(),
  );
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(Boolean(incomingClientId));
  const [sharing, setSharing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [shareImage, setShareImage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const clientInput = useRef<HTMLInputElement>(null);
  const shareFigure = useRef<HTMLElement>(null);
  const redirectUri = spotifyRedirectUri();
  function go(next: number) {
    setError('');
    setIdError('');
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: 'nearest' });
    });
  }
  async function copyRedirect() {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
    } catch {
      setError('Zaznacz adres powrotu poniżej i skopiuj go do panelu Spotify.');
    }
  }
  function save() {
    try {
      if (choice === 'default' && !defaultId)
        throw new Error('Ta strona nie ma domyślnego Client ID. Wpisz własny identyfikator.');
      saveSpotifyClientId(choice === 'default' ? null : validateSpotifyClientId(clientId));
      acknowledgeSpotifySetup();
      setSharing(false);
      go(2);
    } catch (e) {
      setIdError((e as Error).message);
      clientInput.current?.focus();
    }
  }
  return (
    <div className="spotify-onboarding">
      <ol className="connection-progress" aria-label="Konfiguracja Spotify">
        {['Wybierz połączenie', 'Skonfiguruj', 'Zabierz na telefon'].map((label, i) => (
          <li
            key={label}
            aria-current={step === i ? 'step' : undefined}
            className={i < step ? 'complete' : ''}
          >
            <span>{i < step ? <Check size={13} aria-hidden="true" /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <h3 ref={heading} tabIndex={-1} className="connection-title">
        {step === 0
          ? 'Twoja muzyka. Twoje połączenie.'
          : step === 1
            ? 'Przygotuj swoje połączenie.'
            : 'Konfiguracja zapisana. Co dalej?'}
      </h3>
      {step === 0 && (
        <>
          <p className="connection-lead">
            Spotify pozwala importować Twoje playlisty i sterować muzyką na telefonie, komputerze
            lub głośniku. Wybierz, z którego połączenia chcesz skorzystać.
          </p>
          <div className="connection-options">
            {defaultId && (
              <label className={choice === 'default' ? 'chosen' : ''}>
                <input
                  type="radio"
                  name="spotify-client-choice"
                  checked={choice === 'default'}
                  onChange={() => setChoice('default')}
                />
                <span>
                  <strong>Domyślne połączenie Hiciarza</strong>
                  <small>Dla kont dopisanych przez osobę prowadzącą tę stronę.</small>
                </span>
              </label>
            )}
            <label className={choice === 'own' ? 'chosen' : ''}>
              <input
                type="radio"
                name="spotify-client-choice"
                checked={choice === 'own'}
                onChange={() => setChoice('own')}
              />
              <span>
                <strong>Moje własne połączenie</strong>
                <small>Masz Client ID albo chcesz przygotować osobistą integrację Spotify.</small>
              </span>
            </label>
          </div>
          <details className="connection-story">
            <summary>Dlaczego Spotify wymaga konfiguracji?</summary>
            <p>
              Od lutego 2026 nowe integracje w trybie deweloperskim mają limit do 5 dopisanych kont.
              Właściciel integracji musi mieć Premium. Dlatego samo zalogowanie się do domyślnego
              połączenia nie zawsze daje dostęp do playlist i urządzeń.
            </p>
            <p>
              Hiciarz ma publiczny kod i możesz postawić własną kopię. Osobiste połączenie Spotify
              rozpoznawane jest po Client ID. Własny identyfikator nadal podlega limitom Spotify;
              nie zmienia integracji w usługę dla nieograniczonej liczby osób.
            </p>
            <a href={rules} target="_blank" rel="noopener noreferrer">
              Zasady dostępu Spotify <ExternalLink size={13} />
            </a>
          </details>
          <div className="connection-actions">
            <button className="primary" onClick={() => go(1)}>
              Dalej <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <>
          {scanned && (
            <p className="connection-confirm" role="status">
              <Check size={17} /> Odczytano konfigurację z QR. Sprawdź Client ID i zapisz, aby go
              użyć.
            </p>
          )}
          {defaultId && (
            <div className="connection-source-switch" role="group" aria-label="Źródło Client ID">
              <button
                aria-pressed={choice === 'default'}
                onClick={() => {
                  setChoice('default');
                  setError('');
                }}
              >
                Domyślne połączenie
              </button>
              <button
                aria-pressed={choice === 'own'}
                onClick={() => {
                  setChoice('own');
                  setError('');
                }}
              >
                Własny Client ID
              </button>
            </div>
          )}
          {choice === 'default' ? (
            <>
              <p className="connection-lead">
                Użyjesz połączenia dołączonego do tej wersji Hiciarza. Twoje konto Spotify musi być
                dopisane do jego listy użytkowników.
              </p>
              <div className="connection-id-summary">
                <Settings2 size={20} />
                <div>
                  <strong>Client ID tej strony</strong>
                  <code>{defaultId}</code>
                </div>
              </div>
              <p className="hint">
                Jeśli Spotify odmawia dostępu, poproś osobę prowadzącą stronę o dodanie konta w
                Users Management albo wybierz własny Client ID.
              </p>
            </>
          ) : (
            <>
              <p className="connection-lead">
                Masz już Client ID? Wklej go poniżej. Jeśli zaczynasz od zera, przejdź przez te trzy
                kroki.
              </p>
              <label className="connection-client-input">
                Twój Client ID
                <input
                  ref={clientInput}
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setError('');
                    setIdError('');
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="32 znaki z panelu Spotify"
                  aria-invalid={Boolean(idError)}
                  aria-describedby="client-id-help client-id-error"
                />
              </label>
              {idError && (
                <p className="error" id="client-id-error" role="alert">
                  {idError}
                </p>
              )}
              <p className="hint" id="client-id-help">
                Client ID jest publicznym identyfikatorem aplikacji. Wklej Client ID, nie Client
                Secret. Logowanie Hiciarza używa PKCE i nie wymaga sekretu.
              </p>
              <button
                className="text-button connection-scan"
                onClick={() => setScanning(!scanning)}
              >
                <QrCode size={17} />
                {scanning ? 'Zamknij skaner konfiguracji' : 'Zeskanuj QR konfiguracji'}
              </button>
              {scanning && (
                <Suspense fallback={<p>Przygotowuję skaner…</p>}>
                  <Camera
                    purpose="setup"
                    pairingRequired={false}
                    onScan={(raw) => {
                      try {
                        const value = readQR(raw);
                        if (value.kind !== 'spotify-setup')
                          throw new Error(
                            'To kod karty lub parowania. Zeskanuj QR konfiguracji Spotify.',
                          );
                        setClientId(value.clientId);
                        setScanned(true);
                        setScanning(false);
                        setInstructionsOpen(false);
                        setIdError('');
                        setError('');
                        vibrateOnScan();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  />
                </Suspense>
              )}
              <details
                className="connection-instruction-guide"
                open={instructionsOpen}
                onToggle={(event) => setInstructionsOpen(event.currentTarget.open)}
              >
                <summary>Nie mam Client ID — pokaż instrukcję</summary>
                <ol className="connection-instructions">
                  <li>
                    <strong>Utwórz lub otwórz aplikację Spotify.</strong>
                    <p>
                      W{' '}
                      <a href={dashboard} target="_blank" rel="noopener noreferrer">
                        Spotify Developer Dashboard <ExternalLink size={12} />
                      </a>{' '}
                      wybierz Web API. Możesz użyć swojej istniejącej aplikacji. Jej właściciel
                      potrzebuje Premium.
                    </p>
                  </li>
                  <li>
                    <strong>Dodaj adres powrotu.</strong>
                    <p>
                      W ustawieniach aplikacji dodaj poniższy adres do Redirect URIs, dokładnie z
                      wielkością liter i końcowym ukośnikiem.
                    </p>
                    <div className="connection-redirect">
                      <input
                        aria-label="Adres powrotu Spotify"
                        value={redirectUri}
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button className="secondary" onClick={copyRedirect}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}{' '}
                        {copied ? 'Skopiowano' : 'Kopiuj adres'}
                      </button>
                    </div>
                  </li>
                  <li>
                    <strong>Sprawdź dostęp konta i skopiuj Client ID.</strong>
                    <p>
                      W Users Management dodaj konta, które będą korzystać z integracji. Następnie
                      znajdź Client ID w ustawieniach aplikacji i wklej go tutaj.
                    </p>
                  </li>
                </ol>
              </details>
            </>
          )}
          <div className="connection-actions">
            <button className="secondary" onClick={() => go(0)}>
              <ArrowLeft size={16} /> Wstecz
            </button>
            <button className="primary" onClick={save}>
              Zapisz konfigurację <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <p className="connection-confirm">
            <Check size={18} /> Używasz{' '}
            {customSpotifyClientId() ? 'własnego połączenia' : 'domyślnego połączenia tej strony'}.
          </p>
          <p className="connection-lead">
            Client ID jest zapisany na tym urządzeniu. Zmienisz go później w{' '}
            <strong>O aplikacji → Ustawienia Spotify</strong> lub w menu konta.
          </p>
          <div className="connection-phone">
            <div>
              <h4>Ten sam Client ID na telefonie</h4>
              <p>
                Po instalacji Hiciarza otwórz Ustawienia Spotify i zeskanuj ten kod. Możesz też użyć
                aparatu telefonu — link otworzy Hiciarza z podglądem konfiguracji do zapisania.
              </p>
              <p className="hint">
                QR przenosi publiczny Client ID. Na każdym urządzeniu logujesz się do Spotify
                osobno.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  try {
                    setShareImage(qrImage(spotifySetupUrl(), 6));
                    const show = !sharing;
                    setSharing(show);
                    if (show)
                      requestAnimationFrame(() =>
                        shareFigure.current?.scrollIntoView({ block: 'nearest' }),
                      );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <QrCode size={17} /> {sharing ? 'Ukryj kod QR' : 'Pokaż QR konfiguracji'}
              </button>
            </div>
            {sharing && (
              <figure ref={shareFigure}>
                <img
                  className="connection-config-qr"
                  src={shareImage}
                  alt="QR konfiguracji Spotify"
                  data-qr-value={spotifySetupUrl()}
                />
                <figcaption>Zeskanuj i potwierdź zapis na telefonie.</figcaption>
              </figure>
            )}
          </div>
          <div className="connection-actions">
            <button className="secondary" onClick={() => go(1)}>
              <ArrowLeft size={16} /> Edytuj Client ID
            </button>
            {purpose ? (
              <button
                className="primary"
                disabled={connecting}
                onClick={async () => {
                  setConnecting(true);
                  setError('');
                  try {
                    await authorizeSpotify(purpose);
                  } catch (e) {
                    setError((e as Error).message);
                    setConnecting(false);
                  }
                }}
              >
                {connecting ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <ArrowRight size={17} />
                )}{' '}
                {connecting ? 'Otwieram Spotify…' : 'Zaloguj się do Spotify'}
              </button>
            ) : (
              <button className="primary" onClick={onDone}>
                Gotowe <Check size={17} />
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
