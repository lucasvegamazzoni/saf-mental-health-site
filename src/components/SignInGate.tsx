import { Link } from 'react-router-dom';
import { firebaseReady } from '../lib/auth';
import './SignInGate.css';

interface Props {
  /** What the visitor unlocks, e.g. "your timeline" */
  what: string;
  /** Where to return after signing in (a path, optionally with ?query) */
  next: string;
  /** Optional extra line under the title */
  note?: string;
}

/** Calm prompt shown in place of account-only content. */
export default function SignInGate({ what, next, note }: Props) {
  const to = (mode: 'create' | 'signin') =>
    `/account?mode=${mode}&next=${encodeURIComponent(next)}`;

  if (!firebaseReady) {
    return (
      <section className="gate" aria-label="Sign in required">
        <p className="gate-kicker">Almost there</p>
        <h2 className="gate-title">Accounts are being switched on.</h2>
        <p className="gate-body">
          Soon you'll be able to keep {what} under a username — no name, no email. Until then,
          everything you do here stays on this device.
        </p>
      </section>
    );
  }

  return (
    <section className="gate" aria-label="Sign in required">
      <p className="gate-kicker">Just a username</p>
      <h2 className="gate-title">Keep {what} with a username.</h2>
      <p className="gate-body">
        {note ?? 'No name, no email, no unit — just something only you know, so it follows you to any phone.'}
      </p>
      <div className="gate-actions">
        <Link className="gate-primary" to={to('create')}>
          Create my space
        </Link>
        <Link className="gate-secondary" to={to('signin')}>
          I already have one
        </Link>
      </div>
    </section>
  );
}
