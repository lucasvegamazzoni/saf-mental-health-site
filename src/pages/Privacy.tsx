import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, RUN_BY } from '../data/site';
import './Privacy.css';

const TITLE = 'Privacy — SAF Check-in';

/* /privacy — plain-language answers to "what do you keep about me?" (LUC-97). */
export default function Privacy() {
  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="privacy-page">
      <header className="privacy-head">
        <p className="privacy-eyebrow">Privacy</p>
        <h1 className="privacy-title">What we keep, and what we never ask.</h1>
        <p className="privacy-lead">
          This site is built so that nobody — including the people who run it — can tell who you
          are. Here is exactly what that means, in plain words.
        </p>
      </header>

      <section className="privacy-card" aria-labelledby="p-stored">
        <h2 id="p-stored">What is stored</h2>
        <ul>
          <li>
            <strong>Check-ins.</strong> Your answers to the weekly check-in are saved in this
            browser, on this device. If you create a username, a copy is also kept under that
            username so it can follow you to another phone.
          </li>
          <li>
            <strong>Username, marker and password.</strong> That is the whole account. No email, no
            real name, no NRIC, no rank, no unit — we never ask, so we never hold them.
          </li>
          <li>
            <strong>Stories.</strong> A story you share is anonymised on your phone before it is
            sent, you review the cleaned version, and only then does it go to a moderator. No
            username or account id is attached to it, ever.
          </li>
          <li>
            <strong>Nothing else.</strong> No analytics, no advertising trackers, no third-party
            cookies. One anti-spam check (Google reCAPTCHA) runs silently to keep bots out.
          </li>
        </ul>
      </section>

      <section className="privacy-card" aria-labelledby="p-where">
        <h2 id="p-where">Where it lives</h2>
        <p>
          On Google Firebase, in the Singapore region (asia-southeast1). Traffic is encrypted, and
          access rules mean a signed-in account can read only its own data.
        </p>
      </section>

      <section className="privacy-card" aria-labelledby="p-who">
        <h2 id="p-who">Who can see what</h2>
        <ul>
          <li>
            <strong>Your check-ins</strong> — only you. Not moderators, not the team, nobody.
          </li>
          <li>
            <strong>Your stories</strong> — a moderator reads the anonymised version before it is
            published. They see the story, never a username.
          </li>
          <li>
            <strong>Published stories</strong> — everyone who visits, which is the point.
          </li>
        </ul>
      </section>

      <section className="privacy-card" aria-labelledby="p-long">
        <h2 id="p-long">How long</h2>
        <p>
          Until you delete it. Check-ins on this device stay until you clear them; account copies
          stay until you delete your space. Account-less story sessions are cleaned up
          automatically after 30 days. Published stories stay up as long as the site does, because
          they belong to no one and help everyone.
        </p>
      </section>

      <section className="privacy-card" aria-labelledby="p-delete">
        <h2 id="p-delete">How to delete</h2>
        <ul>
          <li>
            <strong>Clear this device</strong> — on <Link to="/me">Me</Link>, under “Private by
            design”. Wipes every check-in saved in this browser. Good for a shared bunk phone.
          </li>
          <li>
            <strong>Delete my space</strong> — on <Link to="/account">your account page</Link>.
            Removes your username, your password and every check-in kept under it. It is
            immediate and cannot be undone. Stories you already shared stay published — they
            carry nothing that links back to you.
          </li>
        </ul>
      </section>

      <section className="privacy-card privacy-card--contact" aria-labelledby="p-contact">
        <h2 id="p-contact">Who runs this</h2>
        <p>
          SAF Check-in is run by {RUN_BY}. It is not an official MINDEF or SAF service. Questions,
          concerns, or something on the site that should not be there:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p className="privacy-note">
          If you are in danger right now, do not email — use the “People you can talk to” button
          in the corner of every page.
        </p>
      </section>
    </div>
  );
}
