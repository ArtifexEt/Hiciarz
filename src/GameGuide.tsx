import { useState } from 'react';
import { ArrowUpRight, Monitor, Radio, ScanLine, Smartphone } from 'lucide-react';

export function GameGuide({ onStart }: { onStart: (route: 'spotify' | 'laptop') => void }) {
  const [route, setRoute] = useState<'spotify' | 'laptop'>('laptop');
  const laptop = route === 'laptop';
  const steps = laptop
    ? [
        [
          'Na laptopie',
          'Otwórz Odtwarzacz, wybierz „Na tym komputerze” i kliknij „Połącz telefon”. Pojawi się kod QR.',
        ],
        [
          'Na telefonie',
          'Otwórz tę samą stronę → Skaner kart → Pilot laptopa → Włącz aparat. Zeskanuj kod parowania z ekranu laptopa.',
        ],
        [
          'Zeskanuj kartę',
          'Teraz skanuj QR z wydrukowanych kart. Piosenka uruchomi się na laptopie. Jeśli pojawi się prośba, kliknij odtwarzanie na jego ekranie.',
        ],
      ]
    : [
        [
          'Przygotuj Spotify',
          'Otwórz Spotify na wieży, komputerze lub telefonie i uruchom dowolny utwór, żeby urządzenie było dostępne.',
        ],
        [
          'Połącz konto',
          'Na telefonie otwórz Skaner kart → Spotify Connect. Zaloguj się do Spotify i wybierz urządzenie, na którym ma grać muzyka.',
        ],
        [
          'Zeskanuj kartę',
          'Włącz aparat i zeskanuj QR z wydrukowanej karty. Utwór zagra na wybranym urządzeniu Spotify. Laptop nie jest potrzebny.',
        ],
      ];
  return (
    <section className="game-guide" aria-labelledby="game-guide-title">
      <div className="game-guide-heading">
        <div>
          <span className="eyebrow">PIERWSZY RAZ? ZACZNIJ TUTAJ</span>
          <h2 id="game-guide-title">Telefon skanuje. Muzyka gra.</h2>
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
          <Monitor size={17} /> Przez laptop · Spotify / YouTube
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
              ? 'Chcesz słuchać na wieży? Wybierz wyjście dźwięku w systemie laptopa, np. AirPlay na Macu, Bluetooth lub kabel. Strona odtwarza muzykę, telefon działa jako pilot.'
              : 'Potrzebujesz Spotify Premium i karty ze źródłem Spotify. Jeśli logowanie nie jest jeszcze dostępne, wybierz wariant z laptopem.'}
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
