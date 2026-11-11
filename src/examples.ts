import { t as translate } from './i18n';
import { validateDeck, type Deck, type GameMode } from './model';

export type ExamplePlaylist = {
  id: string;
  description: string;
  sourceUrl: string;
  sourceName: string;
  sourceOwner: string;
  snapshotDate: string;
  yearNote: string;
  category?: 'music' | 'games';
  sourceType?: 'playlist' | 'curated';
  deck: Deck;
};

// These JSON projects are bundled with the app, including its offline cache.
const files = import.meta.glob('../examples/playlists/*.json', { eager: true, import: 'default' });
export const examplePlaylists: ExamplePlaylist[] = Object.values(files).map((raw) => {
  const file = raw as { example: Omit<ExamplePlaylist, 'deck'> };
  if (!file.example?.id || !file.example.description || !file.example.snapshotDate)
    throw new Error(translate('examples.missingDescription'));
  let source: URL;
  try {
    source = new URL(file.example.sourceUrl);
    if (source.protocol !== 'https:') throw new Error();
  } catch {
    throw new Error(translate('examples.catalog.sourceHttps'));
  }
  const deck = validateDeck(raw);
  const prefix = `examples.${file.example.id}.`;
  const localized = (field: string, fallback: string) => {
    const key = prefix + field;
    const value = translate(key);
    return value === key ? fallback : value;
  };
  const originalName = deck.name;
  Object.defineProperty(deck, 'name', {
    enumerable: true,
    get: () => localized('name', originalName),
  });
  return {
    ...file.example,
    sourceType:
      file.example.sourceType ||
      (source.pathname.startsWith('/playlist/') ? 'playlist' : 'curated'),
    get description() {
      return localized('description', file.example.description);
    },
    get yearNote() {
      return localized('yearNote', file.example.yearNote);
    },
    deck,
  };
});

export function examplesForMode(mode?: GameMode): ExamplePlaylist[] {
  return [...examplePlaylists].sort(
    (a, b) =>
      Number((b.deck.gameMode || 'music') === mode) - Number((a.deck.gameMode || 'music') === mode),
  );
}

export function exampleWouldMixModes(example: ExamplePlaylist, currentMode: GameMode): boolean {
  return example.deck.songs.some((song) => (song.gameMode || 'music') !== currentMode);
}

export function createExampleDeck(id: string): Deck {
  const example = examplePlaylists.find((p) => p.id === id);
  if (!example) throw new Error(translate('examples.notFound'));
  // Every copy has independent cards and settings; editing it never changes the example.
  return validateDeck({
    ...example.deck,
    id: crypto.randomUUID(),
    songs: example.deck.songs.map((s) => ({ ...s, id: crypto.randomUUID() })),
  });
}
