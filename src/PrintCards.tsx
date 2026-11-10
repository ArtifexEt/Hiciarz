import { ArrowUpRight, Download, Printer, Settings2 } from 'lucide-react';
import type { PrintSettings } from './model';
import './print-cards.css';

export default function PrintCards({
  count,
  selected,
  settings,
  error,
  onDownload,
  onPreview,
  onSettings,
}: {
  count: number;
  selected: boolean;
  settings: PrintSettings;
  error: string;
  onDownload: () => void;
  onPreview: () => void;
  onSettings: () => void;
}) {
  const sheets = Math.ceil(count / 12);
  return (
    <div className="print-cards-guide">
      <p className="print-job-summary">
        <Printer size={20} aria-hidden="true" />
        <span>
          <strong>
            {selected ? 'Wybrane karty' : 'Cała talia'}: {count}
          </strong>
          <small>
            {sheets} ark. A4 · {sheets * 2} str. PDF · karty 60 × 60 mm
          </small>
        </span>
      </p>
      <p className="print-guide-lead">
        PDF zawiera obie strony kart, ułożone do druku dwustronnego.
      </p>
      <ol className="print-guide-steps">
        <li>
          <span aria-hidden="true">1</span>
          <div>
            <strong>Pobierz lub otwórz PDF</strong>
            <p>
              Zapisz plik na później albo otwórz go teraz. W podglądzie PDF wybierz ikonę drukarki
              lub polecenie „Drukuj”.
            </p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">2</span>
          <div>
            <strong>Wydrukuj obie strony</strong>
            <p>
              Papier <b>A4</b>, skala <b>100% / rozmiar rzeczywisty</b>. Druk dwustronny z obrotem
              po <b>{settings.edge === 'long' ? 'długiej' : 'krótkiej'} krawędzi</b>. Wyłącz
              dopasowanie do strony.
            </p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">3</span>
          <div>
            <strong>Wytnij karty i graj</strong>
            <p>
              Po jednej stronie będzie odpowiedź, po drugiej kod QR. Wytnij karty wzdłuż ich
              krawędzi i przygotuj skaner.
            </p>
          </div>
        </li>
      </ol>
      <button className="print-settings-link" onClick={onSettings}>
        <Settings2 size={16} /> Ustawienia druku i wydruk próbny
      </button>
      <div className="print-guide-actions">
        <button className="primary" disabled={!count} onClick={onDownload}>
          <Download size={19} /> Pobierz PDF
        </button>
        <button className="secondary" disabled={!count} onClick={onPreview}>
          <Printer size={19} /> Otwórz PDF do druku <ArrowUpRight size={15} />
        </button>
      </div>
      <p className="print-guide-footnote">
        Podgląd otworzy się w nowej karcie. Drukarkę wybierzesz w oknie drukowania.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
