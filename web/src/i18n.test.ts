import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTranslator,
  detectLanguage,
  displayTranslation,
  dictionaries,
  getLanguage,
  languageStorageKey,
  setLanguage,
  t,
} from './i18n';
import { cardQuestion, newDeck, themeNames, validateSong } from './model';

beforeEach(() => {
  vi.stubGlobal('localStorage', { setItem: vi.fn() });
  setLanguage('pl');
});
afterEach(() => {
  setLanguage('pl');
  vi.unstubAllGlobals();
});

describe('JSON translations', () => {
  it('keeps namespace keys unique so one JSON file cannot overwrite another', () => {
    const files = import.meta.glob<Record<string, string>>('./locales/*.json', {
      eager: true,
      import: 'default',
    });
    for (const language of ['pl', 'en']) {
      const seen = new Set<string>();
      for (const [path, messages] of Object.entries(files)) {
        if (!path.endsWith('/' + language + '.json') && !path.endsWith('.' + language + '.json'))
          continue;
        for (const key of Object.keys(messages)) {
          expect(seen.has(key), `${path}: duplicate key ${key}`).toBe(false);
          seen.add(key);
        }
      }
    }
  });

  it('ships matching Polish and English keys and interpolation parameters', () => {
    expect(Object.keys(dictionaries.pl).sort()).toEqual(Object.keys(dictionaries.en).sort());
    const placeholders = (value: string) =>
      [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    for (const [key, polish] of Object.entries(dictionaries.pl)) {
      expect(polish.trim(), key).not.toBe('');
      expect(dictionaries.en[key].trim(), key).not.toBe('');
      expect(placeholders(polish), key).toEqual(placeholders(dictionaries.en[key]));
    }
  });

  it('prefers a saved choice, then a supported browser language, then Polish', () => {
    expect(detectLanguage('en', ['pl-PL'])).toBe('en');
    expect(detectLanguage('invalid', ['de-DE', 'en-GB', 'pl'])).toBe('en');
    expect(detectLanguage(null, ['pl-PL', 'en'])).toBe('pl');
    expect(detectLanguage(null, ['de-DE'])).toBe('pl');
  });

  it('persists a choice and keeps working when browser storage is blocked', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    setLanguage('en');
    expect(setItem).toHaveBeenCalledWith(languageStorageKey, 'en');
    expect(getLanguage()).toBe('en');
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('Blocked');
      },
    });
    expect(() => setLanguage('pl')).not.toThrow();
    expect(getLanguage()).toBe('pl');
  });

  it('updates the document language, title and description with the selected language', () => {
    const description = { setAttribute: vi.fn() };
    const document = { documentElement: { lang: '' }, title: '', querySelector: () => description };
    vi.stubGlobal('document', document);
    setLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Hiciarz — music cards');
    expect(description.setAttribute).toHaveBeenCalledWith('content', t('document.description'));
    expect(t('app.title')).toBe('Title');
  });

  it('interpolates values and falls back to Polish for a missing English entry', () => {
    setLanguage('en');
    expect(t('model.row.year', { row: 7 })).toBe('Row 7: year must be a number from 1000 to 2100.');
    dictionaries.pl['test.onlyPolish'] = 'Próba {{value}}';
    try {
      expect(t('test.onlyPolish', { value: 3 })).toBe('Próba 3');
      expect(t('missing.key')).toBe('missing.key');
    } finally {
      delete dictionaries.pl['test.onlyPolish'];
    }
  });

  it('updates model labels and validation without changing existing deck data', () => {
    const deck = newDeck();
    expect(themeNames.fish).toBe('Rybki świąteczne');
    setLanguage('en');
    expect(themeNames.fish).toBe('Christmas fish');
    expect(cardQuestion('movie')).toBe('Film music');
    expect(() => validateSong(null, 1)).toThrow('Row 2: invalid record.');
    expect(newDeck().name).toBe('My new deck');
    expect(deck.name).toBe('Moja nowa talia');
  });

  it('keeps a captured translator in one language throughout an asynchronous export', () => {
    const translate = createTranslator();
    setLanguage('en');
    expect(translate('cards.game')).toBe('GRA');
    expect(t('cards.game')).toBe('GAME');
  });

  it('translates an existing status or validation error while preserving unknown text and data', () => {
    const status = t('connection.lost');
    const error = t('model.row.year', { row: 7 });
    const summary = t('app.exampleCreated', { name: 'Moja talia', count: 12 });
    setLanguage('en');
    expect(displayTranslation(status)).toBe(t('connection.lost'));
    expect(displayTranslation(error)).toBe('Row 7: year must be a number from 1000 to 2100.');
    expect(displayTranslation(summary)).toContain('Moja talia');
    expect(displayTranslation(summary)).toContain('12');
    expect(displayTranslation('Provider-specific error: 123')).toBe('Provider-specific error: 123');
    setLanguage('pl');
    expect(displayTranslation('Connection lost. Pair the devices again.')).toBe(status);
  });
});
