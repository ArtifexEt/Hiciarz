import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Camera as CameraIcon, CameraOff, ScanLine } from 'lucide-react';
export default function Camera({
  onScan,
  pairingRequired = true,
  ready = true,
}: {
  onScan: (text: string) => void;
  pairingRequired?: boolean;
  ready?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    handler = useRef(onScan),
    last = useRef({ text: '', time: 0 });
  handler.current = onScan;
  const [active, setActive] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!ready) setActive(false);
  }, [ready]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video.current!,
        (result) => {
          if (cancelled) return;
          const now = Date.now();
          if (result) {
            const text = result.getText();
            if (text !== last.current.text) handler.current(text);
            last.current = { text, time: now };
          } else if (now - last.current.time > 1200) {
            last.current = { text: '', time: 0 };
          }
        },
      )
      .then((c) => {
        if (cancelled) c.stop();
        else controls.current = c;
      })
      .catch((e: DOMException) => {
        if (cancelled) return;
        setError(
          e.name === 'NotAllowedError'
            ? 'Brak zgody na aparat. Zezwól na dostęp w ustawieniach przeglądarki.'
            : e.name === 'NotFoundError'
              ? 'Nie znaleziono aparatu.'
              : 'Nie udało się uruchomić aparatu. Sprawdź uprawnienia i połączenie HTTPS.',
        );
        setActive(false);
      });
    return () => {
      cancelled = true;
      controls.current?.stop();
      controls.current = null;
      const stream = video.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);
  return (
    <div className="camera-wrap">
      <div className="camera-view">
        <video ref={video} playsInline muted autoPlay aria-label="Podgląd aparatu" />
        <div className="scan-frame">
          <i />
          <i />
          <i />
          <i />
          {active && <span className="scan-sweep" />}
        </div>
        {!active && (
          <div className="camera-start">
            <ScanLine size={52} />
            <h3>Przyłóż kartę do aparatu</h3>
            <p>
              {pairingRequired ? (
                <>
                  Najpierw QR parowania z laptopa,
                  <br />
                  potem QR z muzycznej karty.
                </>
              ) : (
                <>
                  Połącz konto Spotify i wybierz urządzenie,
                  <br />
                  potem zeskanuj QR z muzycznej karty.
                </>
              )}
            </p>
            <button
              className="primary"
              disabled={!ready}
              onClick={() => {
                setError('');
                setActive(true);
              }}
            >
              <CameraIcon size={18} /> {ready ? 'Włącz aparat' : 'Najpierw przygotuj Spotify'}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {active && (
        <button className="quiet" onClick={() => setActive(false)}>
          <CameraOff size={16} /> Wyłącz aparat
        </button>
      )}
    </div>
  );
}
