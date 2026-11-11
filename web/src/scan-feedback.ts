/** Haptics are optional: an unsupported or blocked API must never interrupt a scan. */
export function vibrateOnScan() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
      navigator.vibrate([35, 45, 35]);
  } catch {
    // The visible confirmation remains available when the browser blocks vibration.
  }
}
