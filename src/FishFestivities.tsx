import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { asset } from './themes';
import './fish-festivities.css';

const motionPreference = 'hiciarz-fish-motion';
const bulbs = [70, 195, 315, 440, 560, 685, 805, 930];

export default function FishFestivities({ compact = false }: { compact?: boolean }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(motionPreference) !== 'off');
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  const moving = enabled && !reduced;
  return (
    <div
      className={'fish-festivities' + (compact ? ' fish-festivities-compact' : '')}
      data-motion={moving ? 'on' : 'off'}
    >
      <div className="fish-garland" aria-hidden="true">
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
      <button
        type="button"
        className="fish-motion-toggle"
        disabled={reduced}
        title={reduced ? 'Ograniczenie ruchu jest włączone w ustawieniach urządzenia.' : undefined}
        onClick={() => {
          const next = !enabled;
          localStorage.setItem(motionPreference, next ? 'on' : 'off');
          setEnabled(next);
        }}
      >
        {moving ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
        {reduced ? 'Animacje wyłączone' : moving ? 'Zatrzymaj animacje' : 'Włącz animacje'}
      </button>
    </div>
  );
}
