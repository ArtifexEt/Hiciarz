import { displayTranslation, t, useTranslation } from './i18n';
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
  useTranslation();
  const sheets = Math.ceil(count / 12);
  return (
    <div className="print-cards-guide">
      <div className="print-job-summary">
        <Printer size={24} aria-hidden="true" />
        <div>
          <strong>
            {selected
              ? t('components.PrintCards.selectedCards')
              : t('components.PrintCards.entireDeck')}
            : {count}
          </strong>
          <p>{t('uiPrint.summary', { sheets, pages: sheets * 2 })}</p>
        </div>
      </div>
      <dl className="print-settings-summary">
        <div>
          <dt>{t('uiPrint.paper')}</dt>
          <dd>A4</dd>
        </div>
        <div>
          <dt>{t('uiPrint.sides')}</dt>
          <dd>{t(settings.edge === 'long' ? 'uiPrint.duplexLong' : 'uiPrint.duplexShort')}</dd>
        </div>
        <div>
          <dt>{t('uiPrint.scale')}</dt>
          <dd>{t('uiPrint.actualSize')}</dd>
        </div>
      </dl>
      {error && (
        <p className="error" role="alert">
          {displayTranslation(error)}
        </p>
      )}
      <div className="print-guide-actions">
        <button className="primary" disabled={!count} onClick={onDownload}>
          <Download size={19} aria-hidden="true" /> {t('components.PrintCards.downloadPDF')}
        </button>
        <button className="secondary" disabled={!count} onClick={onPreview}>
          <Printer size={19} aria-hidden="true" /> {t('components.PrintCards.openPDFForPrinting')}{' '}
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      </div>
      <p className="print-guide-footnote">{t('uiPrint.previewHint')}</p>
      <details className="print-calibration">
        <summary>{t('uiPrint.testPrint')}</summary>
        <p>{t('uiPrint.calibrationHelp')}</p>
        <button className="print-settings-link" onClick={onSettings}>
          <Settings2 size={17} aria-hidden="true" />
          {t('components.PrintCards.printSettingsAndTestPrint')}
        </button>
      </details>
    </div>
  );
}
