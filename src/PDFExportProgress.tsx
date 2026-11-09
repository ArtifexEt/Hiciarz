import { useSyncExternalStore } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { PDFProgress } from './pdf';

let current: PDFProgress | undefined;
const listeners = new Set<() => void>();
export function setPDFProgress(next: PDFProgress | undefined) {
  current = next;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Progress updates render this small panel without rendering the entire song editor. */
export default function PDFExportProgress({ onCancel }: { onCancel: () => void }) {
  const progress = useSyncExternalStore(subscribe, () => current);
  if (!progress) return null;
  return (
    <section className="pdf-export" aria-label="Generowanie PDF">
      <div className="pdf-export-heading">
        <LoaderCircle size={21} className="spin" aria-hidden="true" />
        <strong aria-live="polite">
          {progress.phase === 'preparing'
            ? 'Przygotowuję wydruk…'
            : progress.phase === 'saving'
              ? 'Zapisuję plik PDF…'
              : 'Tworzę Twoje karty…'}
        </strong>
        <span>{progress.percent}%</span>
      </div>
      <progress aria-label="Postęp generowania PDF" max={100} value={progress.percent} />
      <div className="pdf-export-detail">
        <span>
          Gotowe karty:{' '}
          <strong>
            {progress.completed} / {progress.total}
          </strong>
        </span>
        <button className="text-button" onClick={onCancel}>
          Anuluj
        </button>
      </div>
      <p>Możesz dalej korzystać z aplikacji. Plik pobierze się po zakończeniu.</p>
    </section>
  );
}
