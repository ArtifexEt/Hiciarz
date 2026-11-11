import { displayTranslation, t, useTranslation } from './i18n';
import { useRef, useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, LoaderCircle, Settings2 } from 'lucide-react';
import { authorizeSpotify } from './spotify';
import {
  acknowledgeSpotifySetup,
  customSpotifyClientId,
  defaultSpotifyClientId,
  saveSpotifyClientId,
  spotifyRedirectUri,
  validateSpotifyClientId,
  type SpotifyPurpose,
} from './spotify-settings';
import DocumentationLinks from './DocumentationLinks';
import SpotifyLoginNotice from './SpotifyLoginNotice';
import './spotify-setup.css';

const dashboard = 'https://developer.spotify.com/dashboard';

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
  const hasDefault = Boolean(defaultSpotifyClientId());
  const hasCustom = Boolean(customSpotifyClientId());
  const configured = hasDefault || hasCustom;
  const [stage, setStage] = useState<'summary' | 'edit' | 'ready'>(
    purpose || incomingClientId || !configured ? 'edit' : 'summary',
  );
  const [choice, setChoice] = useState<'default' | 'own'>(
    incomingClientId || hasCustom || !hasDefault ? 'own' : 'default',
  );
  const [incomingId, setIncomingId] = useState(incomingClientId || '');
  // A replacement is entered explicitly; saved and incoming identifiers never enter the DOM.
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState('');
  const [idError, setIdError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const clientInput = useRef<HTMLInputElement>(null);
  const redirectUri = spotifyRedirectUri();

  function go(next: typeof stage) {
    setError('');
    setIdError('');
    setStage(next);
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: 'nearest' });
    });
  }

  function edit() {
    setClientId('');
    setChoice(incomingId || hasCustom || !hasDefault ? 'own' : 'default');
    go('edit');
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
      if (choice === 'default') {
        if (!hasDefault) throw new Error(t('components.SpotifySetup.thisSiteHasNoDefaultClient'));
        saveSpotifyClientId(null);
      } else if (clientId.trim() || incomingId) {
        saveSpotifyClientId(validateSpotifyClientId(clientId.trim() || incomingId));
      } else if (!hasCustom) {
        throw new Error(t('spotifyPrivate.enterClientId'));
      }
      // Continuing with an unchanged custom connection preserves its login and device.
      acknowledgeSpotifySetup();
      setClientId('');
      setIncomingId('');
      go('ready');
    } catch (e) {
      setIdError((e as Error).message);
      clientInput.current?.focus();
    }
  }

  return (
    <div className={'spotify-onboarding' + (stage === 'edit' ? ' is-editing' : '')}>
      {stage === 'edit' ? (
        <>
          <h3 ref={heading} tabIndex={-1} className="connection-title">
            {t('spotifyPrivate.chooseConnection')}
          </h3>
          <div
            className={'connection-options' + (hasDefault ? ' has-default' : '')}
            role="radiogroup"
            aria-label={t('spotifyPrivate.chooseConnection')}
          >
            {hasDefault && (
              <label className={choice === 'default' ? 'chosen' : ''}>
                <input
                  type="radio"
                  name="spotify-client-choice"
                  checked={choice === 'default'}
                  onChange={() => {
                    setChoice('default');
                    setIdError('');
                  }}
                />
                <span>
                  <strong>{t('spotifyPrivate.defaultConnection')}</strong>
                  <small>{t('spotifyPrivate.defaultDescription')}</small>
                </span>
              </label>
            )}
            <label className={choice === 'own' ? 'chosen' : ''}>
              <input
                type="radio"
                name="spotify-client-choice"
                checked={choice === 'own'}
                onChange={() => {
                  setChoice('own');
                  setIdError('');
                }}
              />
              <span>
                <strong>{t('spotifyPrivate.ownConnection')}</strong>
                <small>{t('spotifyPrivate.ownDescription')}</small>
              </span>
            </label>
          </div>

          {choice === 'default' ? (
            <div className="connection-configuration connection-default-guide">
              <h4>{t('spotifyPrivate.defaultAccess')}</h4>
              <p>{t('spotifyPrivate.defaultAccessDescription')}</p>
            </div>
          ) : (
            <div className="connection-configuration connection-own-guide">
              <section className="connection-entry">
                <h4>{t('spotifyPrivate.connectionSettings')}</h4>
                {incomingId ? (
                  <p className="connection-confirm" role="status">
                    <Check size={18} aria-hidden="true" />
                    {t('spotifyPrivate.incomingConfiguration')}
                  </p>
                ) : hasCustom ? (
                  <p className="hint">{t('spotifyPrivate.keepSavedConnection')}</p>
                ) : null}
                <label className="connection-client-input">
                  {t('spotifyPrivate.newClientId')}
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
                    aria-describedby={'client-id-help' + (idError ? ' client-id-error' : '')}
                  />
                </label>
                {idError && (
                  <p className="error" id="client-id-error" role="alert">
                    {displayTranslation(idError)}
                  </p>
                )}
                <p className="hint" id="client-id-help">
                  {t('spotifyPrivate.noSecret')}
                </p>
              </section>

              <section className="connection-guide" aria-labelledby="connection-guide-title">
                <h4 id="connection-guide-title">{t('spotifyPrivate.howToConfigure')}</h4>
                <ol className="connection-instructions">
                  <li>
                    <strong>{t('spotifyPrivate.createApp')}</strong>
                    <p>
                      <a href={dashboard} target="_blank" rel="noopener noreferrer">
                        Spotify Developer Dashboard <ExternalLink size={13} aria-hidden="true" />
                      </a>
                      {' — '}
                      {t('spotifyPrivate.selectWebApi')}
                    </p>
                  </li>
                  <li>
                    <strong>{t('components.SpotifySetup.addTheReturnAddress')}</strong>
                    <p>{t('spotifyPrivate.redirectInstruction')}</p>
                    <div className="connection-redirect">
                      <input
                        aria-label={t('components.SpotifySetup.spotifyReturnAddress')}
                        value={redirectUri}
                        readOnly
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button type="button" className="secondary" onClick={copyRedirect}>
                        {copied ? (
                          <Check size={16} aria-hidden="true" />
                        ) : (
                          <Copy size={16} aria-hidden="true" />
                        )}
                        {copied
                          ? t('components.SpotifySetup.copied')
                          : t('components.SpotifySetup.copyAddress')}
                      </button>
                    </div>
                  </li>
                  <li>
                    <strong>{t('spotifyPrivate.addAccount')}</strong>
                    <p>{t('spotifyPrivate.accountInstruction')}</p>
                  </li>
                  <li>
                    <strong>{t('spotifyPrivate.pasteClientId')}</strong>
                    <p>{t('spotifyPrivate.clientIdInstruction')}</p>
                  </li>
                </ol>
                <DocumentationLinks topic="spotify" />
              </section>
            </div>
          )}
          <div className="connection-actions">
            {configured && !purpose && (
              <button type="button" className="secondary" onClick={() => go('summary')}>
                {t('spotifyPrivate.cancel')}
              </button>
            )}
            <button type="button" className="primary" onClick={save}>
              {t('spotifyPrivate.saveConnection')} <Check size={17} aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="connection-summary">
            <Settings2 size={24} aria-hidden="true" />
            <div>
              <h3 ref={heading} tabIndex={-1} className="connection-title">
                {hasCustom
                  ? t('spotifyPrivate.ownConnection')
                  : t('spotifyPrivate.defaultConnection')}
              </h3>
              <p>
                {stage === 'ready' ? t('spotifyPrivate.saved') : t('spotifyPrivate.configured')}
              </p>
            </div>
            {!(purpose && stage === 'ready' && !hasCustom) && (
              <button type="button" className="secondary" onClick={edit}>
                {t('spotifyPrivate.changeConnection')}
              </button>
            )}
          </div>
          {purpose && stage === 'ready' && <SpotifyLoginNotice purpose={purpose} />}
          {stage === 'ready' && (
            <div className="connection-actions">
              {purpose ? (
                <button
                  type="button"
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
                    <LoaderCircle size={17} className="spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight size={17} aria-hidden="true" />
                  )}
                  {connecting
                    ? t('components.SpotifySetup.openingSpotify')
                    : t('components.SpotifySetup.signInToSpotify')}
                </button>
              ) : (
                <button type="button" className="primary" onClick={onDone}>
                  {t('components.SpotifySetup.done')} <Check size={17} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
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
