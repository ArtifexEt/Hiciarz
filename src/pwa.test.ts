import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const iphoneSafari =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
let browser: EventTarget;
let browserNavigator: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  onLine: boolean;
};
let standalone: boolean;

beforeEach(() => {
  vi.resetModules();
  standalone = false;
  browser = new EventTarget();
  browserNavigator = { userAgent: '', platform: '', maxTouchPoints: 0, onLine: true };
  Object.assign(browser, {
    matchMedia: (query: string) => ({
      matches: query.includes('standalone') && standalone,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  vi.stubGlobal('window', browser);
  vi.stubGlobal('navigator', browserNavigator);
});

afterEach(() => vi.unstubAllGlobals());

function installEvent(prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' } | void>) {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });
}

describe('PWA installation and connection state', () => {
  it('offers manual guidance only on Apple mobile browsers with a share menu', async () => {
    const { supportsManualInstall } = await import('./pwa');
    expect(supportsManualInstall({ userAgent: iphoneSafari })).toBe(true);
    expect(
      supportsManualInstall({
        userAgent: 'Mozilla/5.0 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(supportsManualInstall({ userAgent: iphoneSafari + ' Instagram' })).toBe(false);
    expect(
      supportsManualInstall({ userAgent: 'Mozilla/5.0 Android Chrome/130 Safari/537.36' }),
    ).toBe(false);
    expect(
      supportsManualInstall({ userAgent: 'Mozilla/5.0 Safari/605.1.15', platform: 'MacIntel' }),
    ).toBe(false);
  });

  it('captures the browser event without prompting and consumes it only after a user action', async () => {
    const { getPwaSnapshot, requestAppInstall } = await import('./pwa');
    expect(getPwaSnapshot().canPrompt).toBe(false);
    const prompt = vi.fn(async () => ({ outcome: 'accepted' as const }));
    const event = installEvent(prompt);
    browser.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(getPwaSnapshot().canPrompt).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    await expect(requestAppInstall()).resolves.toBe('accepted');
    await expect(requestAppInstall()).resolves.toBeNull();
    expect(prompt).toHaveBeenCalledOnce();
    expect(getPwaSnapshot().canPrompt).toBe(false);
    browser.dispatchEvent(new Event('appinstalled'));
    expect(getPwaSnapshot()).toMatchObject({
      installed: true,
      canPrompt: false,
      manualInstall: false,
    });
  });

  it('honours dismissal and supports the older userChoice result without prompting twice', async () => {
    const { getPwaSnapshot, requestAppInstall } = await import('./pwa');
    const prompt = vi.fn(async () => {});
    browser.dispatchEvent(
      Object.assign(installEvent(prompt), {
        userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
      }),
    );
    await expect(requestAppInstall()).resolves.toBe('dismissed');
    expect(getPwaSnapshot()).toMatchObject({ installed: false, canPrompt: false });
    await expect(requestAppInstall()).resolves.toBeNull();
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('does not advertise installation while running standalone', async () => {
    standalone = true;
    browserNavigator.userAgent = iphoneSafari;
    const { getPwaSnapshot, requestAppInstall } = await import('./pwa');
    const prompt = vi.fn(async () => ({ outcome: 'accepted' as const }));
    browser.dispatchEvent(installEvent(prompt));
    expect(getPwaSnapshot()).toMatchObject({
      installed: true,
      canPrompt: false,
      manualInstall: false,
    });
    await expect(requestAppInstall()).resolves.toBeNull();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('reports a failed prompt and can accept a fresh browser event afterwards', async () => {
    const { getPwaSnapshot, requestAppInstall } = await import('./pwa');
    browser.dispatchEvent(
      installEvent(async () => {
        throw new Error('Prompt unavailable');
      }),
    );
    await expect(requestAppInstall()).rejects.toThrow('Prompt unavailable');
    expect(getPwaSnapshot().canPrompt).toBe(false);
    browser.dispatchEvent(installEvent(async () => ({ outcome: 'dismissed' as const })));
    await expect(requestAppInstall()).resolves.toBe('dismissed');
  });

  it('updates offline guidance without treating connection state as an installation gate', async () => {
    const { getPwaSnapshot, subscribePwa } = await import('./pwa');
    browser.dispatchEvent(installEvent(async () => ({ outcome: 'dismissed' as const })));
    const changed = vi.fn();
    const unsubscribe = subscribePwa(changed);
    browserNavigator.onLine = false;
    browser.dispatchEvent(new Event('offline'));
    expect(getPwaSnapshot()).toMatchObject({ online: false, canPrompt: true });
    browser.dispatchEvent(new Event('offline'));
    expect(changed).toHaveBeenCalledOnce();
    browserNavigator.onLine = true;
    browser.dispatchEvent(new Event('online'));
    expect(getPwaSnapshot().online).toBe(true);
    expect(changed).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
