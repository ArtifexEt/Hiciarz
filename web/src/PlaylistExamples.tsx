import { t, useTranslation, getLanguage } from './i18n';
import { useState } from 'react';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { examplePlaylists, examplesForMode, exampleWouldMixModes } from './examples';
import { themeArt } from './themes';
import { themeNames, gameModeNames, type GameMode } from './model';

const sourceNotes = import.meta.glob<string>('../docs/game-*-sources.json', {
  query: '?url',
  import: 'default',
  eager: true,
});

export default function PlaylistExamples({
  onChoose,
  initialMode,
  currentMode,
}: {
  onChoose: (id: string, destination: 'new' | 'append') => void;
  initialMode?: GameMode;
  currentMode?: GameMode;
}) {
  useTranslation();
  const playlists = examplesForMode(initialMode);
  const [selected, setSelected] = useState(playlists[0]?.id || '');
  const [destination, setDestination] = useState<'new' | 'append'>('new');
  const example = examplePlaylists.find((p) => p.id === selected);
  return (
    <div className="playlist-examples">
      <p className="muted">{t('components.PlaylistExamples.readymadeListsToGetYouStarted')}</p>
      <div
        className="example-options"
        role="group"
        aria-label={t('components.PlaylistExamples.chooseASamplePlaylist')}
      >
        {playlists.map((p) => (
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
              <span>
                {t('shell.cardCount', { count: p.deck.songs.length })} ·{' '}
                {gameModeNames[p.deck.gameMode || 'music']}
              </span>
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
              {example.sourceType === 'curated' ? (
                t('examples.gallery.curatedOn', {
                  date: new Intl.DateTimeFormat(getLanguage(), {
                    dateStyle: 'long',
                    timeZone: 'UTC',
                  }).format(new Date(example.snapshotDate + 'T00:00:00Z')),
                })
              ) : (
                <>
                  {t('components.PlaylistExamples.playlistSnapshotFrom')}{' '}
                  {new Intl.DateTimeFormat(getLanguage(), {
                    dateStyle: 'long',
                    timeZone: 'UTC',
                  }).format(new Date(example.snapshotDate + 'T00:00:00Z'))}
                  {t('components.PlaylistExamples.thisListDoesNotUpdateAutomatically')}
                </>
              )}
            </span>
            <a
              href={sourceNotes[`../docs/${example.id}-sources.json`] || example.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {example.sourceType === 'curated'
                ? t('examples.gallery.sources')
                : t('components.PlaylistExamples.viewSourceOnSpotify')}{' '}
              <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="hint">
            {example.yearNote}{' '}
            {t('components.PlaylistExamples.musicPlaybackRequiresAnInternetConnection')}
          </p>
          <fieldset className="example-destination">
            <legend>{t('components.PlaylistExamples.whereShouldTheTracksGo')}</legend>
            <div className="choice-list">
              <label>
                <input
                  type="radio"
                  name="example-destination"
                  checked={destination === 'new'}
                  onChange={() => setDestination('new')}
                />
                <span>
                  <strong>{t('components.PlaylistExamples.createANewDeck')}</strong>
                  <small>
                    {t('components.PlaylistExamples.theme')} {themeNames[example.deck.theme]}
                    {t('components.PlaylistExamples.keepTheCurrentDeck')}
                  </small>
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
                  <strong>{t('components.PlaylistExamples.addToTheCurrentDeck')}</strong>
                  <small>{t('components.PlaylistExamples.appendTracksKeepYourEditsAnd')}</small>
                </span>
              </label>
            </div>
          </fieldset>
          {destination === 'append' &&
            currentMode &&
            exampleWouldMixModes(example, currentMode) && (
              <p className="notice" role="status">
                {t('examples.gallery.mixedAppend')}
              </p>
            )}
          <div className="modal-actions">
            <button className="primary" onClick={() => onChoose(example.id, destination)}>
              <Sparkles size={18} />{' '}
              {destination === 'new'
                ? t('components.PlaylistExamples.createDeckFromSample')
                : t('components.PlaylistExamples.addTracksToDeck')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
