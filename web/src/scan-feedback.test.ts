import { afterEach, describe, expect, it, vi } from 'vitest';
import { vibrateOnScan } from './scan-feedback';

afterEach(() => vi.unstubAllGlobals());
describe('scan haptics', () => {
  it('sends a short confirmation pattern to a supported device', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    vibrateOnScan();
    expect(vibrate).toHaveBeenCalledExactlyOnceWith([35, 45, 35]);
  });
  it('keeps scanning functional when vibration is unavailable', () => {
    vi.stubGlobal('navigator', {});
    expect(() => vibrateOnScan()).not.toThrow();
  });
  it('keeps scanning functional when vibration is blocked', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('Vibration blocked');
      },
    });
    expect(() => vibrateOnScan()).not.toThrow();
  });
});
