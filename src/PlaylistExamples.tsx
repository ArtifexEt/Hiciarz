import { useState } from 'react';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { examplePlaylists } from './examples';
import { themeArt } from './themes';
import { themeNames } from './model';

export default function PlaylistExamples({
  onChoose,
}: {
  onChoose: (id: string, destination: 'new' | 'append') => void;
}) {
  const [selected, setSelected] = useState(examplePlaylists[0]?.id || '');
  const [destination, setDestination] = useState<'new' | 'append'>('new');
  const example = examplePlaylists.find((p) => p.id === selected);
  return (
    <div className="playlist-examples">
      <p className="muted">
        Gotowe listy na dobry początek. Wczytaj przykład bez logowania, a potem zmieniaj go po
        swojemu.
      </p>
      <div className="example-options" role="group" aria-label="Wybierz przykładową playlistę">
        {examplePlaylists.map((p) => (
          <button
            key={p.id}
            className={'example-option ' + (selected === p.id ? 'chosen' : '')}
            aria-pressed={selected === p.id}
            onClick={() => setSelected(p.id)}
          >
            <span
              className="example-art"
              style={{ backgroundImage: `url("${themeArt(p.deck.theme)}")` }}
            >
              <Sparkles size={28} />
            </span>
            <span className="example-description">
              <strong>{p.deck.name}</strong>
              <span>{p.deck.songs.length} utworów · Bez logowania</span>
              <small>{p.description}</small>
            </span>
            {selected === p.id && <Check size={19} aria-hidden="true" />}
          </button>
        ))}
      </div>
      {example && (
        <>
          <div className="example-source">
            <span>
              Zapis playlisty z{' '}
              {new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeZone: 'UTC' }).format(
                new Date(example.snapshotDate + 'T00:00:00Z'),
              )}
              . Lista nie aktualizuje się automatycznie.
            </span>
            <a href={example.sourceUrl} target="_blank" rel="noopener noreferrer">
              Zobacz źródło w Spotify <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="hint">
            {example.yearNote} Odtwarzanie muzyki wymaga połączenia z internetem.
          </p>
          <fieldset className="example-destination">
            <legend>Gdzie wczytać utwory?</legend>
            <div className="choice-list">
              <label>
                <input
                  type="radio"
                  name="example-destination"
                  checked={destination === 'new'}
                  onChange={() => setDestination('new')}
                />
                <span>
                  <strong>Utwórz nową talię</strong>
                  <small>Motyw: {themeNames[example.deck.theme]}. Zachowaj obecną talię.</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="example-destination"
                  checked={destination === 'append'}
                  onChange={() => setDestination('append')}
                />
                <span>
                  <strong>Dodaj do obecnej talii</strong>
                  <small>Dopisz na końcu, zachowaj poprawki i pomiń duplikaty.</small>
                </span>
              </label>
            </div>
          </fieldset>
          <div className="modal-actions">
            <button className="primary" onClick={() => onChoose(example.id, destination)}>
              <Sparkles size={18} />{' '}
              {destination === 'new' ? 'Utwórz talię z przykładu' : 'Dodaj utwory do talii'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
