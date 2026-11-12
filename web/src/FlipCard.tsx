import type { ReactNode } from 'react';
import './flip-card.css';

export default function FlipCard({
  flipped,
  front,
  back,
}: {
  flipped: boolean;
  front: ReactNode;
  back: ReactNode;
}) {
  return (
    <div className="flip-card" data-flipped={flipped}>
      <div className="flip-card-rotor">
        <div className="flip-card-face" aria-hidden={flipped} inert={flipped}>
          {front}
        </div>
        <div className="flip-card-face flip-card-reverse" aria-hidden={!flipped} inert={!flipped}>
          {back}
        </div>
      </div>
    </div>
  );
}
