import { useId, useState, useSyncExternalStore } from 'react';
import { Download, LoaderCircle, Share, WifiOff } from 'lucide-react';
import { useTranslation } from './i18n';
import { getPwaSnapshot, getServerPwaSnapshot, requestAppInstall, subscribePwa } from './pwa';
import './app-install.css';

function usePwa() {
  return useSyncExternalStore(subscribePwa, getPwaSnapshot, getServerPwaSnapshot);
}

export default function AppInstall() {
  const { t } = useTranslation();
  const state = usePwa();
  const [instructions, setInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState(false);
  const instructionsId = useId();
  if (state.installed || (!state.canPrompt && !state.manualInstall && !installing && !error))
    return null;
  return (
    <div className="app-install">
      {(state.canPrompt || state.manualInstall || installing) && (
        <button
          className="secondary"
          type="button"
          disabled={installing}
          aria-expanded={state.manualInstall ? instructions : undefined}
          aria-controls={state.manualInstall ? instructionsId : undefined}
          onClick={async () => {
            setError(false);
            if (!state.canPrompt) {
              setInstructions(!instructions);
              return;
            }
            setInstalling(true);
            try {
              await requestAppInstall();
            } catch {
              setError(true);
            } finally {
              setInstalling(false);
            }
          }}
        >
          {installing ? (
            <LoaderCircle size={18} className="spin" aria-hidden="true" />
          ) : (
            <Download size={18} aria-hidden="true" />
          )}
          {t(installing ? 'pwa.installOpening' : 'pwa.install')}
        </button>
      )}
      {state.manualInstall && instructions && (
        <ol className="app-install-steps" id={instructionsId}>
          <li>
            <Share size={17} aria-hidden="true" />
            <span>{t('pwa.iosShare')}</span>
          </li>
          <li>{t('pwa.iosAdd')}</li>
        </ol>
      )}
      {error && (
        <p className="app-install-error" role="alert">
          {t('pwa.installError')}
        </p>
      )}
    </div>
  );
}

export function ConnectionNotice() {
  const { t } = useTranslation();
  const { online } = usePwa();
  if (online) return null;
  return (
    <div className="connection-notice" role="status">
      <WifiOff size={19} aria-hidden="true" />
      <p>{t('pwa.offline')}</p>
    </div>
  );
}
