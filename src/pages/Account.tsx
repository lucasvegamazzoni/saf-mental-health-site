import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CloudFace from '../components/CloudFace';
import Spinner from '../components/Spinner';
import { rovingKeyDown } from '../lib/roving';
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

export default function Account() {
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Only same-origin paths may be used as a return target (security audit LUC-95).
  const rawNext = params.get('next');
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : '/me?tab=timeline';

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
            <li>Your check-ins, timeline and challenges live under this username.</li>
            <li>No email, no real name, no unit — the username is all we know.</li>
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
            Signing out on this phone keeps your check-ins safe under your username.
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
            ? 'A username and a password — nothing else. It follows your check-ins to any phone, and it never asks for your name.'
            : 'Your username and password bring your space to this phone.'}
        </p>
      </header>

      <form className="account-card" onSubmit={submit} noValidate>
        <CloudFace eyesClosed={pwFocused} />

        <div
          className="account-modes"
          role="tablist"
          aria-label="Create or sign in"
          onKeyDown={(e) => rovingKeyDown(e, '[role="tab"]')}
        >
          <button
            type="button"
            role="tab"
            id="account-tab-create"
            aria-selected={creating}
            aria-controls="account-panel"
            tabIndex={creating ? 0 : -1}
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
            id="account-tab-signin"
            aria-selected={!creating}
            aria-controls="account-panel"
            tabIndex={creating ? -1 : 0}
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

        <div
          id="account-panel"
          role="tabpanel"
          aria-labelledby={creating ? 'account-tab-create' : 'account-tab-signin'}
          className="account-panel"
        >
        <fieldset className="account-fields" disabled={!firebaseReady || pending}>
          <label className="account-label" htmlFor="account-callsign">
            Username
          </label>
          <input
            id="account-callsign"
            className="account-input"
            type="text"
            autoComplete="username"
            value={callSign}
            maxLength={CALL_SIGN_MAX}
            placeholder={creating ? 'e.g. QuietTiger — not your real name' : 'Your username'}
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
                onKeyDown={(e) => rovingKeyDown(e, '[role="radio"]')}
              >
                {MARKERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={marker === option}
                    aria-label={`Marker ${option}`}
                    tabIndex={marker === option ? 0 : -1}
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
          {creating && (
            <p className="account-hint" id="account-password-hint">
              At least 6 characters. There is no reset — pick one you will remember.
            </p>
          )}
          <input
            id="account-password"
            aria-describedby={creating ? 'account-password-hint' : undefined}
            aria-invalid={error ? true : undefined}
            className="account-input"
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            value={password}
            placeholder={creating ? '' : 'Your password'}
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
        </div>

        <p className="account-note">
          {creating
            ? 'Forget the password and the space is gone — there is no email to reset it with. That is the price of never asking who you are.'
            : 'No username yet? Switch to “Create my space” — it takes ten seconds.'}
        </p>
      </form>
    </div>
  );
}
