import { describe, expect, it, vi } from 'vitest';
import {
  applyCameraZoom,
  cameraZoomController,
  cameraZoomRange,
  clampCameraZoom,
} from './camera-zoom';

const range = { min: 1, max: 4, step: 0.1, value: 1 };
function camera() {
  let zoom = 1;
  const track = {
    readyState: 'live',
    getCapabilities: () => ({ zoom: { min: 1, max: 4, step: 0.1 } }),
    getSettings: () => ({ zoom }),
    getConstraints: () => ({
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      advanced: [{ zoom: 1 }, { torch: true }],
    }),
    applyConstraints: vi.fn(async (c: any) => {
      zoom = c.advanced.at(-1).zoom;
    }),
  };
  return { track: track as unknown as MediaStreamTrack, raw: track };
}
describe('camera zoom', () => {
  it('only offers a real advertised zoom range and tolerates older browsers', () => {
    expect(cameraZoomRange(camera().track)).toEqual(range);
    expect(cameraZoomRange({ getCapabilities: () => ({}) } as MediaStreamTrack)).toBeNull();
    expect(cameraZoomRange({} as MediaStreamTrack)).toBeNull();
    expect(
      cameraZoomRange({
        getCapabilities: () => ({ zoom: { min: 1, max: 1 } }),
      } as unknown as MediaStreamTrack),
    ).toBeNull();
    expect(clampCameraZoom(range, 9)).toBe(4);
    expect(clampCameraZoom(range, 0)).toBe(1);
    expect(clampCameraZoom(range, 2.26)).toBe(2.3);
  });

  it('zooms the stream used by the decoder and preserves unrelated camera constraints', async () => {
    const c = camera();
    await expect(applyCameraZoom(c.track, range, 2.26)).resolves.toBe(2.3);
    expect(c.raw.applyConstraints).toHaveBeenCalledWith({
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      advanced: [{ torch: true }, { zoom: 2.3 }],
    });
    c.raw.applyConstraints.mockImplementation(async () => {});
    await expect(applyCameraZoom(c.track, range, 3)).rejects.toThrow('nie ustawił');
    c.raw.readyState = 'ended';
    await expect(applyCameraZoom(c.track, range, 2)).rejects.toThrow('wyłączony');
  });

  it('serialises zoom changes and coalesces intermediate slider values', async () => {
    const c = camera();
    const apply = c.raw.applyConstraints.getMockImplementation()!;
    let release!: () => void;
    c.raw.applyConstraints.mockImplementationOnce(async (constraints) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      await apply(constraints);
    });
    const applied = vi.fn(),
      failed = vi.fn();
    const control = cameraZoomController(c.track, range, applied, failed);
    control.request(2);
    control.request(2.5);
    control.request(3);
    expect(c.raw.applyConstraints).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(applied).toHaveBeenCalledWith(3));
    expect(c.raw.applyConstraints).toHaveBeenCalledTimes(2);
    expect(applied).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
    control.close();
    control.request(4);
    expect(c.raw.applyConstraints).toHaveBeenCalledTimes(2);
  });

  it('ignores a pending result after the camera control has been unmounted', async () => {
    const c = camera();
    let release!: () => void;
    c.raw.applyConstraints.mockImplementationOnce(async () => {
      await new Promise<void>((r) => {
        release = r;
      });
    });
    const applied = vi.fn(),
      failed = vi.fn();
    const control = cameraZoomController(c.track, range, applied, failed);
    control.request(3);
    control.close();
    release();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(applied).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
  });
});
