import { useEffect, useRef } from 'react';
import type { Card } from './model';
import type { Command } from './connection';
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: any) => void;
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}
let spotifyApi: Promise<any> | undefined, youtubeApi: Promise<any> | undefined;
function spotify() {
  return (spotifyApi ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.onerror = () => {
      spotifyApi = undefined;
      reject(new Error('Nie można wczytać Spotify.'));
    };
    document.head.append(s);
  }));
}
function youtube() {
  return (youtubeApi ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      youtubeApi = undefined;
      reject(new Error('Nie można wczytać YouTube.'));
    };
    document.head.append(s);
  }));
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
  onState: (text: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    controller = useRef<any>(null),
    callback = useRef(onState),
    current = useRef({ card, source });
  callback.current = onState;
  current.current = { card, source };
  const hasCard = Boolean(card);
  function load(c: any) {
    const { card, source } = current.current;
    if (!card) return;
    const id = card.sources[source];
    if (!id) {
      callback.current('Ta karta nie ma wybranego źródła. Wybierz dostępne źródło.');
      return;
    }
    callback.current('Ładowanie utworu…');
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
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const mount = document.createElement('div');
    container.current.replaceChildren(mount);
    controller.current = null;
    callback.current('Ładowanie odtwarzacza…');
    timeout = setTimeout(() => {
      if (!dead)
        callback.current('Odtwarzacz nie odpowiada. Sprawdź internet albo wybierz inne źródło.');
    }, 20000);
    if (source === 'spotify' && current.current.card?.sources.spotify) {
      spotify()
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
                clearTimeout(timeout);
                if (dead) return;
                controller.current = c;
                callback.current('Gotowy. Jeśli muzyka nie ruszy, kliknij Odtwórz.');
                if (current.current.card?.sources.spotify !== initialId) load(c);
                else c.play();
              });
              c.addListener('playback_update', (e: any) => {
                if (!dead)
                  callback.current(
                    e.data.isBuffering
                      ? 'Buforowanie…'
                      : e.data.isPaused
                        ? 'Pauza / gotowy do odtwarzania'
                        : 'Odtwarzanie',
                  );
              });
            },
          );
        })
        .catch((e) => {
          if (!dead) callback.current(e.message);
        });
    } else if (source === 'youtube' && current.current.card?.sources.youtube) {
      youtube()
        .then((YT) => {
          if (dead) return;
          const c = new YT.Player(mount, {
            videoId: current.current.card?.sources.youtube,
            width: '100%',
            height: 352,
            playerVars: { autoplay: 1, playsinline: 1, origin: location.origin },
            events: {
              onReady: () => {
                clearTimeout(timeout);
                if (dead) {
                  c.destroy();
                  return;
                }
                controller.current = c;
                load(c);
              },
              onStateChange: (e: any) => {
                if (!dead)
                  callback.current(
                    (
                      {
                        1: 'Odtwarzanie',
                        2: 'Pauza',
                        0: 'Zakończono',
                        3: 'Buforowanie…',
                        5: 'Gotowy do odtwarzania',
                      } as Record<number, string>
                    )[e.data] || 'Kliknij Odtwórz w odtwarzaczu.',
                  );
              },
              onAutoplayBlocked: () => {
                if (!dead) callback.current('Kliknij Odtwórz na laptopie, aby zezwolić na dźwięk.');
              },
              onError: (e: any) => {
                clearTimeout(timeout);
                if (!dead)
                  callback.current(
                    [100, 101, 150].includes(e.data)
                      ? 'Materiał jest niedostępny lub nie pozwala na osadzanie. Wybierz inne źródło albo popraw kartę i wydrukuj ją ponownie.'
                      : e.data === 153
                        ? 'YouTube nie potwierdził strony odtwarzacza. Odśwież stronę i sprawdź blokady prywatności.'
                        : 'Nie udało się odtworzyć materiału. Sprawdź połączenie lub wybierz inne źródło.',
                  );
              },
            },
          });
          instance = c;
        })
        .catch((e) => {
          if (!dead) callback.current(e.message);
        });
    } else {
      clearTimeout(timeout);
      callback.current('Ta karta nie ma wybranego źródła. Wybierz dostępne źródło.');
    }
    return () => {
      dead = true;
      clearTimeout(timeout);
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
      if (command.type === 'stop') callback.current('Zatrzymano');
    } catch {
      callback.current('Polecenie nie zostało wykonane. Użyj przycisków odtwarzacza.');
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
            Twoja następna piosenka
            <br />
            <strong>czeka na pierwszy skan.</strong>
          </p>
        </div>
      )}
    </div>
  );
}
