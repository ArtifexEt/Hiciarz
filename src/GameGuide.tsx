import { useState } from 'react';
import { ArrowUpRight, Monitor, Radio, ScanLine, Smartphone } from 'lucide-react';
import { spotifyConfigured } from './spotify';

export function GameGuide({ onStart }: { onStart: (route: 'spotify' | 'laptop') => void }) {
  const [route, setRoute] = useState<'spotify' | 'laptop'>(
    spotifyConfigured() ? 'spotify' : 'laptop',
  );
  const laptop = route === 'laptop';
  const steps = laptop
    ? [
        [
          'Uruchom odtwarzacz',
          'Na urządzeniu, które ma odtwarzać muzykę, otwórz Odtwarzacz → Na tym urządzeniu → Połącz skaner. Pojawi się kod QR.',
        ],
        [
          'Połącz skaner',
          'Na drugim urządzeniu otwórz Skaner kart → Zdalny odtwarzacz → Włącz aparat. Zeskanuj kod z ekranu odtwarzacza.',
        ],
        [
          'Zeskanuj kartę',
          'Skanuj kody QR z kart. Muzyka uruchomi się na połączonym odtwarzaczu. Jeśli przeglądarka poprosi o zgodę na dźwięk, kliknij odtwarzanie na jego ekranie.',
        ],
      ]
    : [
        [
          'Przygotuj Spotify',
          'Otwórz Spotify na wybranym urządzeniu i uruchom dowolny utwór, żeby pojawiło się na liście.',
        ],
        [
          'Połącz konto',
          'Wybierz Graj przez Spotify, zaloguj się i wskaż urządzenie, na którym ma grać muzyka.',
        ],
        [
          'Zeskanuj kartę',
          'Włącz aparat i zeskanuj QR z karty. Utwór zagra na wybranym urządzeniu Spotify. Skanerem i odtwarzaczem może być to samo urządzenie.',
        ],
      ];
  return (
    <section className="game-guide" aria-labelledby="game-guide-title">
      <div className="game-guide-heading">
        <div>
          <span className="eyebrow">PIERWSZY RAZ? ZACZNIJ TUTAJ</span>
          <h2 id="game-guide-title">Skanuj karty. Odkrywaj muzykę.</h2>
          <p>Przygotuj i wydrukuj talię w kreatorze poniżej. Potem wybierz, jak chcesz słuchać.</p>
        </div>
        <div className="guide-device-art" aria-hidden="true">
          <Smartphone size={29} />
          <span>→</span>
          {laptop ? <Monitor size={37} /> : <Radio size={37} />}
        </div>
      </div>
      <div className="guide-tabs" role="tablist" aria-label="Instrukcja odtwarzania">
        <button
          id="guide-laptop"
          role="tab"
          aria-selected={laptop}
          aria-controls="guide-steps"
          onClick={() => setRoute('laptop')}
        >
          <Monitor size={17} /> Przez odtwarzacz · Spotify / YouTube
        </button>
        <button
          id="guide-spotify"
          role="tab"
          aria-selected={!laptop}
          aria-controls="guide-steps"
          onClick={() => setRoute('spotify')}
        >
          <Radio size={17} /> Bezpośrednio w Spotify
        </button>
      </div>
      <div
        id="guide-steps"
        role="tabpanel"
        aria-labelledby={laptop ? 'guide-laptop' : 'guide-spotify'}
      >
        <ol className="guide-steps">
          {steps.map(([title, description], index) => (
            <li key={title}>
              <span className="guide-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        <div className="guide-bottom">
          <p>
            {laptop
              ? 'Dźwięk odtwarza połączone urządzenie. Jeśli chcesz użyć zewnętrznego głośnika, połącz go z tym urządzeniem w jego ustawieniach dźwięku.'
              : 'Potrzebujesz Spotify Premium i kart ze źródłem Spotify. Wybierz swój odtwarzacz z listy — kolejne karty będą grały właśnie tam.'}
          </p>
          <button className="secondary" onClick={() => onStart(route)}>
            {laptop ? <Monitor size={17} /> : <ScanLine size={17} />}
            {laptop ? 'Otwórz odtwarzacz' : 'Otwórz skaner Spotify'}
            <ArrowUpRight size={16} />
          </button>
        </div>
        {laptop && (
          <p className="guide-note">
            Spotify na stronie może odtworzyć tylko podgląd utworu. Do pełnego odtwarzania przez
            konto Premium wybierz „Bezpośrednio w Spotify”. YouTube wymaga nagrania dostępnego do
            odtworzenia na stronie.
          </p>
        )}
      </div>
    </section>
  );
}
