import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from './i18n';
import PlaylistExamples from './PlaylistExamples';
import Camera from './Camera';

afterEach(() => {
  setLanguage('pl');
  vi.unstubAllGlobals();
});

describe('localized user flows', () => {
  it('renders bundled playlist metadata in either language', () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
    setLanguage('en');
    const example = renderToStaticMarkup(<PlaylistExamples onChoose={() => {}} />);
    expect(example).toContain('Christmas hits');
    expect(example).toContain('151 Christmas songs');
    expect(example).not.toContain('świątecznych piosenek');
    expect(example).not.toMatch(/(?:app|components)\.[A-Za-z]/);
    setLanguage('pl');
    expect(renderToStaticMarkup(<PlaylistExamples onChoose={() => {}} />)).toContain(
      'Świąteczne hity',
    );
  });

  it('opens a game-music collection with curated-source copy in either interface language', () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
    setLanguage('en');
    const gallery = renderToStaticMarkup(
      <PlaylistExamples initialMode="game" currentMode="music" onChoose={() => {}} />,
    );
    expect(gallery).toContain('Game music');
    expect(gallery).toContain('Selection prepared on');
    expect(gallery).not.toContain('Playlist snapshot from');
    expect(gallery).not.toMatch(/(?:app|components|examples)\.[A-Za-z]/);
    setLanguage('pl');
    const polish = renderToStaticMarkup(
      <PlaylistExamples initialMode="game" currentMode="music" onChoose={() => {}} />,
    );
    expect(polish).toContain('Muzyka z gier');
    expect(polish).toContain('Lista przygotowana');
  });

  it('offers the camera directly without a pairing step for playback on this device', () => {
    vi.stubGlobal('localStorage', { setItem: vi.fn() });
    setLanguage('en');
    const scanner = renderToStaticMarkup(
      <Camera onScan={() => {}} pairingRequired={false} ready />,
    );
    expect(scanner).toContain('Scan a music card');
    expect(scanner).toContain('Start camera');
    expect(scanner).not.toContain('First scan the player');
    expect(scanner).not.toContain('disabled=""');
    expect(scanner).not.toMatch(/components\.[A-Za-z]/);
  });
});
