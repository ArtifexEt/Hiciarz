import { afterEach, describe, expect, it, vi } from 'vitest';
import { bingoAppUrl, legacyBingoUrl, redirectLegacyBingo } from './bingo-link';

afterEach(() => vi.unstubAllGlobals());

describe('links to the standalone Bingo app', () => {
  it('preserves approved print, level and language settings from old bookmarks', () => {
    expect(
      legacyBingoUrl(
        'https://artifexet.github.io/Hiciarz/?view=bingo&sheet=print&level=expert&lang=en',
      ),
    ).toBe('https://artifexet.github.io/Bingo/?sheet=print&level=expert&lang=en');
    expect(
      legacyBingoUrl(
        'https://artifexet.github.io/Hiciarz/?view=bingo&sheet=help&level=beginner&lang=pl',
      ),
    ).toBe('https://artifexet.github.io/Bingo/?sheet=help&level=beginner&lang=pl');
  });

  it('drops card hashes, pairing data, private tokens and unknown or unsupported options', () => {
    const original =
      'https://artifexet.github.io/Hiciarz/?view=bingo&sheet=delete&level=admin&lang=xx' +
      '&token=private&pair=room&qr=card&redirect=https://example.com/#pair=secret';
    expect(legacyBingoUrl(original)).toBe('https://artifexet.github.io/Bingo/');
    expect(
      legacyBingoUrl(
        'https://example.com/?view=bingo&lang=en&lang=private#2fs0123456789012345678901',
      ),
    ).toBe('https://artifexet.github.io/Bingo/?lang=en');
  });

  it('leaves scanner, editor, second-screen and unrelated links in Hiciarz', () => {
    for (const url of [
      'https://example.com/?view=scanner#pair=room',
      'https://example.com/?view=editor',
      'https://example.com/?view=player',
      'https://example.com/?view=Bingo',
      'https://example.com/#view=bingo',
      'not a URL',
    ])
      expect(legacyBingoUrl(url)).toBeNull();
  });

  it('builds new links from a fixed destination and the chosen interface language', () => {
    expect(bingoAppUrl()).toBe('https://artifexet.github.io/Bingo/');
    expect(bingoAppUrl('en')).toBe('https://artifexet.github.io/Bingo/?lang=en');
    expect(bingoAppUrl('pl')).toBe('https://artifexet.github.io/Bingo/?lang=pl');
  });

  it('suppresses the source URL in the referrer before replacing the legacy history entry', () => {
    const policy = { name: '', content: '' };
    const append = vi.fn();
    const replace = vi.fn(() => {
      expect(policy).toEqual({ name: 'referrer', content: 'no-referrer' });
      expect(append).toHaveBeenCalledWith(policy);
    });
    vi.stubGlobal('document', {
      querySelector: () => null,
      createElement: () => policy,
      head: { append },
    });
    vi.stubGlobal('location', {
      href: 'https://artifexet.github.io/Hiciarz/?view=bingo&token=private#pair=secret',
      replace,
    });
    expect(redirectLegacyBingo()).toBe(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith('https://artifexet.github.io/Bingo/');
  });
});
