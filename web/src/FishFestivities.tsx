import { asset } from './themes';
import './fish-festivities.css';

const bulbs = [70, 195, 315, 440, 560, 685, 805, 930];

export default function FishFestivities({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={'fish-festivities' + (compact ? ' fish-festivities-compact' : '')}
      aria-hidden="true"
    >
      <div className="fish-garland">
        <svg className="fish-light-string" viewBox="0 0 1000 90" preserveAspectRatio="none">
          <path d="M-20 3 Q500 115 1020 3" className="fish-light-wire" />
          {bulbs.map((x, i) => {
            const y = 3 + 55 * (1 - Math.pow((x - 500) / 520, 2));
            return (
              <g key={x} className={'fish-bulb fish-bulb-' + (i % 3)}>
                <path d={`M${x} ${y} v8`} className="fish-light-wire" />
                <ellipse cx={x} cy={y + 12} rx="3" ry="5" />
              </g>
            );
          })}
        </svg>
        <span className="fish-hanging fish-hanging-left">
          <img
            src={asset('themes/fish-santa-ornament.webp')}
            alt=""
            width="384"
            height="351"
            decoding="async"
          />
        </span>
        <span className="fish-hanging fish-hanging-right">
          <img
            src={asset('themes/fish-santa-ornament.webp')}
            alt=""
            width="384"
            height="351"
            decoding="async"
          />
        </span>
        <span className="fish-spark fish-spark-one">✦</span>
        <span className="fish-spark fish-spark-two">✧</span>
      </div>
    </div>
  );
}
