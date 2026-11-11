import { displayTranslation, t, useTranslation } from './i18n';
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
  useTranslation();
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
      setError(t('components.BingoGame.couldNotOpenThePreviewDownload'));
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
        controller.signal.aborted
          ? t('components.BingoGame.boardPreparationCancelled')
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="bingo-shell" aria-label={t('components.BingoGame.musicBingo')}>
      <header className="bingo-heading">
        <span className="eyebrow">{t('components.BingoGame.mUSICBINGO')}</span>
        <h1>
          {t('components.BingoGame.whichChallenge')}
          <br />
          {t('components.BingoGame.comesNext')}
        </h1>
        <p>{t('components.BingoGame.drawAQuestionListenToThe')}</p>
      </header>
      <div className="bingo-draw-panel">
        <label className="bingo-level">
          {t('components.BingoGame.questionLevel')}
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
                {t('components.BingoGame.draw')} {draws} {t('components.BingoGame.category')}{' '}
                {selected! + 1}
              </span>
              <h2>{category.name}</h2>
              <p>{category.hint}</p>
            </>
          ) : (
            <>
              <Disc3 size={46} aria-hidden="true" />
              <h2>
                {t('components.BingoGame.fiveCategories')}
                <br />
                {t('components.BingoGame.oneDraw')}
              </h2>
              <p>{t('components.BingoGame.pressTheButtonToFindOut')}</p>
            </>
          )}
        </div>
        <button className="primary bingo-draw-button" onClick={draw}>
          <Shuffle size={21} />
          {category
            ? t('components.BingoGame.drawAnotherChallenge')
            : t('components.BingoGame.drawAChallenge')}
        </button>
        <button className="bingo-scanner-link" onClick={onScanner}>
          <ScanLine size={17} /> {t('components.BingoGame.goToTheCardScanner')}{' '}
          <ArrowRight size={16} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {displayTranslation(error)}
        </p>
      )}
      <details className="bingo-details">
        <summary>
          <CircleHelp size={18} /> {t('components.BingoGame.howToPlay')}
        </summary>
        <p>{t('components.BingoGame.drawACategoryAndScanA')}</p>
        <p>{t('components.BingoGame.atBeginnerLevelGuessingTheExact')}</p>
      </details>
      <details className="bingo-details bingo-print">
        <summary>
          <Printer size={18} /> {t('components.BingoGame.printableBoards')}
        </summary>
        <p>{t('components.BingoGame.twoDifferent55BoardsPer')}</p>
        <div className="bingo-print-row">
          <label>
            {t('components.BingoGame.numberOfBoards')}
            <input
              type="number"
              min={1}
              max={24}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <span>
            {t('components.BingoGame.level')} <strong>{bingoLevels[level]}</strong>
          </span>
        </div>
        <div className="bingo-print-actions">
          <button
            className="secondary"
            disabled={busy || !Number.isInteger(count) || count < 1 || count > 24}
            onClick={() => void print()}
          >
            {busy ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}{' '}
            {busy
              ? t('components.BingoGame.preparingBoards')
              : t('components.BingoGame.downloadBoardPDF')}
          </button>
          <button
            className="quiet"
            disabled={busy || !Number.isInteger(count) || count < 1 || count > 24}
            onClick={() => void print(true)}
          >
            <Printer size={17} /> {t('components.BingoGame.openForPrinting')}
          </button>
        </div>
        <p className="bingo-print-hint">
          {t('components.BingoGame.singlesidedPrinting100ScaleLightUse')}
        </p>
      </details>
    </section>
  );
}
