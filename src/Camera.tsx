import { displayTranslation, t, useTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Camera as CameraIcon, CameraOff, ScanLine } from 'lucide-react';
import CameraZoom from './CameraZoom';
export default function Camera({
  onScan,
  pairingRequired = true,
  paired = false,
  onStart,
  ready = true,
  purpose = 'card',
}: {
  onScan: (text: string) => void;
  pairingRequired?: boolean;
  paired?: boolean;
  onStart?: () => void;
  ready?: boolean;
  purpose?: 'card' | 'setup';
}) {
  useTranslation();
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    handler = useRef(onScan),
    last = useRef({ text: '', time: 0 });
  handler.current = onScan;
  const [active, setActive] = useState(false),
    [error, setError] = useState('');
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);
  useEffect(() => {
    if (!ready) setActive(false);
  }, [ready]);
  useEffect(() => {
    if (!active) return;
    last.current = { text: '', time: 0 };
    let cancelled = false;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            aspectRatio: { ideal: 1 },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
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
        else {
          controls.current = c;
          const stream = video.current?.srcObject as MediaStream | null;
          setTrack(stream?.getVideoTracks()[0] || null);
        }
      })
      .catch((e: DOMException) => {
        if (cancelled) return;
        setError(
          e.name === 'NotAllowedError'
            ? t('components.Camera.cameraAccessDeniedAllowAccessIn')
            : e.name === 'NotFoundError'
              ? t('components.Camera.noCameraFound')
              : t('components.Camera.couldNotStartTheCameraCheck'),
        );
        setActive(false);
      });
    return () => {
      cancelled = true;
      controls.current?.stop();
      controls.current = null;
      setTrack(null);
      const stream = video.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);
  return (
    <div className="camera-wrap">
      <div className="camera-view">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          aria-label={t('components.Camera.cameraPreview')}
        />
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
            <h3>
              {purpose === 'setup'
                ? t('components.Camera.scanSpotifyConfiguration')
                : ready && (!pairingRequired || paired)
                  ? t('components.Camera.scanAMusicCard')
                  : t('components.Camera.prepareTheScanner')}
            </h3>
            <p>
              {purpose === 'setup' ? (
                t('components.Camera.pointTheCameraAtTheConfiguration')
              ) : ready && (!pairingRequired || paired) ? (
                t('components.Camera.pointTheCameraAtTheCards')
              ) : pairingRequired ? (
                <>
                  {t('components.Camera.firstScanThePlayersPairingQR')}
                  <br />
                  {t('components.Camera.thenTheMusicCardsQRCode')}
                </>
              ) : (
                <>
                  {t('components.Camera.connectSpotifyAndChooseADevice')}
                  <br />
                  {t('components.Camera.thenScanTheMusicCardsQR')}
                </>
              )}
            </p>
            <button
              className="primary"
              disabled={!ready}
              onClick={() => {
                setError('');
                onStart?.();
                setActive(true);
              }}
            >
              <CameraIcon size={18} />{' '}
              {ready
                ? t('components.Camera.startCamera')
                : t('components.Camera.setUpSpotifyFirst')}
            </button>
          </div>
        )}
      </div>
      {active && track && <CameraZoom track={track} />}
      {error && (
        <p className="error" role="alert">
          {displayTranslation(error)}
        </p>
      )}
      {active && (
        <button className="quiet" onClick={() => setActive(false)}>
          <CameraOff size={16} /> {t('components.Camera.stopCamera')}
        </button>
      )}
    </div>
  );
}
