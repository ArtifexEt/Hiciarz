import { t, useTranslation } from './i18n';
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
  useTranslation();
  const progress = useSyncExternalStore(subscribe, () => current);
  if (!progress) return null;
  return (
    <section className="pdf-export" aria-label={t('components.PDFExportProgress.generatingPDF')}>
      <div className="pdf-export-heading">
        <LoaderCircle size={21} className="spin" aria-hidden="true" />
        <strong aria-live="polite">
          {progress.phase === 'preparing'
            ? t('components.PDFExportProgress.preparingThePrintLayout')
            : progress.phase === 'saving'
              ? t('components.PDFExportProgress.finishingThePDF')
              : t('components.PDFExportProgress.creatingYourCards')}
        </strong>
        <span>{progress.percent}%</span>
      </div>
      <progress
        aria-label={t('components.PDFExportProgress.pDFGenerationProgress')}
        max={100}
        value={progress.percent}
      />
      <div className="pdf-export-detail">
        <span>
          {t('components.PDFExportProgress.cardsReady')}{' '}
          <strong>
            {progress.completed} / {progress.total}
          </strong>
        </span>
        <button className="text-button" onClick={onCancel}>
          {t('components.PDFExportProgress.cancel')}
        </button>
      </div>
      <p>{t('components.PDFExportProgress.preparingBothSidesOfTheCards')}</p>
    </section>
  );
}
