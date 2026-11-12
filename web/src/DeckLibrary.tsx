import { Music2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from './i18n';
import type { Deck } from './model';
import './deck-library.css';

export default function DeckLibrary({
  decks,
  activeId,
  disabled = false,
  appearance = 'sidebar',
  onChoose,
  onCreate,
  onDelete,
  focusDeckId,
}: {
  decks: Deck[];
  activeId: string;
  disabled?: boolean;
  appearance?: 'sidebar' | 'dialog';
  onChoose: (id: string) => void;
  onCreate: () => void;
  onDelete?: (id: string) => void;
  focusDeckId?: string;
}) {
  const { t } = useTranslation();
  const sidebar = appearance === 'sidebar';
  const canDelete = !sidebar && Boolean(onDelete);
  const createButton = (
    <button
      type="button"
      className={'deck-library-create' + (sidebar ? '' : ' secondary')}
      aria-label={t('shell.newDeck')}
      title={sidebar ? t('shell.newDeck') : undefined}
      disabled={disabled}
      onClick={onCreate}
    >
      <Plus size={18} aria-hidden="true" />
      {!sidebar && t('shell.newDeck')}
    </button>
  );

  return (
    <section
      className={'deck-library deck-library--' + appearance}
      aria-label={t('shell.deckLibrary')}
    >
      {sidebar && (
        <div className="deck-library-heading">
          <h2>{t('shell.deckLibrary')}</h2>
          {createButton}
        </div>
      )}
      <ul className="deck-library-list">
        {decks.map((deck) => {
          const name = deck.name.trim() || t('model.newDeck');
          return (
            <li key={deck.id} className={canDelete ? 'deck-library-row' : undefined}>
              <button
                type="button"
                className="deck-library-item"
                aria-current={deck.id === activeId ? 'true' : undefined}
                disabled={disabled}
                autoFocus={!sidebar && deck.id === focusDeckId}
                title={name}
                onClick={() => onChoose(deck.id)}
              >
                <Music2 size={18} aria-hidden="true" />
                <span className="deck-library-name">{name}</span>
                <span
                  className="deck-library-count"
                  aria-label={t('shell.cardCount', { count: deck.songs.length })}
                >
                  {deck.songs.length}
                </span>
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="deck-library-delete"
                  aria-label={t('deckLibrary.deleteNamed', { name })}
                  title={t('deckLibrary.deleteNamed', { name })}
                  disabled={disabled}
                  onClick={() => onDelete?.(deck.id)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!sidebar && createButton}
    </section>
  );
}
