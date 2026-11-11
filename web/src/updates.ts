import { registerSW } from 'virtual:pwa-register';

let ready = false;
let registration: ServiceWorkerRegistration | undefined;
const listeners = new Set<() => void>();
export const appVersion = (import.meta.env.VITE_APP_VERSION || 'dev').slice(0, 7);
export const subscribeToUpdates = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const updateIsReady = () => ready;
export async function checkForUpdates() {
  if (registration && navigator.onLine) await registration.update();
}
export const applyUpdate = registerSW({
  immediate: true,
  onNeedRefresh() {
    ready = true;
    for (const listener of listeners) listener();
  },
  onRegisteredSW(_url, value) {
    registration = value;
    const check = () => {
      if (document.visibilityState === 'visible') void checkForUpdates().catch(() => {});
    };
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    window.setInterval(check, 10 * 60 * 1000);
    check();
  },
});
