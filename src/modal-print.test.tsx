import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import Modal from './Modal';
import PrintCards from './PrintCards';
import { setLanguage } from './i18n';
import { defaultPrint } from './model';

const noop = () => {};
afterEach(() => setLanguage('pl'));

describe('dialog and print flow', () => {
  it('names the native modal from its visible heading and exposes a translated close control', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(
      <Modal title="Add a game card" onClose={noop}>
        <label>
          Game title
          <input name="answer" />
        </label>
      </Modal>,
    );
    const name = markup.match(/<dialog[^>]*aria-labelledby="([^"]+)"/)?.[1];
    expect(name).toBeTruthy();
    expect(markup).toContain(`<h2 id="${name}">Add a game card</h2>`);
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/<button[^>]*type="button"[^>]*aria-label="Close"/);
    expect(markup).toContain('class="modal-body"');
    expect(markup).toContain('name="answer"');
  });

  it('summarizes a partial final sheet and selected duplex edge without blocking PDF actions on instructions', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(
      <PrintCards
        count={25}
        selected
        settings={{ ...defaultPrint, edge: 'short' }}
        error=""
        onDownload={noop}
        onPreview={noop}
        onSettings={noop}
      />,
    );
    expect(markup).toContain('A4 sheets: 3 · PDF pages: 6');
    expect(markup).toContain('Double-sided · flip on the short edge');
    expect(markup).toContain('100%, without fitting to page');
    expect(markup.indexOf('Download PDF')).toBeLessThan(markup.indexOf('<details'));
    expect(markup).toContain('<summary>Test print and calibration</summary>');
    expect(markup).not.toMatch(/<details[^>]*\bopen=/);
    expect(markup).not.toContain('print-guide-steps');
  });

  it('keeps an export error visible and disables both PDF actions for an empty deck', () => {
    setLanguage('pl');
    const markup = renderToStaticMarkup(
      <PrintCards
        count={0}
        selected={false}
        settings={defaultPrint}
        error="Nie można otworzyć pliku."
        onDownload={noop}
        onPreview={noop}
        onSettings={noop}
      />,
    );
    expect(markup).toContain('role="alert">Nie można otworzyć pliku.');
    expect(markup.match(/<button[^>]*disabled=/g)).toHaveLength(2);
    expect(markup).not.toMatch(/(?:uiPrint|components)\.[A-Za-z]/);
  });
});
