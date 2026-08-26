import { Suspense, lazy, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import Spinner from '../components/Spinner';
const QrTree = lazy(() => import('../components/QrTree'));
import { RECOGNITION_SEED, WEEKLY_POLL } from '../data/content';
import { addRecognition, getPollVote, getRecognitions, votePoll } from '../lib/store';
import './Home.css';

const RECOGNITION_MAX = 120;

const TEASERS = [
  {
    to: '/check-in',
    title: 'Weekly Check-in',
    line: 'Thirty seconds to notice how you are actually doing — no grades, no records.',
  },
  {
    to: '/stories',
    title: 'Anonymous Stories',
    line: 'Hear from others who have walked the same route and found their footing.',
  },
  {
    to: '/resources',
    title: 'Practical Resources',
    line: 'Small, doable tips for sleep, stress, recovery and the people around you.',
  },
];

export default function Home() {
  const [pollVote, setPollVote] = useState<string | null>(() => getPollVote());
  const [recognitions, setRecognitions] = useState<string[]>(() => getRecognitions());
  const [draft, setDraft] = useState('');

  const handleVote = (option: string) => {
    votePoll(option);
    setPollVote(option);
  };

  const handleAddRecognition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim().slice(0, RECOGNITION_MAX);
    if (!text) return;
    setRecognitions(addRecognition(text));
    setDraft('');
  };

  const wallNotes = [...RECOGNITION_SEED, ...recognitions];
  const remaining = RECOGNITION_MAX - draft.length;

  return (
    <div className="home-page">
      <Hero />

      {/* Reassurance strip */}
      <section className="home-reassure" aria-label="Reassurance">
        <h2>Struggling is normal. Growth is possible. No one has to face it alone.</h2>
        <p>
          Take a quiet minute here — check in with yourself, hear from others, or pick up
          something small and practical.
        </p>
      </section>

      {/* Teaser cards */}
      <section className="home-teasers" aria-label="Explore this site">
        {TEASERS.map((teaser) => (
          <Link key={teaser.to} to={teaser.to} className="home-teaser">
            <h3>{teaser.title}</h3>
            <p>{teaser.line}</p>
            <span className="home-teaser-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </section>

      {/* Blossom tree → QR (scroll to reveal) */}
      <Suspense
        fallback={
          <div className="qrtree qrtree--loading spinner-slot" aria-hidden="true">
            <Spinner label="" />
          </div>
        }
      >
        <QrTree />
      </Suspense>

      {/* This week's pulse */}
      <section className="home-pulse" aria-labelledby="home-pulse-question">
        <div className="home-pulse-card">
          <p className="home-pulse-kicker">This week’s pulse</p>
          <h2 id="home-pulse-question">{WEEKLY_POLL.question}</h2>

          {pollVote === null ? (
            <>
              <div className="home-pulse-options">
                {WEEKLY_POLL.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="home-pulse-option"
                    onClick={() => handleVote(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="home-pulse-hint">One tap, once a week. Your answer stays on this device.</p>
            </>
          ) : (
            <div className="home-pulse-results">
              <p className="home-pulse-sample">
                <span className="home-pulse-sample-badge">sample data</span>
                {WEEKLY_POLL.sampleNote}
              </p>
              <ul className="home-pulse-bars">
                {WEEKLY_POLL.sampleResults.map((result) => {
                  const isMine = result.option === pollVote;
                  return (
                    <li
                      key={result.option}
                      className={isMine ? 'home-pulse-row is-mine' : 'home-pulse-row'}
                    >
                      <div className="home-pulse-row-top">
                        <span className="home-pulse-row-label">
                          {result.option}
                          {isMine && <span className="home-pulse-mine-tag">your pick</span>}
                        </span>
                        <span className="home-pulse-row-pct">{result.percent}%</span>
                      </div>
                      <div className="home-pulse-track">
                        <span className="home-pulse-fill" style={{ width: `${result.percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="home-pulse-hint">Thanks for adding your voice — it never leaves this device.</p>
            </div>
          )}
        </div>
      </section>

      {/* Recognition wall */}
      <section className="home-wall" aria-labelledby="home-wall-title">
        <div className="home-wall-head">
          <h2 id="home-wall-title">Recognition wall</h2>
          <p>Small thank-yous to the people who made a hard week lighter.</p>
        </div>

        <ul className="home-wall-grid">
          {wallNotes.map((note, index) => (
            <li key={`${index}-${note}`} className="home-wall-card">
              <span className="home-wall-quote" aria-hidden="true">
                “
              </span>
              <p>{note}</p>
            </li>
          ))}
        </ul>

        <form className="home-wall-form" onSubmit={handleAddRecognition}>
          <label className="home-wall-label" htmlFor="home-wall-input">
            Add your own appreciation — it stays on this device
          </label>
          <div className="home-wall-controls">
            <input
              id="home-wall-input"
              className="home-wall-input"
              type="text"
              maxLength={RECOGNITION_MAX}
              placeholder="Thank someone — no names needed"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="home-wall-submit">
              Add it
            </button>
          </div>
          <p className="home-wall-count">{remaining} characters left</p>
        </form>
      </section>

      {/* Soft footer */}
      <section className="home-footnote" aria-label="Privacy note">
        <p className="home-footnote-strong">Everything you do here stays on this device.</p>
        <p className="home-footnote-sub">
          Built with care for Singapore’s servicemen — so the tough weeks feel a little less lonely.
        </p>
      </section>
    </div>
  );
}
