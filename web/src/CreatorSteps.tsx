import { Check, ChevronRight } from 'lucide-react';
import { useTranslation } from './i18n';

export const creatorSteps = ['songs', 'design', 'print'] as const;
export type CreatorStep = (typeof creatorSteps)[number];

export default function CreatorSteps({
  current,
  hasSongs,
  onChange,
}: {
  current: CreatorStep;
  hasSongs: boolean;
  onChange: (step: CreatorStep) => void;
}) {
  const { t } = useTranslation();
  const index = creatorSteps.indexOf(current);
  return (
    <nav className="creator-steps" aria-label={t('creator.steps')} data-deck-settings>
      <ol>
        {creatorSteps.map((step, i) => (
          <li key={step}>
            <button
              type="button"
              id={'creator-step-' + step}
              aria-current={current === step ? 'step' : undefined}
              disabled={i > 0 && !hasSongs}
              onClick={() => onChange(step)}
            >
              <span className="creator-step-number" aria-hidden="true">
                {hasSongs && i < index ? <Check size={17} /> : i + 1}
              </span>
              <span>{t('creator.step.' + step)}</span>
            </button>
            {i < creatorSteps.length - 1 && <ChevronRight size={16} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
