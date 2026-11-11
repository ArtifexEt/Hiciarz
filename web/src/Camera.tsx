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
  immersive = false,
  onConfigure,
}: {
  onScan: (text: string) => void;
  pairingRequired?: boolean;
  paired?: boolean;
  onStart?: () => void;
  ready?: boolean;
  purpose?: 'card' | 'setup';
  immersive?: boolean;
  onConfigure?: () => void;
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
  const startButton = (
    <button
      className="primary camera-start-button"
      disabled={!ready && !onConfigure}
      onClick={() => {
        if (!ready) {
          onConfigure?.();
          return;
        }
        setError('');
        onStart?.();
        setActive(true);
      }}
    >
      <CameraIcon size={20} aria-hidden="true" />{' '}
      {!ready && onConfigure
        ? t('gameScreen.configurePlayback')
        : t('components.Camera.startCamera')}
    </button>
  );
  return (
    <div
      className={
        'camera-wrap' +
        (immersive ? ' camera-immersive' : '') +
        (active ? ' is-active' : ' is-idle')
      }
    >
      <div className="camera-view">
        <video
          ref={video}
          playsInline
          muted
          autoPlay
          aria-label={t('components.Camera.cameraPreview')}
        />
        <div className="scan-frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          {!active && immersive && <ScanLine className="scan-frame-icon" size={44} />}
          {active && <span className="scan-sweep" />}
        </div>
        {!active && (
          <div className="camera-start">
            {!immersive && <ScanLine size={52} aria-hidden="true" />}
            <h3>
              {purpose === 'setup'
                ? t('components.Camera.scanSpotifyConfiguration')
                : !ready
                  ? t('plainPlayback.prepareSpotify')
                  : pairingRequired && !paired
                    ? t('plainPlayback.scanPairingCode')
                    : t('components.Camera.scanAMusicCard')}
            </h3>
            <p>
              {purpose === 'setup'
                ? t('components.Camera.pointTheCameraAtTheConfiguration')
                : !ready
                  ? t('plainPlayback.chooseSpotifyDevice')
                  : pairingRequired && !paired
                    ? t('plainPlayback.pairingCodeLocation')
                    : t('plainPlayback.pointAtCard')}
            </p>
            {!immersive && startButton}
          </div>
        )}
        {active && immersive && (
          <p className="camera-guidance">
            {pairingRequired && !paired
              ? t('plainPlayback.scanPairingCode')
              : t('plainPlayback.pointAtCard')}
          </p>
        )}
      </div>
      <div className="camera-actions">
        {error && (
          <p className="error" role="alert">
            {displayTranslation(error)}
          </p>
        )}
        {active && track && <CameraZoom track={track} />}
        {!active && immersive && startButton}
        {active && (
          <button className="quiet camera-stop-button" onClick={() => setActive(false)}>
            <CameraOff size={18} aria-hidden="true" /> {t('components.Camera.stopCamera')}
          </button>
        )}
      </div>
    </div>
  );
}
