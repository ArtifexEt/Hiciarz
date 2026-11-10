import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  CircleHelp,
  Disc3,
  Download,
  LoaderCircle,
  Printer,
  ScanLine,
  Shuffle,
} from 'lucide-react';
import {
  bingoCategories,
  bingoColors,
  bingoLevels,
  randomBingoCategory,
  type BingoLevel,
} from './bingo';
import { preparePDFPreview } from './pdf-preview';
import './bingo.css';

export default function BingoGame({ onScanner }: { onScanner: () => void }) {
  const [level, setLevel] = useState<BingoLevel>('beginner');
  const [selected, setSelected] = useState<number>();
  const [draws, setDraws] = useState(0);
  const [count, setCount] = useState(4);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const category = selected === undefined ? undefined : bingoCategories[level][selected];
  const color = selected === undefined ? undefined : bingoColors[selected];
  function draw() {
    try {
      setSelected(randomBingoCategory());
      setDraws((n) => n + 1);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function print(preview = false) {
    if (busy) return;
    setError('');
    const controller = new AbortController();
    const viewer = preview ? preparePDFPreview(() => controller.abort()) : null;
    if (preview && !viewer) {
      setError('Nie udało się otworzyć podglądu. Pobierz PDF i otwórz go do druku.');
      return;
    }
    setBusy(true);
    try {
      const { buildBingoPDF } = await import('./bingo-pdf');
      const doc = await buildBingoPDF(level, count, crypto.randomUUID(), {
        signal: controller.signal,
        onProgress: (completed) =>
          viewer?.update({
            phase: 'backs',
            completed,
            total: count,
            percent: Math.floor((completed / count) * 95),
          }),
      });
      if (viewer) viewer.show(doc.output('blob'));
      else await doc.save('hiciarz-bingo-plansze.pdf', { returnPromise: true });
    } catch (e) {
      viewer?.close();
      setError(
        controller.signal.aborted ? 'Anulowano przygotowanie plansz.' : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bingo-shell" aria-label="Muzyczne Bingo">
      <header className="bingo-heading">
        <span className="eyebrow">MUZYCZNE BINGO</span>
        <h1>
          Jaka zagadka
          <br />
          będzie następna?
        </h1>
        <p>Wylosujcie pytanie, posłuchajcie utworu i sprawdźcie odpowiedzi na odwrocie karty.</p>
      </header>
      <div className="bingo-draw-panel">
        <label className="bingo-level">
          Poziom pytań
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as BingoLevel);
              setSelected(undefined);
              setDraws(0);
            }}
          >
            {Object.entries(bingoLevels).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div
          className={'bingo-question' + (category ? ' selected' : '')}
          style={
            color
              ? ({ '--question-fill': color.fill, '--question-ink': color.ink } as CSSProperties)
              : undefined
          }
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {category ? (
            <>
              <span className="bingo-category-number">
                Losowanie {draws} · Kategoria {selected! + 1}
              </span>
              <h2>{category.name}</h2>
              <p>{category.hint}</p>
            </>
          ) : (
            <>
              <Disc3 size={46} aria-hidden="true" />
              <h2>
                Pięć kategorii.
                <br />
                Jedno losowanie.
              </h2>
              <p>Naciśnij przycisk i przekonajcie się, co tym razem trzeba odgadnąć.</p>
            </>
          )}
        </div>
        <button className="primary bingo-draw-button" onClick={draw}>
          <Shuffle size={21} />
          {category ? 'Losuj kolejną zagadkę' : 'Losuj zagadkę'}
        </button>
        <button className="bingo-scanner-link" onClick={onScanner}>
          <ScanLine size={17} /> Przejdź do skanera kart <ArrowRight size={16} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <details className="bingo-details">
        <summary>
          <CircleHelp size={18} /> Jak grać?
        </summary>
        <p>
          Wylosujcie kategorię i zeskanujcie muzyczną kartę jak zwykle. Dajcie sobie 25 sekund na
          odpowiedź, a potem odwróćcie kartę. Trafienie pozwala zaznaczyć jedno wolne pole danej
          kategorii. Pełny rząd, kolumna lub przekątna daje Bingo.
        </p>
        <p>
          Na początkowym poziomie dokładny rok w kategoriach ±2 i ±4 daje dodatkowo możliwość
          usunięcia jednego krzyżyka przeciwnika. Każde losowanie jest niezależne, więc kategoria
          może się powtórzyć.
        </p>
      </details>
      <details className="bingo-details bingo-print">
        <summary>
          <Printer size={18} /> Plansze do druku
        </summary>
        <p>Po dwie różne plansze 5 × 5 na arkuszu A4, z numerami i kolorami kategorii.</p>
        <div className="bingo-print-row">
          <label>
            Liczba plansz
            <input
              type="number"
              min={1}
              max={24}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <span>
            Poziom: <strong>{bingoLevels[level]}</strong>
          </span>
        </div>
        <div className="bingo-print-actions">
          <button
            className="secondary"
            disabled={busy || !Number.isInteger(count) || count < 1 || count > 24}
            onClick={() => void print()}
          >
            {busy ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}{' '}
            {busy ? 'Przygotowuję plansze…' : 'Pobierz plansze PDF'}
          </button>
          <button
            className="quiet"
            disabled={busy || !Number.isInteger(count) || count < 1 || count > 24}
            onClick={() => void print(true)}
          >
            <Printer size={17} /> Otwórz do druku
          </button>
        </div>
        <p className="bingo-print-hint">Druk jednostronny · skala 100% · oszczędny kolor.</p>
      </details>
    </section>
  );
}
