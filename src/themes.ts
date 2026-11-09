import type { Theme } from './model';
export const asset = (path: string) => import.meta.env.BASE_URL + path;
export const themeArt = (theme: Theme) =>
  asset(`themes/${theme === 'fish' ? 'fish.webp' : theme + '.svg'}`);
export const themeColors: Record<Theme, { dark: string; light: string; accent: string }> = {
  classic: { dark: '#42334f', light: '#eee4f4', accent: '#cdf27c' },
  minimal: { dark: '#1e252b', light: '#faf8f1', accent: '#e9c286' },
  christmas: { dark: '#153f36', light: '#fbf0db', accent: '#e6bd76' },
  winter: { dark: '#233d5b', light: '#edf5fb', accent: '#b7dcf2' },
  fish: { dark: '#073d3c', light: '#fff2dd', accent: '#e7bd70' },
};
