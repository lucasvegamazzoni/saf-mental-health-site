import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '../components/Spinner';
import {
  CALL_SIGN_MAX,
  DEFAULT_MARKER,
  firebaseReady,
  signIn,
  signOutUser,
  signUp,
  useSession,
} from '../lib/auth';
import './Account.css';

const MARKERS = ['🌱', '🌊', '🏔️', '🌙', '🍃', '⭐', '🪨', '🔥'];
type Mode = 'create' | 'signin';

/* Cloud face — eyes follow the cursor, blink now and then, and politely close
   while a password is being typed. */
function CloudFace({ eyesClosed }: { eyesClosed: boolean }) {
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
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
        <circle cx="92" cy="98" r="7" fill="var(--terra-soft)" opacity="0.45" />
        <circle cx="168" cy="98" r="7" fill="var(--terra-soft)" opacity="0.45" />
        <path
          d={eyesClosed ? 'M118 104 H142' : 'M116 100 Q130 112 144 100'}
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

export default function Account() {
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/me?tab=timeline';

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signin' ? 'signin' : 'create');
  const [callSign, setCallSign] = useState('');
  const [marker, setMarker] = useState(DEFAULT_MARKER);
  const [password, setPassword] = useState('');
  const [pwFocused, setPwFocused] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);

  useEffect(() => {
    if (justSigned && session.status === 'in') navigate(next, { replace: true });
  }, [justSigned, session.status, navigate, next]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'create') await signUp(callSign, marker, password);
      else await signIn(callSign, password);
      setJustSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setPending(false);
    }
  }

  if (session.status === 'loading') {
    return (
      <div className="account-page">
        <div className="spinner-slot">
          <Spinner size={56} label="Checking your space" />
        </div>
      </div>
    );
  }

  if (session.status === 'in' && !justSigned) {
    const { session: me } = session;
    const since = new Date(me.sinceISO).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return (
      <div className="account-page">
        <section className="account-card account-card--me" aria-label="Your space">
          <span className="account-avatar" aria-hidden="true">
            {me.marker}
          </span>
          <h1 className="account-title">{me.callSign}</h1>
          <p className="account-sub">With us since {since}. Good to have you here.</p>
          <ul className="account-facts">
            <li>Your check-ins, timeline and challenges live under this call sign.</li>
            <li>No email, no real name, no unit — the call sign is all we know.</li>
            <li>Anything you ever share publicly stays anonymous regardless.</li>
          </ul>
          <div className="account-actions">
            <Link className="account-primary" to="/me?tab=timeline">
              Go to your space
            </Link>
            <button type="button" className="account-secondary" onClick={() => void signOutUser()}>
              Sign out
            </button>
          </div>
          <p className="account-note">
            Signing out on this phone keeps your check-ins safe under your call sign.
          </p>
        </section>
      </div>
    );
  }

  const creating = mode === 'create';

  return (
    <div className="account-page">
      <header className="account-head">
        <h1 className="account-title">{creating ? 'Make it yours.' : 'Welcome back.'}</h1>
        <p className="account-sub">
          {creating
            ? 'A call sign and a password — nothing else. It follows your check-ins to any phone, and it never asks for your name.'
            : 'Your call sign and password bring your space to this phone.'}
        </p>
      </header>

      <form className="account-card" onSubmit={submit} noValidate>
        <CloudFace eyesClosed={pwFocused} />

        <div className="account-modes" role="tablist" aria-label="Create or sign in">
          <button
            type="button"
            role="tab"
            aria-selected={creating}
            className={`account-mode${creating ? ' is-active' : ''}`}
            onClick={() => {
              setMode('create');
              setError(null);
            }}
          >
            Create my space
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!creating}
            className={`account-mode${!creating ? ' is-active' : ''}`}
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
          >
            Sign in
          </button>
        </div>

        {!firebaseReady && (
          <p className="account-notice" role="status">
            Accounts are being switched on. Until then everything you do here stays on this
            device — come back soon.
          </p>
        )}

        <fieldset className="account-fields" disabled={!firebaseReady || pending}>
          <label className="account-label" htmlFor="account-callsign">
            Call sign
          </label>
          <input
            id="account-callsign"
            className="account-input"
            type="text"
            autoComplete="username"
            value={callSign}
            maxLength={CALL_SIGN_MAX}
            placeholder={creating ? 'e.g. QuietTiger — not your real name' : 'Your call sign'}
            onChange={(e) => setCallSign(e.target.value)}
          />

          {creating && (
            <>
              <p className="account-label" id="account-marker-label">
                Pick a marker
              </p>
              <div
                className="account-avatars"
                role="radiogroup"
                aria-labelledby="account-marker-label"
              >
                {MARKERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={marker === option}
                    className={`account-avatar-btn${marker === option ? ' is-picked' : ''}`}
                    onClick={() => setMarker(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="account-label" htmlFor="account-password">
            Password
          </label>
          <input
            id="account-password"
            className="account-input"
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            value={password}
            placeholder={creating ? 'At least 6 characters' : 'Your password'}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="account-primary"
            disabled={!callSign.trim() || !password}
          >
            {pending ? (
              <Spinner size={22} fill="#fbf7ef" label="" />
            ) : creating ? (
              'Create my space'
            ) : (
              'Sign in'
            )}
          </button>
        </fieldset>

        <p className="account-note">
          {creating
            ? 'Forget the password and the space is gone — there is no email to reset it with. That is the price of never asking who you are.'
            : 'No call sign yet? Switch to “Create my space” — it takes ten seconds.'}
        </p>
      </form>
    </div>
  );
}
