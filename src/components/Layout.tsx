import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CONTACT_GROUP_LABEL, EMERGENCY_CONTACTS } from '../data/contacts';
import type { ContactGroup, EmergencyContact } from '../data/contacts';
import { useSession } from '../lib/auth';
import { CONTACT_EMAIL, RUN_BY } from '../data/site';
import { useIsModerator } from '../lib/db';
import Companion from './Companion';
import { FEATURES } from '../lib/flags';
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

const CONTACT_GROUPS: ContactGroup[] = ['now', 'saf', 'peer'];
const CONTACTS_BY_GROUP = CONTACT_GROUPS.map((group) => ({
  group,
  label: CONTACT_GROUP_LABEL[group],
  contacts: EMERGENCY_CONTACTS.filter((c) => (c.group ?? 'peer') === group),
})).filter((g) => g.contacts.length > 0);
const VERIFIED_ON = EMERGENCY_CONTACTS.map((c) => c.verifiedOn)
  .filter(Boolean)
  .sort()
  .at(-1);

function formatVerified(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function HelpContact({ contact }: { contact: EmergencyContact }) {
  return (
    <li className="layout-help-item">
      <span className="layout-help-row">
        {contact.href ? (
          <a
            href={contact.href}
            className="layout-help-name"
            {...(contact.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
          >
            {contact.label}
          </a>
        ) : (
          <span className="layout-help-name">{contact.label}</span>
        )}
        {contact.hours && <span className="layout-help-hours">{contact.hours}</span>}
      </span>
      <span className="layout-help-detail">{contact.detail}</span>
      {contact.note && <p className="layout-help-note">{contact.note}</p>}
    </li>
  );
}

const NAV_LINKS = [
  { to: '/stories', label: 'Stories' },
  { to: '/resources', label: 'Resources' },
  { to: '/me', label: 'Me' },
];

export default function Layout() {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const session = useSession();
  const isModerator = useIsModerator();

  // Escape closes the help card (non-modal, so Tab is never trapped) and hands focus back to its button.
  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setHelpOpen(false);
      helpBtnRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [helpOpen]);

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
          {FEATURES.trends && session.status === 'in' && (
            <NavLink
              to="/trends"
              className={({ isActive }) => `layout-link${isActive ? ' is-active' : ''}`}
            >
              Trends
            </NavLink>
          )}
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
        <p>SAF Check-in · Anonymous by design. Nothing here necessarily needs your name.</p>
        <p className="layout-footer-meta">
          Run by {RUN_BY} — not an official SAF service.{' '}
          <NavLink to="/privacy">Privacy</NavLink> ·{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>Write to us</a>
        </p>
      </footer>

      {FEATURES.companion && <Companion />}

      <div className="layout-help">
        {helpOpen && (
          <div id="layout-help-card" className="layout-help-card" role="dialog" aria-label="People you can talk to">
            <p className="layout-help-title">You don't have to carry it alone.</p>
            {CONTACTS_BY_GROUP.map((section) => (
              <section key={section.group} className="layout-help-group" aria-label={section.label}>
                <p className="layout-help-group-title">{section.label}</p>
                <ul className="layout-help-list">
                  {section.contacts.map((contact) => (
                    <HelpContact key={contact.label} contact={contact} />
                  ))}
                </ul>
              </section>
            ))}
            {VERIFIED_ON && (
              <p className="layout-help-verified">Numbers checked {formatVerified(VERIFIED_ON)}.</p>
            )}
          </div>
        )}
        <button
          ref={helpBtnRef}
          type="button"
          className="layout-help-btn"
          aria-expanded={helpOpen}
          aria-controls="layout-help-card"
          onClick={() => setHelpOpen((open) => !open)}
        >
          {helpOpen ? 'Close' : 'Need someone to talk to?'}
        </button>
      </div>
    </div>
  );
}
