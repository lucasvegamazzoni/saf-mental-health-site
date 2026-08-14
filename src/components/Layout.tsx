import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { EMERGENCY_CONTACTS } from '../data/content';
import { getProfile, onProfileChange } from '../lib/store';
import './Layout.css';

function Leaf({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21 C11 14 12 8 17 3 C19 9 17 16 12 21 Z M12 21 C12 15 10 10 5 7 C5 13 8 18 12 21 Z"
        fill="currentColor"
      />
    </svg>
  );
}

const NAV_LINKS = [
  { to: '/check-in', label: 'Check-in' },
  { to: '/stories', label: 'Stories' },
  { to: '/resources', label: 'Resources' },
  { to: '/me', label: 'Me' },
];

export default function Layout() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [profile, setProfile] = useState(getProfile);

  useEffect(() => onProfileChange(() => setProfile(getProfile())), []);

  return (
    <div className="layout">
      <header className="layout-nav">
        <NavLink to="/" className="layout-brand" aria-label="Not Alone — home">
          <Leaf className="layout-brand-leaf" />
          Not Alone.
        </NavLink>
        <nav className="layout-links" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `layout-link${isActive ? ' is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            to="/account"
            className={({ isActive }) => `layout-account${isActive ? ' is-active' : ''}`}
            aria-label={profile ? `Your space — ${profile.alias}` : 'Sign in'}
          >
            {profile ? (
              <>
                <span aria-hidden="true">{profile.emoji}</span> {profile.alias}
              </>
            ) : (
              'Sign in'
            )}
          </NavLink>
        </nav>
      </header>

      <main className="layout-main">
        <Outlet />
      </main>

      <footer className="layout-footer">
        <Leaf className="layout-footer-leaf" />
        <p>A demo wellbeing space. Everything you enter stays on this device.</p>
      </footer>

      <div className="layout-help">
        {helpOpen && (
          <div className="layout-help-card" role="dialog" aria-label="People you can talk to">
            <p className="layout-help-title">You don't have to carry it alone.</p>
            <ul className="layout-help-list">
              {EMERGENCY_CONTACTS.map((contact) => (
                <li key={contact.label} className="layout-help-item">
                  {contact.href ? (
                    <a
                      href={contact.href}
                      className="layout-help-name"
                      {...(contact.href.startsWith('http')
                        ? { target: '_blank', rel: 'noreferrer' }
                        : {})}
                    >
                      {contact.label}
                    </a>
                  ) : (
                    <span className="layout-help-name">{contact.label}</span>
                  )}
                  <span className="layout-help-detail">{contact.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="button"
          className="layout-help-btn"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((open) => !open)}
        >
          {helpOpen ? 'Close' : 'Need someone to talk to?'}
        </button>
      </div>
    </div>
  );
}
