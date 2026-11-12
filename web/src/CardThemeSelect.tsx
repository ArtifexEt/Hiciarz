import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from './i18n';
import { themes, themeNames, type Theme } from './model';
import { themeArt } from './themes';
import './card-theme-select.css';

export default function CardThemeSelect({
  value,
  deckTheme,
  onChange,
  disabled = false,
}: {
  value: Theme | '';
  deckTheme: Theme;
  onChange: (value: Theme | '') => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const options = [
    { value: '' as const, theme: deckTheme, label: t('app.sameAsTheDeck') },
    ...themes.map((theme) => ({ value: theme, theme, label: themeNames[theme] })),
  ];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (!open) return;
    const document = root.current?.ownerDocument;
    if (!document) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function show() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter' || event.key === ' ') {
      if (open) choose(activeIndex);
      else show();
      return;
    }
    setOpen(true);
    if (event.key === 'Home') setActiveIndex(0);
    else if (event.key === 'End') setActiveIndex(options.length - 1);
    else {
      const current = open ? activeIndex : selectedIndex;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current + direction + options.length) % options.length);
    }
  }

  return (
    <div
      className="card-theme-select"
      ref={root}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <label id={id + '-label'} htmlFor={id + '-trigger'}>
        {t('app.cardTheme2')}
      </label>
      <input type="hidden" name="theme" value={value} disabled={disabled} />
      <button
        type="button"
        id={id + '-trigger'}
        ref={trigger}
        className="card-theme-trigger"
        role="combobox"
        aria-labelledby={id + '-label ' + id + '-value'}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id + '-options'}
        aria-activedescendant={open ? id + '-option-' + activeIndex : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={navigate}
      >
        <img src={themeArt(selected.theme)} alt="" aria-hidden="true" />
        <span id={id + '-value'}>{selected.label}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="card-theme-options"
          id={id + '-options'}
          role="listbox"
          aria-labelledby={id + '-label'}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              id={id + '-option-' + index}
              className={'card-theme-option' + (index === activeIndex ? ' is-active' : '')}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <img src={themeArt(option.theme)} alt="" aria-hidden="true" loading="lazy" />
              <span>{option.label}</span>
              {option.value === value && <Check size={18} aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
