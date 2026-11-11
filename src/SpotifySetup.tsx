import { displayTranslation, t, useTranslation } from './i18n';
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
  useTranslation();
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
      setError(t('components.SpotifySetup.selectTheReturnAddressBelowAnd'));
    }
  }
  function save() {
    try {
      if (choice === 'default' && !defaultId)
        throw new Error(t('components.SpotifySetup.thisSiteHasNoDefaultClient'));
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
      <ol
        className="connection-progress"
        aria-label={t('components.SpotifySetup.spotifyConfiguration')}
      >
        {[
          t('components.SpotifySetup.chooseConnection'),
          t('components.SpotifySetup.configure'),
          t('components.SpotifySetup.takeItToYourPhone'),
        ].map((label, i) => (
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
          ? t('components.SpotifySetup.yourMusicYourConnection')
          : step === 1
            ? t('components.SpotifySetup.prepareYourConnection')
            : t('components.SpotifySetup.configurationSavedWhatsNext')}
      </h3>
      {step === 0 && (
        <>
          <p className="connection-lead">
            {t('components.SpotifySetup.spotifyLetsYouImportPlaylistsAnd')}
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
                  <strong>{t('components.SpotifySetup.hiciarzsDefaultConnection')}</strong>
                  <small>{t('components.SpotifySetup.forAccountsAddedByThePerson')}</small>
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
                <strong>{t('components.SpotifySetup.myOwnConnection')}</strong>
                <small>{t('components.SpotifySetup.youHaveAClientIDOr')}</small>
              </span>
            </label>
          </div>
          <details className="connection-story">
            <summary>{t('components.SpotifySetup.whyDoesSpotifyNeedConfiguration')}</summary>
            <p>{t('components.SpotifySetup.sinceFebruary2026NewDevelopmentmodeIntegrations')}</p>
            <p>{t('components.SpotifySetup.hiciarzIsOpenSourceAndYou')}</p>
            <a href={rules} target="_blank" rel="noopener noreferrer">
              {t('components.SpotifySetup.spotifyAccessRules')} <ExternalLink size={13} />
            </a>
          </details>
          <div className="connection-actions">
            <button className="primary" onClick={() => go(1)}>
              {t('components.SpotifySetup.next')} <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <>
          {scanned && (
            <p className="connection-confirm" role="status">
              <Check size={17} /> {t('components.SpotifySetup.configurationReadFromQRCheckThe')}
            </p>
          )}
          {defaultId && (
            <div
              className="connection-source-switch"
              role="group"
              aria-label={t('components.SpotifySetup.clientIDSource')}
            >
              <button
                aria-pressed={choice === 'default'}
                onClick={() => {
                  setChoice('default');
                  setError('');
                }}
              >
                {t('components.SpotifySetup.defaultConnection')}
              </button>
              <button
                aria-pressed={choice === 'own'}
                onClick={() => {
                  setChoice('own');
                  setError('');
                }}
              >
                {t('components.SpotifySetup.myOwnClientID')}
              </button>
            </div>
          )}
          {choice === 'default' ? (
            <>
              <p className="connection-lead">
                {t('components.SpotifySetup.youWillUseTheConnectionBundled')}
              </p>
              <div className="connection-id-summary">
                <Settings2 size={20} />
                <div>
                  <strong>{t('components.SpotifySetup.thisSitesClientID')}</strong>
                  <code>{defaultId}</code>
                </div>
              </div>
              <p className="hint">{t('components.SpotifySetup.ifSpotifyDeniesAccessAskThe')}</p>
            </>
          ) : (
            <>
              <p className="connection-lead">
                {t('components.SpotifySetup.alreadyHaveAClientIDPaste')}
              </p>
              <label className="connection-client-input">
                {t('components.SpotifySetup.yourClientID')}
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
                  placeholder={t('components.SpotifySetup.32CharactersFromTheSpotifyDashboard')}
                  aria-invalid={Boolean(idError)}
                  aria-describedby="client-id-help client-id-error"
                />
              </label>
              {idError && (
                <p className="error" id="client-id-error" role="alert">
                  {displayTranslation(idError)}
                </p>
              )}
              <p className="hint" id="client-id-help">
                {t('components.SpotifySetup.clientIDIsAPublicApplication')}
              </p>
              <button
                className="text-button connection-scan"
                onClick={() => setScanning(!scanning)}
              >
                <QrCode size={17} />
                {scanning
                  ? t('components.SpotifySetup.closeConfigurationScanner')
                  : t('components.SpotifySetup.scanConfigurationQR')}
              </button>
              {scanning && (
                <Suspense fallback={<p>{t('components.SpotifySetup.preparingScanner')}</p>}>
                  <Camera
                    purpose="setup"
                    pairingRequired={false}
                    onScan={(raw) => {
                      try {
                        const value = readQR(raw);
                        if (value.kind !== 'spotify-setup')
                          throw new Error(t('components.SpotifySetup.thisIsACardOrPairing'));
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
                <summary>{t('components.SpotifySetup.iDontHaveAClientID')}</summary>
                <ol className="connection-instructions">
                  <li>
                    <strong>{t('components.SpotifySetup.createOrOpenASpotifyApp')}</strong>
                    <p>
                      {t('components.SpotifySetup.in')}{' '}
                      <a href={dashboard} target="_blank" rel="noopener noreferrer">
                        Spotify Developer Dashboard <ExternalLink size={12} />
                      </a>{' '}
                      {t('components.SpotifySetup.selectWebAPIYouCanUse')}
                    </p>
                  </li>
                  <li>
                    <strong>{t('components.SpotifySetup.addTheReturnAddress')}</strong>
                    <p>{t('components.SpotifySetup.inTheAppSettingsAddThe')}</p>
                    <div className="connection-redirect">
                      <input
                        aria-label={t('components.SpotifySetup.spotifyReturnAddress')}
                        value={redirectUri}
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button className="secondary" onClick={copyRedirect}>
                        {copied ? <Check size={16} /> : <Copy size={16} />}{' '}
                        {copied
                          ? t('components.SpotifySetup.copied')
                          : t('components.SpotifySetup.copyAddress')}
                      </button>
                    </div>
                  </li>
                  <li>
                    <strong>{t('components.SpotifySetup.checkAccountAccessAndCopyThe')}</strong>
                    <p>{t('components.SpotifySetup.inUsersManagementAddTheAccounts')}</p>
                  </li>
                </ol>
              </details>
            </>
          )}
          <div className="connection-actions">
            <button className="secondary" onClick={() => go(0)}>
              <ArrowLeft size={16} /> {t('components.SpotifySetup.back')}
            </button>
            <button className="primary" onClick={save}>
              {t('components.SpotifySetup.saveConfiguration')} <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <p className="connection-confirm">
            <Check size={18} /> {t('components.SpotifySetup.youAreUsing')}{' '}
            {customSpotifyClientId()
              ? t('components.SpotifySetup.yourOwnConnection')
              : t('components.SpotifySetup.thisSitesDefaultConnection')}
            .
          </p>
          <p className="connection-lead">
            {t('components.SpotifySetup.theClientIDIsSavedOn')}{' '}
            <strong>{t('components.SpotifySetup.aboutSpotifySettings')}</strong>{' '}
            {t('components.SpotifySetup.orInTheAccountMenu')}
          </p>
          <div className="connection-phone">
            <div>
              <h4>{t('components.SpotifySetup.theSameClientIDOnYour')}</h4>
              <p>{t('components.SpotifySetup.afterInstallingHiciarzOpenSpotifySettings')}</p>
              <p className="hint">{t('components.SpotifySetup.theQRCodeTransfersAPublic')}</p>
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
                <QrCode size={17} />{' '}
                {sharing
                  ? t('components.SpotifySetup.hideQRCode')
                  : t('components.SpotifySetup.showConfigurationQR')}
              </button>
            </div>
            {sharing && (
              <figure ref={shareFigure}>
                <img
                  className="connection-config-qr"
                  src={shareImage}
                  alt={t('components.SpotifySetup.spotifyConfigurationQR')}
                  data-qr-value={spotifySetupUrl()}
                />
                <figcaption>{t('components.SpotifySetup.scanAndConfirmSavingOnYour')}</figcaption>
              </figure>
            )}
          </div>
          <div className="connection-actions">
            <button className="secondary" onClick={() => go(1)}>
              <ArrowLeft size={16} /> {t('components.SpotifySetup.editClientID')}
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
                {connecting
                  ? t('components.SpotifySetup.openingSpotify')
                  : t('components.SpotifySetup.signInToSpotify')}
              </button>
            ) : (
              <button className="primary" onClick={onDone}>
                {t('components.SpotifySetup.done')} <Check size={17} />
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {displayTranslation(error)}
        </p>
      )}
    </div>
  );
}
