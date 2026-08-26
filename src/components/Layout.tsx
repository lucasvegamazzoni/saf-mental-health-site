import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { EMERGENCY_CONTACTS } from '../data/content';
import { useSession } from '../lib/auth';
import { useIsModerator } from '../lib/db';
import Companion from './Companion';
import './Layout.css';

/** The leaf mark — used exactly twice on purpose: the wordmark and the footer sign-off. */
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
  { to: '/stories', label: 'Stories' },
  { to: '/resources', label: 'Resources' },
  { to: '/me', label: 'Me' },
];

export default function Layout() {
  const [helpOpen, setHelpOpen] = useState(false);
  const session = useSession();
  const isModerator = useIsModerator();

  return (
    <div className="layout">
      <header className="layout-nav">
        <NavLink to="/" className="layout-brand" aria-label="SAF Check-in — home">
          <Leaf className="layout-brand-leaf" />
          SAF Check-in
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
          {isModerator && (
            <NavLink
              to="/moderate"
              className={({ isActive }) => `layout-link${isActive ? ' is-active' : ''}`}
            >
              Moderate
            </NavLink>
          )}
          <NavLink
            to="/account"
            className={({ isActive }) =>
              `layout-account${isActive ? ' is-active' : ''}${session.status === 'loading' ? ' is-loading' : ''}`
            }
            aria-label={
              session.status === 'in' ? `Your space — ${session.session.callSign}` : 'Sign in'
            }
          >
            {session.status === 'in' ? (
              <>
                <span aria-hidden="true">{session.session.marker}</span> {session.session.callSign}
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
        <p>SAF Check-in · Anonymous by design. Nothing here needs your name.</p>
      </footer>

      <Companion />

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
