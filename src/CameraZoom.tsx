import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  cameraZoomController,
  cameraZoomRange,
  clampCameraZoom,
  type ZoomRange,
} from './camera-zoom';

export default function CameraZoom({ track }: { track: MediaStreamTrack }) {
  const [range, setRange] = useState<ZoomRange | null>(null);
  const [value, setValue] = useState(1);
  const [error, setError] = useState('');
  const controller = useRef<ReturnType<typeof cameraZoomController> | null>(null);
  useEffect(() => {
    const supported = cameraZoomRange(track);
    setRange(supported);
    setError('');
    if (!supported) return;
    setValue(supported.value);
    const control = cameraZoomController(track, supported, setValue, () => {
      const current = cameraZoomRange(track);
      if (current) setValue(current.value);
      setError('Nie udało się zmienić przybliżenia. Spróbuj ponownie lub przysuń kartę.');
    });
    controller.current = control;
    return () => {
      control.close();
      controller.current = null;
    };
  }, [track]);
  if (!range) return null;
  const change = (next: number) => {
    const zoom = clampCameraZoom(range, next);
    setValue(zoom);
    setError('');
    controller.current?.request(zoom);
  };
  const label = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value) + '×';
  const increment = Math.max(range.step, (range.max - range.min) / 10);
  return (
    <div className="camera-zoom">
      <div className="camera-zoom-heading">
        <label htmlFor="camera-zoom">Przybliżenie aparatu</label>
        <output htmlFor="camera-zoom" aria-live="off">
          {label}
        </output>
      </div>
      <div className="camera-zoom-controls">
        <button
          className="icon"
          aria-label="Oddal obraz aparatu"
          disabled={value <= range.min}
          onClick={() => change(value - increment)}
        >
          <Minus size={18} />
        </button>
        <input
          id="camera-zoom"
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          aria-valuetext={label}
          onChange={(e) => change(Number(e.target.value))}
        />
        <button
          className="icon"
          aria-label="Przybliż obraz aparatu"
          disabled={value >= range.max}
          onClick={() => change(value + increment)}
        >
          <Plus size={18} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
