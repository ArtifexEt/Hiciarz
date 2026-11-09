import { ArrowRight, Headphones, LayoutGrid, Music2, ScanLine, Sparkles } from 'lucide-react';

export default function Landing({
  onChoose,
}: {
  onChoose: (mode: 'editor' | 'scanner' | 'player') => void;
}) {
  return (
    <div className="landing">
      <section className="landing-hero">
        <span className="landing-mark" aria-hidden="true">
          <Music2 size={30} />
        </span>
        <p className="eyebrow">HICIARZ · MUZYKA NAS ŁĄCZY</p>
        <h1>
          Dobry wieczór.
          <br />
          Od czego zaczynamy?
        </h1>
        <p>Masz już karty? Skanuj i słuchaj. Chcesz własną talię? Przygotuj ją w kreatorze.</p>
      </section>
      <div className="landing-choices">
        <button className="landing-choice choice-play" onClick={() => onChoose('scanner')}>
          <span className="choice-icon">
            <ScanLine size={32} />
          </span>
          <span className="choice-copy">
            <small>MAM KARTY · CHCĘ GRAĆ</small>
            <strong>Skanuj i graj</strong>
            <span>Połącz muzykę, włącz aparat i zeskanuj QR z karty.</span>
          </span>
          <span className="choice-action">
            Otwórz skaner <ArrowRight size={18} />
          </span>
        </button>
        <button className="landing-choice choice-create" onClick={() => onChoose('editor')}>
          <span className="choice-icon">
            <LayoutGrid size={32} />
          </span>
          <span className="choice-copy">
            <small>CHCĘ PRZYGOTOWAĆ TALIĘ</small>
            <strong>Twórz karty</strong>
            <span>Wybierz piosenki, nadaj im styl i wydrukuj gotową talię.</span>
          </span>
          <span className="choice-action">
            Otwórz kreator <ArrowRight size={18} />
          </span>
        </button>
      </div>
      <section className="landing-how" aria-labelledby="landing-how-title">
        <h2 id="landing-how-title">Jak to działa?</h2>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Przygotuj karty</strong>
              <p>Skorzystaj z gotowego przykładu lub wydrukuj własne piosenki z kreatora.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Zeskanuj i posłuchaj</strong>
              <p>
                Kod QR uruchamia nagranie. Telefon może sterować Twoim Spotify lub osobnym
                odtwarzaczem.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Zgadnij rok</strong>
              <p>Ułóż piosenkę na osi czasu. Odwróć kartę i sprawdź rok, wykonawcę i tytuł.</p>
            </div>
          </li>
        </ol>
      </section>
      <div className="landing-secondary">
        <Headphones size={21} />
        <div>
          <strong>Telefon skanuje, drugi ekran gra?</strong>
          <p>Otwórz tutaj odtwarzacz i połącz go z telefonem przez QR.</p>
        </div>
        <button className="secondary" onClick={() => onChoose('player')}>
          Otwórz odtwarzacz <ArrowRight size={16} />
        </button>
      </div>
      <p className="landing-footnote">
        <Sparkles size={16} /> Kreator i przykłady działają bez logowania. Konto Spotify połączysz
        dopiero, gdy wybierzesz import lub granie przez Spotify.
      </p>
    </div>
  );
}
