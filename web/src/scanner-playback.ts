import type { Card } from './model';

// Keep "browser" as the stored value for the original paired-screen mode.
export type PlaybackOutput = 'local' | 'browser';

export function initialPlaybackOutput(saved: string | null): PlaybackOutput {
  return saved === 'browser' ? 'browser' : 'local';
}

export function scannerPlaybackRoute(output: PlaybackOutput, paired: boolean) {
  if (output !== 'browser') return 'direct' as const;
  return paired ? ('peer' as const) : ('pair-required' as const);
}

export function cardPlaybackSource(card: Card, preferred: 'spotify' | 'youtube') {
  return card.sources[preferred] ? preferred : card.sources.spotify ? 'spotify' : 'youtube';
}
