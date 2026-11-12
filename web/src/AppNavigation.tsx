import {
  Grid3X3,
  Headphones,
  House,
  Info,
  LayoutGrid,
  Menu,
  ScanLine,
  Settings2,
  Volume2,
} from 'lucide-react';
import { useTranslation } from './i18n';
import type { ReactNode } from 'react';
import type { AppView } from './navigation';
import { asset } from './themes';

export default function AppNavigation({
  current,
  menuOpen,
  playbackOpen,
  onChoose,
  onMenu,
  onPlayback,
  onSettings,
  onHelp,
  deckLibrary,
}: {
  current: AppView;
  menuOpen: boolean;
  playbackOpen: boolean;
  onChoose: (view: AppView) => void;
  onMenu: () => void;
  onPlayback: () => void;
  onSettings: () => void;
  onHelp: () => void;
  deckLibrary?: ReactNode;
}) {
  const { t } = useTranslation();
  const routes = [
    ['home', House],
    ['scanner', ScanLine],
    ['editor', LayoutGrid],
    ['bingo', Grid3X3],
    ['player', Headphones],
  ] as const;
  const mobileRoutes = [
    ['scanner', ScanLine],
    ['bingo', Grid3X3],
    ['editor', LayoutGrid],
  ] as const;
  return (
    <>
      <aside className="app-sidebar">
        <button
          className="app-brand"
          onClick={() => onChoose('home')}
          aria-label={t('app.hiciarzHome')}
        >
          <img src={asset('icon.svg')} width="40" height="40" alt="" />
          <span>hiciarz</span>
        </button>
        <nav aria-label={t('shell.navigation')}>
          {routes.map(([view, Icon]) => (
            <button
              key={view}
              className="app-nav-button"
              aria-current={current === view ? 'page' : undefined}
              onClick={() => onChoose(view)}
            >
              <Icon size={20} aria-hidden="true" />
              {t('shell.view.' + view)}
            </button>
          ))}
        </nav>
        {deckLibrary}
        <div className="app-sidebar-bottom">
          <button
            className="app-nav-button"
            aria-expanded={playbackOpen}
            aria-haspopup="dialog"
            onClick={onPlayback}
          >
            <Volume2 size={20} aria-hidden="true" />
            {t('shell.sound')}
          </button>
          <button className="app-nav-button" onClick={onHelp}>
            <Info size={20} aria-hidden="true" />
            {t('shell.help')}
          </button>
          <button className="app-nav-button" onClick={onSettings}>
            <Settings2 size={20} aria-hidden="true" />
            {t('app.settings')}
          </button>
        </div>
      </aside>
      <nav className="app-bottom-nav" aria-label={t('shell.navigation')}>
        {mobileRoutes.map(([view, Icon]) => (
          <button
            key={view}
            aria-current={current === view && !menuOpen ? 'page' : undefined}
            onClick={() => onChoose(view)}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{t('shell.view.' + view)}</span>
          </button>
        ))}
        <button aria-expanded={playbackOpen} aria-haspopup="dialog" onClick={onPlayback}>
          <Volume2 size={22} aria-hidden="true" />
          <span>{t('shell.sound')}</span>
        </button>
        <button
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-current={current === 'player' ? 'page' : undefined}
          onClick={onMenu}
        >
          <Menu size={22} aria-hidden="true" />
          <span>{t('shell.more')}</span>
        </button>
      </nav>
    </>
  );
}
