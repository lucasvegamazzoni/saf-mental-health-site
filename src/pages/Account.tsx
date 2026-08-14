import { useState } from 'react';
import { Link } from 'react-router-dom';
import { clearProfile, getProfile, saveProfile } from '../lib/store';
import './Account.css';

const AVATARS = ['🌱', '🌊', '🏔️', '🌙', '🍃', '⭐', '🪨', '🔥'];
const ALIAS_MAX = 20;

export default function Account() {
  const [profile, setProfile] = useState(getProfile);
  const [alias, setAlias] = useState('');
  const [emoji, setEmoji] = useState(AVATARS[0]);

  const create = () => {
    const trimmed = alias.trim();
    if (!trimmed) return;
    const next = { alias: trimmed, emoji, createdISO: new Date().toISOString() };
    saveProfile(next);
    setProfile(next);
  };

  const signOut = () => {
    clearProfile();
    setProfile(null);
    setAlias('');
    setEmoji(AVATARS[0]);
  };

  if (profile) {
    const since = new Date(profile.createdISO).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return (
      <div className="account-page">
        <section className="account-card" aria-label="Your space">
          <span className="account-avatar" aria-hidden="true">
            {profile.emoji}
          </span>
          <h1 className="account-title">{profile.alias}</h1>
          <p className="account-sub">With us since {since}. Good to have you here.</p>
          <ul className="account-facts">
            <li>Your check-ins, timeline and challenges live under this call sign.</li>
            <li>It exists only in this browser — no email, no real name, nothing uploaded.</li>
            <li>Anything you ever share publicly stays anonymous regardless.</li>
          </ul>
          <div className="account-actions">
            <Link className="account-primary" to="/me">
              Go to your space
            </Link>
            <button type="button" className="account-secondary" onClick={signOut}>
              Sign out
            </button>
          </div>
          <p className="account-note">
            Signing out only removes the call sign — your check-ins stay on this device.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="account-page">
      <header className="account-head">
        <h1 className="account-title">Make it yours.</h1>
        <p className="account-sub">
          Pick a call sign so this space can remember your check-ins. No real names, no email —
          it never leaves this device.
        </p>
      </header>

      <section className="account-card" aria-label="Create your space">
        <label className="account-label" htmlFor="account-alias">
          Your call sign
        </label>
        <input
          id="account-alias"
          className="account-input"
          type="text"
          value={alias}
          maxLength={ALIAS_MAX}
          placeholder="e.g. QuietTiger — not your real name"
          onChange={(e) => setAlias(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
          }}
        />

        <p className="account-label" id="account-avatar-label">
          Pick a marker
        </p>
        <div className="account-avatars" role="radiogroup" aria-labelledby="account-avatar-label">
          {AVATARS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={emoji === option}
              className={`account-avatar-btn${emoji === option ? ' is-picked' : ''}`}
              onClick={() => setEmoji(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="account-primary"
          disabled={!alias.trim()}
          onClick={create}
        >
          Create my space
        </button>

        <p className="account-note">
          Demo account: it lives only in this browser. When the real site launches, accounts will
          work the same way — a call sign, never your name, rank or unit.
        </p>
      </section>
    </div>
  );
}
