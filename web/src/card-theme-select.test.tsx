import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import CardThemeSelect from './CardThemeSelect';
import { setLanguage } from './i18n';
import { themeArt } from './themes';

afterEach(() => setLanguage('pl'));
const noop = () => {};

describe('card theme selection', () => {
  it('previews the inherited deck theme and submits an empty override', () => {
    const markup = renderToStaticMarkup(
      <CardThemeSelect value="" deckTheme="fish" onChange={noop} />,
    );
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('Motyw karty');
    expect(markup).toContain('Jak cała talia');
    expect(markup).toContain(`src="${themeArt('fish')}"`);
    expect(markup).toMatch(/<input[^>]*type="hidden"[^>]*name="theme"[^>]*value=""/);
    expect(markup).not.toContain('role="listbox"');
  });

  it('previews and preserves a stored override in English when disabled', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(
      <CardThemeSelect value="winter" deckTheme="fish" onChange={noop} disabled />,
    );
    expect(markup).toContain('Winter tale');
    expect(markup).toContain('Card theme');
    expect(markup).toContain(`src="${themeArt('winter')}"`);
    const hidden = markup.match(/<input\b[^>]*type="hidden"[^>]*>/)?.[0];
    expect(hidden).toContain('name="theme"');
    expect(hidden).toContain('disabled=""');
    expect(hidden).toContain('value="winter"');
    expect(markup).toMatch(/<button[^>]*role="combobox"[^>]*disabled=""/);
  });
});
