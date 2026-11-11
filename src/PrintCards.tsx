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
      <p className="print-job-summary">
        <Printer size={20} aria-hidden="true" />
        <span>
          <strong>
            {selected
              ? t('components.PrintCards.selectedCards')
              : t('components.PrintCards.entireDeck')}
            : {count}
          </strong>
          <small>
            {sheets} {t('components.PrintCards.a4Sheets')} {sheets * 2}{' '}
            {t('components.PrintCards.pDFPages6060MmCards')}
          </small>
        </span>
      </p>
      <p className="print-guide-lead">{t('components.PrintCards.thePDFContainsBothSidesOf')}</p>
      <ol className="print-guide-steps">
        <li>
          <span aria-hidden="true">1</span>
          <div>
            <strong>{t('components.PrintCards.downloadOrOpenThePDF')}</strong>
            <p>{t('components.PrintCards.saveTheFileForLaterOr')}</p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">2</span>
          <div>
            <strong>{t('components.PrintCards.printBothSides')}</strong>
            <p>
              {t('components.PrintCards.paper')} <b>A4</b>
              {t('components.PrintCards.scale')} <b>{t('components.PrintCards.100ActualSize')}</b>
              {t('components.PrintCards.doublesidedPrintingFlipOnThe')}{' '}
              <b>
                {settings.edge === 'long'
                  ? t('components.PrintCards.long')
                  : t('components.PrintCards.short')}{' '}
                {t('components.PrintCards.edge')}
              </b>
              {t('components.PrintCards.turnOffFitToPage')}
            </p>
          </div>
        </li>
        <li>
          <span aria-hidden="true">3</span>
          <div>
            <strong>{t('components.PrintCards.cutOutTheCardsAndPlay')}</strong>
            <p>{t('components.PrintCards.theAnswerIsOnOneSide')}</p>
          </div>
        </li>
      </ol>
      <button className="print-settings-link" onClick={onSettings}>
        <Settings2 size={16} /> {t('components.PrintCards.printSettingsAndTestPrint')}
      </button>
      <div className="print-guide-actions">
        <button className="primary" disabled={!count} onClick={onDownload}>
          <Download size={19} /> {t('components.PrintCards.downloadPDF')}
        </button>
        <button className="secondary" disabled={!count} onClick={onPreview}>
          <Printer size={19} /> {t('components.PrintCards.openPDFForPrinting')}{' '}
          <ArrowUpRight size={15} />
        </button>
      </div>
      <p className="print-guide-footnote">{t('components.PrintCards.thePreviewOpensInANew')}</p>
      {error && (
        <p className="error" role="alert">
          {displayTranslation(error)}
        </p>
      )}
    </div>
  );
}
