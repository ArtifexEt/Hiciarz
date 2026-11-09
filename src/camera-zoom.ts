export type ZoomRange = { min: number; max: number; step: number; value: number };
type ZoomCapabilities = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
};
type ZoomSettings = MediaTrackSettings & { zoom?: number };
type ZoomConstraints = MediaTrackConstraintSet & { zoom?: number };

export function cameraZoomRange(track: MediaStreamTrack): ZoomRange | null {
  try {
    const z = (track.getCapabilities() as ZoomCapabilities).zoom;
    if (!z || !Number.isFinite(z.min) || !Number.isFinite(z.max) || z.min <= 0 || z.max <= z.min)
      return null;
    const step = z.step && Number.isFinite(z.step) && z.step > 0 ? z.step : 0.1;
    const setting = (track.getSettings() as ZoomSettings).zoom;
    const current = typeof setting === 'number' && Number.isFinite(setting) ? setting : z.min;
    return { min: z.min, max: z.max, step, value: Math.max(z.min, Math.min(z.max, current)) };
  } catch {
    // Older browsers may not expose camera capabilities at all.
    return null;
  }
}

export function clampCameraZoom(range: ZoomRange, value: number) {
  if (!Number.isFinite(value)) return range.value;
  const snapped = range.min + Math.round((value - range.min) / range.step) * range.step;
  return Number(Math.max(range.min, Math.min(range.max, snapped)).toFixed(6));
}

export async function applyCameraZoom(track: MediaStreamTrack, range: ZoomRange, value: number) {
  if (track.readyState !== 'live') throw new Error('Aparat jest wyłączony.');
  const target = clampCameraZoom(range, value);
  const {
    advanced = [],
    zoom: _zoom,
    ...constraints
  } = track.getConstraints() as MediaTrackConstraints & { zoom?: unknown };
  const retained = advanced
    .map((entry) => {
      const { zoom: _previous, ...other } = entry as ZoomConstraints;
      return other;
    })
    .filter((entry) => Object.keys(entry).length > 0);
  await track.applyConstraints({
    ...constraints,
    advanced: [...retained, { zoom: target } as ZoomConstraints],
  });
  const actual = (track.getSettings() as ZoomSettings).zoom;
  if (
    typeof actual !== 'number' ||
    !Number.isFinite(actual) ||
    Math.abs(actual - target) > range.step / 2 + 0.000001
  )
    throw new Error('Aparat nie ustawił wybranego przybliżenia.');
  return actual;
}

// Serialise camera operations and coalesce rapid slider movements to the latest value.
export function cameraZoomController(
  track: MediaStreamTrack,
  range: ZoomRange,
  applied: (value: number) => void,
  failed: () => void,
) {
  let pending: number | undefined,
    running = false,
    closed = false;
  async function flush() {
    if (running) return;
    running = true;
    while (!closed && pending !== undefined) {
      const value = pending;
      pending = undefined;
      try {
        const actual = await applyCameraZoom(track, range, value);
        if (!closed && pending === undefined) applied(actual);
      } catch {
        if (!closed && pending === undefined) failed();
      }
    }
    running = false;
  }
  return {
    request(value: number) {
      if (closed) return;
      pending = clampCameraZoom(range, value);
      void flush();
    },
    close() {
      closed = true;
      pending = undefined;
    },
  };
}
