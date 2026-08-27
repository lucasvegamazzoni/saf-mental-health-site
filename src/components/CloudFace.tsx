import { useEffect, useState } from 'react';
import './CloudFace.css';

/* Cloud face — the site mascot. Eyes follow the cursor, blink now and then, and
   politely close when asked (the account page does this while a password is typed).
   Purely decorative: it is aria-hidden and carries no text. Shared by Account and NotFound. */
export default function CloudFace({ eyesClosed = false }: { eyesClosed?: boolean }) {
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: MouseEvent) => {
      setPupil({
        x: (e.clientX / window.innerWidth - 0.5) * 14,
        y: (e.clientY / window.innerHeight - 0.5) * 6,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 170);
    }, 3400);
    return () => clearInterval(interval);
  }, []);

  const closed = eyesClosed || blink;

  return (
    <div className="cloud" aria-hidden="true">
      <svg viewBox="0 0 260 150" className="cloud-svg">
        <g fill="var(--paper)" stroke="var(--blue-hill)" strokeWidth="3" strokeLinejoin="round">
          <circle cx="78" cy="86" r="38" />
          <circle cx="130" cy="64" r="50" />
          <circle cx="186" cy="88" r="36" />
          <rect x="52" y="84" width="170" height="42" rx="21" />
        </g>
        {/* cover the inner strokes so the cloud reads as one soft shape */}
        <g fill="var(--paper)">
          <circle cx="78" cy="86" r="35" />
          <circle cx="130" cy="64" r="47" />
          <circle cx="186" cy="88" r="33" />
          <rect x="55" y="87" width="164" height="36" rx="18" />
        </g>
        <circle cx="92" cy="104" r="7" fill="var(--terra-soft)" opacity="0.45" />
        <circle cx="168" cy="104" r="7" fill="var(--terra-soft)" opacity="0.45" />
        <path
          d={eyesClosed ? 'M119 110 H141' : 'M116 106 Q130 118 144 106'}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {(['left', 'right'] as const).map((side) => (
        <span key={side} className={`cloud-eye cloud-eye--${side}${closed ? ' is-closed' : ''}`}>
          {!closed && (
            <span
              className="cloud-pupil"
              style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)` }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
