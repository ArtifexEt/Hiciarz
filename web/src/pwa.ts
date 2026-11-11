export type InstallOutcome = 'accepted' | 'dismissed';
type InstallChoice = { outcome: InstallOutcome };
export type InstallPromptEvent = Event & {
  prompt: () => Promise<InstallChoice | void>;
  userChoice?: Promise<InstallChoice>;
};

export type PwaSnapshot = {
  installed: boolean;
  canPrompt: boolean;
  manualInstall: boolean;
  online: boolean;
};

const serverSnapshot: PwaSnapshot = {
  installed: false,
  canPrompt: false,
  manualInstall: false,
  online: true,
};
let snapshot = serverSnapshot;
let installPrompt: InstallPromptEvent | null = null;
let installationCompleted = false;
const listeners = new Set<() => void>();

export function supportsManualInstall({
  userAgent = '',
  platform = '',
  maxTouchPoints = 0,
}: {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
}): boolean {
  const appleMobile =
    /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  const browserWithShareMenu = /Safari\//.test(userAgent);
  const embeddedBrowser = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|GSA\//.test(userAgent);
  return appleMobile && browserWithShareMenu && !embeddedBrowser;
}

function installedDisplay() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
      window.matchMedia?.('(display-mode: minimal-ui)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone,
  );
}

function publish() {
  if (typeof window === 'undefined') return;
  const installed = installationCompleted || installedDisplay();
  const next: PwaSnapshot = {
    installed,
    canPrompt: !installed && Boolean(installPrompt),
    manualInstall: !installed && supportsManualInstall(navigator),
    // Treat missing browser information as online; this is a hint, not a feature gate.
    online: navigator.onLine !== false,
  };
  if (
    Object.keys(next).every(
      (key) => next[key as keyof PwaSnapshot] === snapshot[key as keyof PwaSnapshot],
    )
  )
    return;
  snapshot = next;
  for (const listener of listeners) listener();
}

export const getPwaSnapshot = () => snapshot;
export const getServerPwaSnapshot = () => serverSnapshot;
export function subscribePwa(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A browser prompt is single-use and must be invoked directly from a user action. */
export async function requestAppInstall(): Promise<InstallOutcome | null> {
  const prompt = installPrompt;
  if (!prompt || snapshot.installed) return null;
  installPrompt = null;
  publish();
  const result = await prompt.prompt();
  const choice = result || (await prompt.userChoice);
  return choice?.outcome || null;
}

// Listen while the app loads, rather than only when Settings is opened.
if (typeof window !== 'undefined') {
  const onPrompt = (event: Event) => {
    if (typeof (event as InstallPromptEvent).prompt !== 'function') return;
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    publish();
  };
  const onInstalled = () => {
    installationCompleted = true;
    installPrompt = null;
    publish();
  };
  const modes = ['standalone', 'minimal-ui'].map((mode) =>
    window.matchMedia?.(`(display-mode: ${mode})`),
  );
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);
  window.addEventListener('online', publish);
  window.addEventListener('offline', publish);
  for (const mode of modes) mode?.addEventListener?.('change', publish);
  publish();
  import.meta.hot?.dispose(() => {
    window.removeEventListener('beforeinstallprompt', onPrompt);
    window.removeEventListener('appinstalled', onInstalled);
    window.removeEventListener('online', publish);
    window.removeEventListener('offline', publish);
    for (const mode of modes) mode?.removeEventListener?.('change', publish);
  });
}
