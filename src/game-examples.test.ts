import { describe, expect, it } from 'vitest';
import { createExampleDeck, examplePlaylists } from './examples';
import { cardUrl, readQR, validateDeck } from './model';
import provenance from '../docs/game-originals-sources.json';

describe('original game soundtrack example', () => {
  it('offers more than 200 distinct recordings across a broad selection of games', () => {
    const example = examplePlaylists.find((item) => item.id === 'game-originals');
    expect(example).toBeDefined();
    const deck = validateDeck(example!.deck);
    expect(deck.gameMode).toBe('game');
    expect(deck.songs.length).toBeGreaterThan(200);
    expect(new Set(deck.songs.map((song) => song.id)).size).toBe(deck.songs.length);
    expect(new Set(deck.songs.map((song) => song.answer)).size).toBeGreaterThanOrEqual(70);

    const recordings = new Set<string>();
    for (const song of deck.songs) {
      expect(song.gameMode, song.title).toBe('game');
      expect(song.answer?.trim(), song.title).toBeTruthy();
      expect(song.title.trim(), song.id).toBeTruthy();
      expect(song.artist.trim(), song.title).toBeTruthy();
      for (const [provider, id] of Object.entries(song.sources)) {
        if (!id) continue;
        const source = provider + ':' + id;
        expect(recordings.has(source), `Duplicate recording: ${song.title}`).toBe(false);
        recordings.add(source);
      }
    }
  });

  it('encodes the game question and playback source without revealing the printed answer', () => {
    const example = examplePlaylists.find((item) => item.id === 'game-originals')!;
    for (const song of example.deck.songs) {
      const parsed = readQR(cardUrl(song, example.deck.theme, 'https://example.com/Hiciarz/'));
      expect(parsed.kind, song.title).toBe('card');
      if (parsed.kind !== 'card') continue;
      expect(parsed.card.gameMode, song.title).toBe('game');
      expect(parsed.card.sources, song.title).toEqual(song.sources);
      expect(parsed.card).not.toHaveProperty('answer');
      expect(parsed.card).not.toHaveProperty('title');
      expect(parsed.card).not.toHaveProperty('artist');
      expect(parsed.card).not.toHaveProperty('year');
    }

    const copy = createExampleDeck('game-originals');
    expect(copy.gameMode).toBe('game');
    expect(copy.id).not.toBe(example.deck.id);
    expect(copy.songs.map((song) => song.answer)).toEqual(
      example.deck.songs.map((song) => song.answer),
    );
    expect(copy.songs[0].id).not.toBe(example.deck.songs[0].id);
  });

  it('keeps every recording traceable to its verified soundtrack metadata', () => {
    const deck = examplePlaylists.find((item) => item.id === 'game-originals')!.deck;
    expect(provenance.cardCount).toBe(deck.songs.length);
    expect(provenance.distinctGames).toBe(new Set(deck.songs.map((song) => song.answer)).size);
    expect(provenance.tracks.map((track) => track.spotifyId).sort()).toEqual(
      deck.songs.map((song) => song.sources.spotify).sort(),
    );

    const sources = new Map(provenance.tracks.map((track) => [track.spotifyId, track]));
    const albums = new Set(provenance.albumSources.map((source) => source.url));
    for (const song of deck.songs) {
      const id = song.sources.spotify!;
      const source = sources.get(id)!;
      expect(source.title, id).toBe(song.title);
      expect(source.artist, id).toBe(song.artist);
      expect(source.answer, id).toBe(song.answer);
      expect(Number(source.releaseDate.slice(0, 4)), id).toBe(song.year);
      expect(source.isPlayableAtVerification, id).toBe(true);
      expect(source.verifiedOn, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.trackUrl, id).toBe('https://open.spotify.com/track/' + id);
      expect(source.metadataUrl, id).toBe('https://open.spotify.com/embed/track/' + id);
      expect(albums.has(source.albumUrl), id).toBe(true);
      expect(song.review, id).toBe(true);
    }
  });
});
