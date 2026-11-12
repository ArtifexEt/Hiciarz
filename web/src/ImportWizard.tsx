import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, ChevronRight, Copy, FileUp, LoaderCircle, Sparkles } from 'lucide-react';
import Modal from './Modal';
import PlaylistExamples from './PlaylistExamples';
import { useTranslation } from './i18n';
import type { GameMode } from './model';
import playlistPromptPl from '../docs/playlist-prompt.txt?raw';
import playlistPromptEn from '../docs/playlist-prompt.en.txt?raw';
import './import-wizard.css';

export type ImportStep = 'choose' | 'file' | 'ai' | 'examples';

type ImportFileHandler = (file: File) => Promise<string | undefined>;

function ImportFilePicker({ onFile }: { onFile: ImportFileHandler }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function read(file: File) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setError((await onFile(file)) || '');
    } catch (error) {
      setError(error instanceof Error ? error.message : t('importWizard.fileError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-file-picker">
      <div
        className={'import-file-drop' + (dragging ? ' is-dragging' : '')}
        aria-busy={busy}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
          if (!busy) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void read(file);
        }}
      >
        {busy ? (
          <LoaderCircle size={28} className="spin" aria-hidden="true" />
        ) : (
          <FileUp size={28} aria-hidden="true" />
        )}
        <strong>{t(busy ? 'importWizard.reading' : 'importWizard.dropFile')}</strong>
        <span>{t('importWizard.formats')}</span>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {t('importWizard.chooseFile')}
        </button>
        <input
          ref={input}
          hidden
          type="file"
          aria-label={t('importWizard.chooseFile')}
          accept=".json,.csv,application/json,text/csv"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void read(file);
          }}
        />
      </div>
      {error && (
        <p className="error import-file-error" role="alert">
          {error}
        </p>
      )}
      <p className="import-file-note">{t('importWizard.confirmNext')}</p>
    </div>
  );
}

function AIPreparation({ onFile }: { onFile: ImportFileHandler }) {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const prompt = language === 'en' ? playlistPromptEn : playlistPromptPl;

  return (
    <div className="import-ai">
      <ol className="import-ai-steps">
        <li>
          <div>
            <strong>{t('importWizard.aiStep1')}</strong>
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(prompt);
                  setCopied(true);
                } catch {
                  setShowPrompt(true);
                }
              }}
            >
              {copied ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Copy size={17} aria-hidden="true" />
              )}
              {t(copied ? 'importWizard.copied' : 'importWizard.copyPrompt')}
            </button>
            <span className="sr-only" role="status">
              {copied ? t('importWizard.copied') : ''}
            </span>
            {showPrompt && (
              <label className="import-prompt-label">
                {t('importWizard.copyManually')}
                <textarea
                  rows={7}
                  readOnly
                  value={prompt}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            )}
          </div>
        </li>
        <li>
          <div>
            <strong>{t('importWizard.aiStep2')}</strong>
            <p>{t('importWizard.aiStep2Hint')}</p>
          </div>
        </li>
        <li>
          <div>
            <strong>{t('importWizard.aiStep3')}</strong>
            <p>{t('importWizard.aiStep3Hint')}</p>
          </div>
        </li>
      </ol>
      <ImportFilePicker onFile={onFile} />
    </div>
  );
}

export default function ImportWizard({
  step,
  onStep,
  gameMode,
  onClose,
  onFile,
  onChooseExample,
  confirmation,
}: {
  step: ImportStep;
  onStep: (step: ImportStep) => void;
  gameMode: GameMode;
  onClose: () => void;
  onFile: ImportFileHandler;
  onChooseExample: (id: string, destination: 'new' | 'append') => void;
  confirmation?: ReactNode;
}) {
  const { t } = useTranslation();
  const content = useRef<HTMLDivElement>(null);
  const hasConfirmation = Boolean(confirmation);
  useEffect(() => {
    // Let Modal capture the original opener before moving focus within the wizard.
    const frame = requestAnimationFrame(() => {
      const current = content.current;
      if (!current) return;
      const body = current.closest<HTMLElement>('.modal-body');
      if (body) body.scrollTop = 0;
      const target = hasConfirmation
        ? current.querySelector<HTMLElement>('input:checked') ||
          current.querySelector<HTMLElement>('input:not([type="file"]), button')
        : current.querySelector<HTMLElement>(
            step === 'choose' ? '.import-method' : '.import-step-title',
          );
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, hasConfirmation]);
  return (
    <Modal title={t(confirmation ? 'app.importFile' : 'importWizard.title')} onClose={onClose}>
      <div className="import-wizard" ref={content}>
        {confirmation ? (
          confirmation
        ) : step === 'choose' ? (
          <>
            <p className="import-intro">{t('importWizard.description')}</p>
            <div className="import-methods">
              {(
                [
                  ['file', FileUp],
                  ['examples', Sparkles],
                  ['ai', Copy],
                ] as const
              ).map(([method, Icon]) => (
                <button
                  key={method}
                  type="button"
                  className="import-method"
                  onClick={() => onStep(method)}
                >
                  <span className="import-method-icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <span className="import-method-copy">
                    <strong>{t('importWizard.' + method + 'Title')}</strong>
                    <small>{t('importWizard.' + method + 'Description')}</small>
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="import-back" onClick={() => onStep('choose')}>
              <ArrowLeft size={16} aria-hidden="true" /> {t('importWizard.back')}
            </button>
            <h3 className="import-step-title" tabIndex={-1}>
              {t('importWizard.' + step + 'Title')}
            </h3>
            {step === 'file' && (
              <>
                <p className="import-intro">{t('importWizard.fileIntro')}</p>
                <ImportFilePicker onFile={onFile} />
              </>
            )}
            {step === 'ai' && <AIPreparation onFile={onFile} />}
            {step === 'examples' && (
              <PlaylistExamples
                initialMode={gameMode}
                currentMode={gameMode}
                onChoose={onChooseExample}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
