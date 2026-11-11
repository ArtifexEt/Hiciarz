import { t, useTranslation } from './i18n';
import { useEffect, useRef } from 'react';
import type { Card } from './model';
import type { Command } from './connection';
import type { PlaybackState } from './playback';
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: any) => void;
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}
let spotifyApi: Promise<any> | undefined, youtubeApi: Promise<any> | undefined;
export function loadSpotifyAPI() {
  if (spotifyApi) return spotifyApi;
  const request = new Promise<any>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const finish = (api?: any, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.onerror = null;
      if (window.onSpotifyIframeApiReady === ready) window.onSpotifyIframeApiReady = undefined;
      if (error) {
        script.remove();
        reject(error);
      } else resolve(api);
    };
    const ready = (api: any) => finish(api);
    const timeout = setTimeout(
      () => finish(undefined, new Error(t('components.Players.couldNotLoadSpotify'))),
      20000,
    );
    window.onSpotifyIframeApiReady = ready;
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.onerror = () =>
      finish(undefined, new Error(t('components.Players.couldNotLoadSpotify')));
    document.head.append(script);
  });
  spotifyApi = request;
  // Component cleanup must not cancel a script another player is still waiting for.
  void request.catch(() => {
    if (spotifyApi === request) spotifyApi = undefined;
  });
  return request;
}
export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApi) return youtubeApi;
  const request = new Promise<any>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    const finish = (api?: any, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      script.onerror = null;
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = undefined;
      if (error) {
        script.remove();
        reject(error);
      } else resolve(api);
    };
    const ready = () => finish(window.YT);
    const timeout = setTimeout(
      () => finish(undefined, new Error(t('components.Players.couldNotLoadYouTube'))),
      20000,
    );
    window.onYouTubeIframeAPIReady = ready;
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () =>
      finish(undefined, new Error(t('components.Players.couldNotLoadYouTube')));
    document.head.append(script);
  });
  youtubeApi = request;
  void request.catch(() => {
    if (youtubeApi === request) youtubeApi = undefined;
  });
  return request;
}
export default function Players({
  card,
  source,
  command,
  onState,
}: {
  card: Card | null;
  source: 'spotify' | 'youtube';
  command: { type: Command; seq: number } | null;
  onState: (text: string, state?: PlaybackState) => void;
}) {
  useTranslation();
  const container = useRef<HTMLDivElement>(null),
    controller = useRef<any>(null),
    callback = useRef(onState),
    current = useRef({ card, source });
  callback.current = onState;
  current.current = { card, source };
  const hasCard = Boolean(card);
  const playbackTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const playbackTimedOut = useRef(false);
  function clearPlaybackTimeout() {
    clearTimeout(playbackTimeout.current);
    playbackTimeout.current = undefined;
    playbackTimedOut.current = false;
  }
  function report(text: string, state?: PlaybackState) {
    if (state === 'loading') {
      // Repeated buffering events belong to the same wait, not a new 20-second window.
      if (playbackTimedOut.current) return;
      if (!playbackTimeout.current)
        playbackTimeout.current = setTimeout(() => {
          playbackTimeout.current = undefined;
          playbackTimedOut.current = true;
          callback.current(t('components.Players.thePlayerIsNotRespondingCheck'), 'error');
        }, 20000);
    } else clearPlaybackTimeout();
    callback.current(text, state);
  }
  function load(c: any) {
    const { card, source } = current.current;
    if (!card) return;
    const id = card.sources[source];
    if (!id) {
      report(t('components.Players.thisCardHasNoSelectedSource'), 'error');
      return;
    }
    clearPlaybackTimeout();
    report(t('components.Players.loadingTrack'), 'loading');
    if (source === 'youtube') c.loadVideoById(id);
    else {
      if (c.loadEntity) c.loadEntity('spotify:track:' + id);
      else c.loadUri('spotify:track:' + id);
      c.play();
    }
  }
  useEffect(() => {
    if (!hasCard || !container.current) return;
    let dead = false,
      instance: any = null;
    const mount = document.createElement('div');
    container.current.replaceChildren(mount);
    controller.current = null;
    report(t('components.Players.loadingPlayer'), 'loading');
    if (source === 'spotify' && current.current.card?.sources.spotify) {
      loadSpotifyAPI()
        .then((api) => {
          if (dead) return;
          const initialId = current.current.card?.sources.spotify;
          api.createController(
            mount,
            { uri: 'spotify:track:' + initialId, width: '100%', height: 352 },
            (c: any) => {
              if (dead) {
                c.destroy();
                return;
              }
              instance = c;
              c.addListener('ready', () => {
                if (dead) return;
                controller.current = c;
                report(t('components.Players.readyIfTheMusicDoesNot'), 'paused');
                if (current.current.card?.sources.spotify !== initialId) load(c);
                else c.play();
              });
              c.addListener('playback_update', (e: any) => {
                if (!dead)
                  report(
                    e.data.isBuffering
                      ? t('components.Players.buffering')
                      : e.data.isPaused
                        ? t('components.Players.pausedReadyToPlay')
                        : t('components.Players.playing'),
                    e.data.isBuffering ? 'loading' : e.data.isPaused ? 'paused' : 'playing',
                  );
              });
            },
          );
        })
        .catch((e) => {
          if (!dead) report(e.message, 'error');
        });
    } else if (source === 'youtube' && current.current.card?.sources.youtube) {
      loadYouTubeAPI()
        .then((YT) => {
          if (dead) return;
          const c = new YT.Player(mount, {
            videoId: current.current.card?.sources.youtube,
            width: '100%',
            height: 352,
            playerVars: { autoplay: 1, playsinline: 1, origin: location.origin },
            events: {
              onReady: () => {
                if (dead) {
                  c.destroy();
                  return;
                }
                controller.current = c;
                load(c);
              },
              onStateChange: (e: any) => {
                if (!dead)
                  report(
                    (
                      {
                        1: t('components.Players.playing'),
                        2: t('components.Players.paused'),
                        0: t('components.Players.finished'),
                        3: t('components.Players.buffering'),
                        5: t('components.Players.readyToPlay'),
                      } as Record<number, string>
                    )[e.data] || t('components.Players.pressPlayInThePlayer'),
                    e.data === 1
                      ? 'playing'
                      : e.data === 3
                        ? 'loading'
                        : e.data === 0
                          ? 'stopped'
                          : 'paused',
                  );
              },
              onAutoplayBlocked: () => {
                if (!dead) report(t('components.Players.pressPlayInThePlayerTo'), 'paused');
              },
              onError: (e: any) => {
                if (!dead)
                  report(
                    [100, 101, 150].includes(e.data)
                      ? t('components.Players.thisVideoIsUnavailableOrDoes')
                      : e.data === 153
                        ? t('components.Players.youTubeCouldNotVerifyThePlayers')
                        : t('components.Players.couldNotPlayThisContentCheck'),
                    'error',
                  );
              },
            },
          });
          instance = c;
        })
        .catch((e) => {
          if (!dead) report(e.message, 'error');
        });
    } else {
      report(t('components.Players.thisCardHasNoSelectedSource'), 'error');
    }
    return () => {
      dead = true;
      clearPlaybackTimeout();
      try {
        instance?.destroy();
      } catch {}
      controller.current = null;
    };
  }, [source, hasCard]);
  useEffect(() => {
    if (controller.current && card) load(controller.current);
  }, [card]);
  useEffect(() => {
    if (!command || !controller.current) return;
    const c = controller.current;
    try {
      if (current.current.source === 'youtube') {
        if (command.type === 'resume') c.playVideo();
        else if (command.type === 'stop') c.stopVideo();
        else c.pauseVideo();
      } else {
        if (command.type === 'resume') c.resume();
        else c.pause();
      }
      report(
        command.type === 'resume'
          ? t('components.Players.resumingPlayback')
          : command.type === 'stop'
            ? t('components.Players.stopped')
            : t('components.Players.paused'),
        // Autoplay can be blocked. Only an SDK event confirms that sound is playing.
        command.type === 'stop' ? 'stopped' : 'paused',
      );
    } catch {
      report(t('components.Players.theCommandFailedUseThePlayers'), 'error');
    }
  }, [command]);
  return (
    <div className="embed" ref={container}>
      {!card && (
        <div className="player-empty">
          <span className="record">
            <i />
          </span>
          <p>
            {t('components.Players.yourNextSong')}
            <br />
            <strong>{t('components.Players.isWaitingForTheFirstScan')}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
