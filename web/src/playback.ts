export type PlaybackState = 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
export type PlaybackFeedback = { cardId: string; state: PlaybackState; message: string };
export function validPlaybackFeedback(value: unknown): value is PlaybackFeedback {
  if (!value || typeof value !== 'object') return false;
  const feedback = value as PlaybackFeedback;
  return (
    typeof feedback.cardId === 'string' &&
    feedback.cardId.length > 0 &&
    feedback.cardId.length < 100 &&
    ['loading', 'playing', 'paused', 'stopped', 'error'].includes(feedback.state) &&
    typeof feedback.message === 'string' &&
    feedback.message.length <= 1000
  );
}
