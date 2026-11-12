import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import DeckLibrary from './DeckLibrary';
import { setLanguage } from './i18n';
import { newDeck } from './model';

const noop = () => {};
const decks = [
  { ...newDeck(), id: 'first', name: 'First deck' },
  { ...newDeck(), id: 'second', name: 'Second deck' },
];

function render({
  appearance = 'dialog',
  disabled = false,
  deletable = true,
  focusDeckId,
}: {
  appearance?: 'sidebar' | 'dialog';
  disabled?: boolean;
  deletable?: boolean;
  focusDeckId?: string;
} = {}) {
  return renderToStaticMarkup(
    <DeckLibrary
      decks={decks}
      activeId="first"
      appearance={appearance}
      disabled={disabled}
      onChoose={noop}
      onCreate={noop}
      onDelete={deletable ? noop : undefined}
      focusDeckId={focusDeckId}
    />,
  );
}

function buttons(markup: string) {
  return [...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(
    ([, attributes, content]) => ({ attributes, text: content.replace(/<[^>]*>/g, '').trim() }),
  );
}
const rows = (markup: string) =>
  [...markup.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(([, row]) => row);

afterEach(() => setLanguage('pl'));

describe('deck library deletion controls', () => {
  it('offers separate named delete buttons for both the active and inactive decks', () => {
    setLanguage('pl');
    const deckRows = rows(render());
    expect(deckRows).toHaveLength(2);
    for (const [index, row] of deckRows.entries()) {
      const controls = buttons(row);
      // Two complete sibling buttons are required; nested buttons would not match separately.
      expect(controls).toHaveLength(2);
      expect(controls[0].attributes).toContain('class="deck-library-item"');
      expect(controls[1].attributes).toContain('class="deck-library-delete"');
      expect(controls[1].attributes).toContain(`aria-label="Usuń talię: ${decks[index].name}"`);
      expect(controls[1].attributes).toContain(`title="Usuń talię: ${decks[index].name}"`);
      expect(controls[1].attributes).toContain('type="button"');
      expect(controls[1].attributes).not.toContain('aria-current=');
      expect(controls[1].text).toBe('');
      expect(row.match(/<button\b/g)).toHaveLength(2);
    }
    expect(buttons(deckRows[0])[0].attributes).toContain('aria-current="true"');
    expect(buttons(deckRows[1])[0].attributes).not.toContain('aria-current=');
  });

  it('translates each delete name and tooltip into English', () => {
    setLanguage('en');
    const markup = render();
    expect(markup).toContain('aria-label="Delete deck: First deck"');
    expect(markup).toContain('title="Delete deck: Second deck"');
    expect(markup).not.toContain('deckLibrary.deleteNamed');
    expect(markup).not.toContain('Usuń talię');
  });

  it('does not add deletion controls to the sidebar even if a handler is supplied', () => {
    const markup = render({ appearance: 'sidebar', focusDeckId: 'second' });
    expect(markup).not.toContain('deck-library-delete');
    expect(rows(markup).every((row) => buttons(row).length === 1)).toBe(true);
    expect(markup).not.toContain('autofocus=');
  });

  it('keeps a dialog without a delete handler selectable without showing delete controls', () => {
    const markup = render({ deletable: false });
    expect(markup).not.toContain('deck-library-delete');
    expect(rows(markup).every((row) => buttons(row).length === 1)).toBe(true);
    expect(markup).toContain('deck-library-create');
  });

  it('disables selection, deletion and creation together while the library is busy', () => {
    const controls = buttons(render({ disabled: true }));
    expect(controls).toHaveLength(5);
    expect(controls.every((control) => control.attributes.includes('disabled='))).toBe(true);
  });

  it('returns focus to the requested deck selection button without focusing its delete action', () => {
    const controls = buttons(render({ focusDeckId: 'second' }));
    const focused = controls.filter((control) => control.attributes.includes('autofocus='));
    expect(focused).toHaveLength(1);
    expect(focused[0].attributes).toContain('class="deck-library-item"');
    expect(focused[0].attributes).toContain('title="Second deck"');
  });
});
