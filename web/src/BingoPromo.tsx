import { ArrowUpRight, Guitar, Headphones, Music2, Sparkles } from 'lucide-react';
import { bingoAppUrl } from './bingo-link';
import { useTranslation } from './i18n';

const musicTiles = [
  Music2,
  Headphones,
  Guitar,
  Guitar,
  Music2,
  Headphones,
  Headphones,
  Guitar,
  Music2,
];

export default function BingoPromo() {
  const { t, language } = useTranslation();
  return (
    <aside className="bingo-promo" aria-labelledby="bingo-promo-title">
      <div className="bingo-promo-copy">
        <p className="bingo-promo-eyebrow">
          <Sparkles size={15} aria-hidden="true" />
          {t('bingoPromo.eyebrow')}
        </p>
        <h2 id="bingo-promo-title">{t('bingoPromo.title')}</h2>
        <p className="bingo-promo-description">{t('bingoPromo.description')}</p>
        <a
          className="bingo-promo-link"
          href={bingoAppUrl(language)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('bingoPromo.action')}
          <ArrowUpRight size={19} aria-hidden="true" />
          <span className="sr-only">{t('bingoPromo.newTab')}</span>
        </a>
        <p className="bingo-promo-detail">{t('bingoPromo.detail')}</p>
      </div>
      <div className="bingo-promo-art" aria-hidden="true">
        <div className="bingo-promo-board">
          <span className="bingo-promo-board-title">BINGO</span>
          <div className="bingo-promo-grid">
            {musicTiles.map((Icon, index) => (
              <span
                key={index}
                className={'bingo-promo-cell' + ([0, 4, 8].includes(index) ? ' is-marked' : '')}
              >
                <Icon size={23} strokeWidth={1.8} />
              </span>
            ))}
          </div>
        </div>
        <span className="bingo-promo-spark">
          <Sparkles size={26} strokeWidth={1.5} />
        </span>
      </div>
    </aside>
  );
}
