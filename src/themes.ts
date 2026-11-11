import { localizedRecord } from './i18n';
import { themes, type Theme } from './model';
export const asset = (path: string) => import.meta.env.BASE_URL + path;
export const themeArt = (theme: Theme | 'laser') =>
  asset(`themes/${theme === 'fish' ? 'fish-santa.webp' : theme + '.svg'}`);
export const themeDescriptions = localizedRecord(themes, 'themes.descriptions.');
export const themeColors: Record<Theme | 'laser', { dark: string; light: string; accent: string }> =
  {
    laser: { dark: '#26332e', light: '#ffffff', accent: '#638876' },
    classic: { dark: '#42334f', light: '#eee4f4', accent: '#cdf27c' },
    minimal: { dark: '#1e252b', light: '#faf8f1', accent: '#e9c286' },
    vinyl: { dark: '#382a24', light: '#f5e6cd', accent: '#eeae69' },
    mixtape: { dark: '#183e46', light: '#e4eee8', accent: '#efac83' },
    memphis: { dark: '#30315b', light: '#eeebf7', accent: '#f2c95f' },
    disco: { dark: '#392a50', light: '#f1e6f5', accent: '#d7b9ef' },
    christmas: { dark: '#153f36', light: '#fbf0db', accent: '#e6bd76' },
    winter: { dark: '#233d5b', light: '#edf5fb', accent: '#b7dcf2' },
    fish: { dark: '#073d3c', light: '#fff2dd', accent: '#e7bd70' },
  };
