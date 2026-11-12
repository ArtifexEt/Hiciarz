import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import AppNavigation from './AppNavigation';
import { setLanguage, t } from './i18n';
import type { AppView } from './navigation';

const noop = () => {};
function render(current: AppView, playbackOpen = false, menuOpen = false) {
  return renderToStaticMarkup(
    <AppNavigation
      current={current}
      playbackOpen={playbackOpen}
      menuOpen={menuOpen}
      onChoose={noop}
      onPlayback={noop}
      onMenu={noop}
      onSettings={noop}
      onHelp={noop}
    />,
  );
}
function buttons(markup: string) {
  return [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(
    ([, attributes, content]) => ({ attributes, text: content.replace(/<[^>]*>/g, '').trim() }),
  );
}
function mobileButtons(markup: string) {
  const navigation = [...markup.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)].at(-1)![1];
  return buttons(navigation);
}

afterEach(() => setLanguage('pl'));

describe('persistent app navigation', () => {
  it('keeps scanner, decks and sound available beside the external Bingo link', () => {
    setLanguage('pl');
    const controls = mobileButtons(render('scanner'));
    expect(controls.map((button) => button.text)).toEqual([
      'Skaner',
      'Talie',
      t('shell.sound'),
      'Więcej',
    ]);
    expect(controls[0].attributes).toContain('aria-current="page"');
    expect(controls[3].attributes).not.toContain('aria-current=');
    const links = [...render('scanner').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    expect(links).toHaveLength(2);
    for (const [, attributes, content] of links) {
      expect(attributes).toContain('href="https://artifexet.github.io/Bingo/?lang=pl"');
      expect(attributes).toContain('rel="noreferrer"');
      expect(attributes).not.toContain('aria-current=');
      expect(content).toContain('Bingo');
    }
  });

  it('exposes the same sound dialog action on desktop and mobile without treating it as a page', () => {
    setLanguage('en');
    const sound = buttons(render('scanner', true)).filter(
      (button) => button.text === t('shell.sound'),
    );
    expect(sound).toHaveLength(2);
    for (const control of sound) {
      expect(control.attributes).toContain('aria-expanded="true"');
      expect(control.attributes).toContain('aria-haspopup="dialog"');
      expect(control.attributes).not.toContain('aria-current=');
    }
  });

  it('marks More as the current route only for the second-screen page', () => {
    setLanguage('en');
    const more = mobileButtons(render('player', false, true)).at(-1)!;
    expect(more.text).toBe('More');
    expect(more.attributes).toContain('aria-current="page"');
    expect(more.attributes).toContain('aria-expanded="true"');
    expect(more.attributes).toContain('aria-haspopup="dialog"');
    expect(mobileButtons(render('editor')).at(-1)!.attributes).not.toContain('aria-current=');
  });
});
