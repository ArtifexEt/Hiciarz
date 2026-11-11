import { useEffect, useId, useState } from 'react';
import { ChevronDown, Film, Gamepad2, Music2 } from 'lucide-react';
import { useTranslation } from './i18n';
import type { GameMode } from './model';

export default function GameModePicker({
  value,
  onChange,
  compact = false,
}: {
  value: GameMode;
  onChange: (mode: GameMode) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const name = useId();
  const [expanded, setExpanded] = useState(value !== 'music');
  useEffect(() => {
    if (value !== 'music') setExpanded(true);
  }, [value]);
  const option = (mode: GameMode) => {
    const Icon = mode === 'music' ? Music2 : mode === 'movie' ? Film : Gamepad2;
    return (
      <label className={'game-variant' + (value === mode ? ' is-selected' : '')}>
        <input
          type="radio"
          name={name}
          value={mode}
          checked={value === mode}
          onChange={() => onChange(mode)}
        />
        <Icon size={23} aria-hidden="true" />
        <span>
          <strong>{t('creator.variant.' + mode)}</strong>
          {!compact && <small>{t('creator.variantDescription.' + mode)}</small>}
        </span>
      </label>
    );
  };
  if (compact)
    return (
      <fieldset className="game-variants is-compact">
        <legend>{t('creator.whatAreWePlaying')}</legend>
        <div className="game-variation-options">
          {option('music')}
          {option('game')}
          {option('movie')}
        </div>
      </fieldset>
    );
  return (
    <fieldset className={'game-variants' + (compact ? ' is-compact' : '')}>
      <legend>{t('creator.whatAreWePlaying')}</legend>
      {option('music')}
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>
          <span>{t('creator.otherVariations')}</span>
          {!expanded && value !== 'music' && <strong>{t('creator.variant.' + value)}</strong>}
          <ChevronDown size={17} aria-hidden="true" />
        </summary>
        <div className="game-variation-options">
          {option('game')}
          {option('movie')}
        </div>
      </details>
    </fieldset>
  );
}
