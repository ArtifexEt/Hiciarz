import { validateDeck, type Deck } from './model';

export type ExamplePlaylist = {
  id: string;
  description: string;
  sourceUrl: string;
  sourceName: string;
  sourceOwner: string;
  snapshotDate: string;
  yearNote: string;
  deck: Deck;
};

// These JSON projects are bundled with the app, including its offline cache.
const files = import.meta.glob('../examples/playlists/*.json', { eager: true, import: 'default' });
export const examplePlaylists: ExamplePlaylist[] = Object.values(files).map((raw) => {
  const file = raw as { example: Omit<ExamplePlaylist, 'deck'> };
  if (!file.example?.id || !file.example.description || !file.example.snapshotDate)
    throw new Error('Przykładowa playlista nie ma opisu lub daty zapisu.');
  const source = new URL(file.example.sourceUrl);
  if (source.protocol !== 'https:' || source.hostname !== 'open.spotify.com')
    throw new Error('Nieprawidłowe źródło przykładowej playlisty.');
  return { ...file.example, deck: validateDeck(raw) };
});

export function createExampleDeck(id: string): Deck {
  const example = examplePlaylists.find((p) => p.id === id);
  if (!example) throw new Error('Nie znaleziono przykładowej playlisty.');
  // Every copy has independent cards and settings; editing it never changes the example.
  return validateDeck({
    ...example.deck,
    id: crypto.randomUUID(),
    songs: example.deck.songs.map((s) => ({ ...s, id: crypto.randomUUID() })),
  });
}
