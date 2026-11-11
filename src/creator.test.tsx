import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import CreatorSteps from './CreatorSteps';
import GameModePicker from './GameModePicker';
import { setLanguage } from './i18n';

const noop = () => {};
const controls = (markup: string, tag: string) =>
  [...markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, 'g'))].map(
    ([, attributes, content]) => ({ attributes, text: content.replace(/<[^>]*>/g, '') }),
  );
const radios = (markup: string) =>
  [...markup.matchAll(/<input\b([^>]*type="radio"[^>]*)\/?\s*>/g)].map(([, attributes]) => ({
    value: attributes.match(/\bvalue="([^"]*)"/)?.[1],
    name: attributes.match(/\bname="([^"]*)"/)?.[1],
    checked: /\bchecked=/.test(attributes),
  }));

afterEach(() => setLanguage('pl'));

describe('guided card creation', () => {
  it('shows a real three-step sequence and keeps later steps unavailable for an empty deck', () => {
    setLanguage('pl');
    const markup = renderToStaticMarkup(
      <CreatorSteps current="songs" hasSongs={false} onChange={noop} />,
    );
    expect(markup).toContain('aria-label="Tworzenie talii krok po kroku"');
    const buttons = controls(markup, 'button');
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.text)).toEqual(['1Utwory', '2Wygląd', '3Druk']);
    expect(buttons[0].attributes).toContain('aria-current="step"');
    expect(buttons[0].attributes).not.toContain('disabled=');
    expect(buttons.slice(1).every((button) => button.attributes.includes('disabled='))).toBe(true);
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it('exposes the current English step and allows returning to earlier steps once tracks exist', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(<CreatorSteps current="print" hasSongs onChange={noop} />);
    expect(markup).toContain('aria-label="Create a deck step by step"');
    const buttons = controls(markup, 'button');
    expect(buttons.map((button) => button.text.replace(/^\d/, ''))).toEqual([
      'Tracks',
      'Design',
      'Print',
    ]);
    expect(buttons.every((button) => !button.attributes.includes('disabled='))).toBe(true);
    expect(buttons[2].attributes).toContain('aria-current="step"');
    expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it('offers the classic game and discoverable variations as a single native radio group', () => {
    setLanguage('pl');
    const markup = renderToStaticMarkup(<GameModePicker value="music" onChange={noop} />);
    expect(markup).toContain('<fieldset');
    expect(markup).toContain('<legend>W co gramy?</legend>');
    expect(markup).toContain('Klasyczna oś czasu');
    expect(markup).toContain('Inne warianty');
    expect(markup).toContain('Zgadnij grę');
    expect(markup).toContain('Zgadnij film');
    expect(markup).not.toContain('<select');
    const options = radios(markup);
    expect(options.map((radio) => radio.value).sort()).toEqual(['game', 'movie', 'music']);
    expect(options.filter((radio) => radio.checked).map((radio) => radio.value)).toEqual(['music']);
    expect(new Set(options.map((radio) => radio.name)).size).toBe(1);
    expect(options[0].name).toBeTruthy();
    expect(markup).not.toMatch(/<details[^>]*\bopen=/);
  });

  it('makes a saved game variation selected and discoverable without a dropdown', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(<GameModePicker value="game" onChange={noop} />);
    expect(markup).toContain('What are we playing?');
    expect(markup).toContain('Other variations');
    expect(markup).toContain('Guess the game');
    expect(markup).toMatch(/<details[^>]*\bopen=/);
    expect(
      radios(markup)
        .filter((radio) => radio.checked)
        .map((radio) => radio.value),
    ).toEqual(['game']);
    expect(markup).not.toContain('<select');
    expect(markup).not.toMatch(/creator\.[A-Za-z]/);
  });

  it('keeps all question types and the selected film available in the compact card form', () => {
    setLanguage('en');
    const markup = renderToStaticMarkup(<GameModePicker value="movie" compact onChange={noop} />);
    expect(markup).toContain('Classic timeline');
    expect(markup).toContain('Guess the game');
    expect(markup).toContain('Guess the film');
    expect(
      radios(markup)
        .filter((radio) => radio.checked)
        .map((radio) => radio.value),
    ).toEqual(['movie']);
    expect(markup).not.toContain('<select');
  });
});
