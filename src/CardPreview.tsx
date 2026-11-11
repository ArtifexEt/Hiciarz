import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { useTranslation } from './i18n';
import type { Deck, Song } from './model';
import type { CardArtwork, CardElement } from './card-artwork';
import './card-preview.css';

function Element({ element }: { element: CardElement }) {
  switch (element.type) {
    case 'rect':
      return (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={element.radius || 0}
          fill={element.fill || 'none'}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
    case 'line':
      return (
        <line
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
    case 'ellipse':
      return (
        <ellipse
          cx={element.cx}
          cy={element.cy}
          rx={element.rx}
          ry={element.ry}
          fill={element.fill || 'none'}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
    case 'polygon':
      return (
        <polygon
          points={element.points.map(({ x, y }) => `${x},${y}`).join(' ')}
          fill={element.fill || 'none'}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
    case 'image':
      return (
        <image
          href={element.src}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          preserveAspectRatio="xMidYMid slice"
        />
      );
    case 'text':
      return (
        <text
          fill={element.fill}
          fontFamily="Noto"
          fontWeight="400"
          style={{ fontKerning: 'none', fontVariantLigatures: 'none' }}
          fontSize={(element.fontSize * 25.4) / 72}
          letterSpacing={element.charSpaceMm}
          textAnchor={
            element.align === 'center' ? 'middle' : element.align === 'right' ? 'end' : 'start'
          }
          dominantBaseline="alphabetic"
        >
          {element.lines.map((line, index) => (
            <tspan key={index} x={element.x} y={element.y + index * element.lineHeightMm}>
              {line}
            </tspan>
          ))}
        </text>
      );
  }
}

export function CardArtworkSvg({ artwork, label }: { artwork: CardArtwork; label: string }) {
  return (
    <svg className="card-preview-svg" viewBox="0 0 60 60" role="img" aria-label={label}>
      <rect width="60" height="60" fill="#fff" />
      {artwork.elements.map((element, index) => (
        <Element key={element.type === 'image' ? element.src : index} element={element} />
      ))}
    </svg>
  );
}

async function preloadImages(artwork: CardArtwork) {
  await Promise.all(
    artwork.elements
      .filter((element) => element.type === 'image')
      .map(
        (element) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('image'));
            image.src = element.src;
          }),
      ),
  );
  await document.fonts.load('400 12px Noto');
}

export default function CardPreview({
  song,
  deck,
  back = false,
}: {
  song: Song;
  deck: Deck;
  back?: boolean;
}) {
  const { language, t } = useTranslation();
  const [retry, setRetry] = useState(0);
  const request = useMemo(
    () => ({ song, deck, back }),
    [song, deck.theme, deck.back, deck.print.style, deck.print.frontColors, back, language, retry],
  );
  const [result, setResult] = useState<{
    request: typeof request;
    artwork?: CardArtwork;
    failed?: boolean;
  }>();
  useEffect(() => {
    let active = true;
    import('./pdf')
      .then(({ createCardPreviewArtwork }) =>
        createCardPreviewArtwork(
          request.song,
          request.deck,
          request.back,
          location.origin + location.pathname,
        ),
      )
      .then(async (artwork) => {
        await preloadImages(artwork);
        if (active) setResult({ request, artwork });
      })
      .catch(() => {
        if (active) setResult({ request, failed: true });
      });
    return () => {
      active = false;
    };
  }, [request]);
  // Hide the previous artwork immediately, before an effect or slow image load can finish.
  const current = result?.request === request ? result : undefined;
  return (
    <div className="card-preview-frame" aria-busy={!current}>
      {current?.artwork ? (
        <CardArtworkSvg
          artwork={current.artwork}
          label={t(back ? 'printPreview.back' : 'printPreview.front', { title: song.title })}
        />
      ) : current?.failed ? (
        <div className="card-preview-placeholder" role="alert">
          <p>{t('printPreview.failed')}</p>
          <button className="text-button" onClick={() => setRetry((value) => value + 1)}>
            <RotateCcw size={16} aria-hidden="true" />
            {t('printPreview.retry')}
          </button>
        </div>
      ) : (
        <div className="card-preview-placeholder" role="status">
          <LoaderCircle size={22} className="spin" aria-hidden="true" />
          <span>{t('printPreview.preparing')}</span>
        </div>
      )}
    </div>
  );
}
