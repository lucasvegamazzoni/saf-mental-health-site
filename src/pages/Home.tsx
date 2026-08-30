import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useSeo } from '../lib/seo';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import { FEATURES } from '../lib/flags';
import SignInGate from '../components/SignInGate';
import Spinner from '../components/Spinner';
const QrTree = lazy(() => import('../components/QrTree'));
import { RECOGNITION_SEED } from '../data/content';
import { pollForWeek, weekId } from '../data/polls';
import { useSession } from '../lib/auth';
import {
  listPublishedRecognitions,
  myPollVote,
  pollCounts,
  submitRecognition,
  votePoll as votePollRemote,
} from '../lib/db';
import type { RecognitionDoc } from '../lib/db';
import { getPollVote, votePoll as cachePollVote } from '../lib/store';
import './Home.css';

const RECOGNITION_MAX = 120;
const WALL_SIZE = 6;
const WALL_MIN_REAL = 3;

const WEEK = weekId(new Date());
const POLL = pollForWeek(WEEK);

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

type CountsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; counts: Record<string, number>; n: number }
  | { status: 'error'; message: string };

type WallState =
  | { status: 'loading' }
  | { status: 'ok'; items: RecognitionDoc[] }
  | { status: 'error'; message: string };

type SubmitState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent' }
  | { status: 'error'; message: string };

const errMessage = (err: unknown) =>
  err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';

/* Poll ------------------------------------------------------------------- */

function PollCard() {
  const session = useSession();
  const uid = session.status === 'in' ? session.session.uid : null;

  // Local cache first (store.ts), then the server copy for this week.
  const [vote, setVote] = useState<string | null>(() => getPollVote());
  const [changing, setChanging] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [counts, setCounts] = useState<CountsState>({ status: 'idle' });

  const loadCounts = useCallback(async () => {
    setCounts({ status: 'loading' });
    try {
      const c = await pollCounts(WEEK, POLL.options);
      const n = Object.values(c).reduce((a, b) => a + b, 0);
      setCounts({ status: 'ok', counts: c, n });
    } catch (err) {
      setCounts({ status: 'error', message: errMessage(err) });
    }
  }, []);

  // When signed in, reconcile the cached vote with the server's copy for this week.
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    myPollVote(WEEK, uid)
      .then((remote) => {
        if (!alive) return;
        if (remote) {
          setVote(remote);
          cachePollVote(remote);
        } else {
          // A cached vote from an earlier week must not count as this week's.
          setVote(null);
        }
      })
      .catch(() => {
        /* keep the cached value; counts will surface any real problem */
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  useEffect(() => {
    if (uid && vote && !changing) void loadCounts();
  }, [uid, vote, changing, loadCounts]);

  const handleVote = async (option: string) => {
    if (!uid || voting) return;
    setVoting(option);
    setVoteError(null);
    try {
      await votePollRemote(WEEK, uid, option);
      cachePollVote(option);
      setVote(option);
      setChanging(false);
    } catch (err) {
      setVoteError(errMessage(err));
    } finally {
      setVoting(null);
    }
  };

  const options = (
    <div className="home-pulse-options">
      {POLL.options.map((option) => {
        const busy = voting === option;
        return (
          <button
            key={option}
            type="button"
            className={option === vote ? 'home-pulse-option is-current' : 'home-pulse-option'}
            aria-pressed={option === vote}
            disabled={voting !== null}
            onClick={() => void handleVote(option)}
          >
            {busy && <Spinner size={18} label="" className="home-pulse-option-spinner" />}
            {option}
          </button>
        );
      })}
    </div>
  );

  if (session.status === 'loading') {
    return (
      <div className="home-pulse-wait spinner-slot" aria-live="polite">
        <Spinner size={48} label="Checking your username" />
      </div>
    );
  }

  if (!uid) {
    return (
      <>
        <ul className="home-pulse-preview" aria-label="This week's options">
          {POLL.options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ul>
        <SignInGate
          what="your vote"
          next="/"
          note="Sign in to add your voice — results are shared, never who voted."
        />
      </>
    );
  }

  if (vote === null || changing) {
    return (
      <>
        {options}
        {voteError && (
          <p className="home-pulse-error" role="alert">
            {voteError}
          </p>
        )}
        <p className="home-pulse-hint">
          {changing
            ? 'Pick a new answer — it replaces your earlier one.'
            : 'One tap, once a week. Only the count is shared, never who voted.'}
        </p>
        {changing && (
          <button type="button" className="home-pulse-change" onClick={() => setChanging(false)}>
            Keep my answer
          </button>
        )}
      </>
    );
  }

  const showSample = counts.status === 'error';
  const rows = showSample
    ? POLL.sampleResults.map((r) => ({ option: r.option, percent: r.percent, count: null as number | null }))
    : counts.status === 'ok'
      ? POLL.options.map((option) => {
          const count = counts.counts[option] ?? 0;
          return { option, count, percent: counts.n ? Math.round((count / counts.n) * 100) : 0 };
        })
      : null;

  return (
    <div className="home-pulse-results" aria-live="polite">
      {counts.status === 'loading' && (
        <div className="home-pulse-wait spinner-slot">
          <Spinner size={48} label="Counting this week's answers" />
        </div>
      )}

      {showSample && (
        <p className="home-pulse-sample" role="alert">
          <span className="home-pulse-sample-badge">sample data</span>
          Live counts could not load ({counts.message}). {POLL.sampleNote}
        </p>
      )}

      {rows && (
        <ul className="home-pulse-bars">
          {rows.map((row) => {
            const isMine = row.option === vote;
            return (
              <li key={row.option} className={isMine ? 'home-pulse-row is-mine' : 'home-pulse-row'}>
                <div className="home-pulse-row-top">
                  <span className="home-pulse-row-label">
                    {row.option}
                    {isMine && <span className="home-pulse-mine-tag">your pick</span>}
                  </span>
                  <span className="home-pulse-row-pct">{row.percent}%</span>
                </div>
                <div className="home-pulse-track">
                  <span className="home-pulse-fill" style={{ width: `${row.percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {counts.status === 'ok' && (
        <p className="home-pulse-n">
          {counts.n === 1 ? '1 person' : `${counts.n} people`} this week
        </p>
      )}

      <div className="home-pulse-actions">
        <button type="button" className="home-pulse-change" onClick={() => setChanging(true)}>
          Change my answer
        </button>
        {counts.status === 'error' && (
          <button type="button" className="home-pulse-change" onClick={() => void loadCounts()}>
            Try live counts again
          </button>
        )}
      </div>
      <p className="home-pulse-hint">Thanks for adding your voice — the count is shared, your pick is not.</p>
    </div>
  );
}

/* Recognition wall ---------------------------------------------------------- */

interface WallNote {
  key: string;
  text: string;
  illustrative: boolean;
}

function RecognitionWall() {
  const session = useSession();
  const uid = session.status === 'in' ? session.session.uid : null;

  const [wall, setWall] = useState<WallState>({ status: 'loading' });
  const [draft, setDraft] = useState('');
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  useEffect(() => {
    let alive = true;
    listPublishedRecognitions()
      .then((items) => alive && setWall({ status: 'ok', items: items.slice(0, WALL_SIZE) }))
      .catch((err) => alive && setWall({ status: 'error', message: errMessage(err) }));
    return () => {
      alive = false;
    };
  }, []);

  const real: WallNote[] =
    wall.status === 'ok'
      ? wall.items.map((r) => ({ key: r.id, text: r.text, illustrative: false }))
      : [];
  const notes: WallNote[] =
    wall.status !== 'loading' && real.length < WALL_MIN_REAL
      ? [
          ...real,
          ...RECOGNITION_SEED.map((text, i) => ({ key: `seed-${i}`, text, illustrative: true })),
        ]
      : real;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim().slice(0, RECOGNITION_MAX);
    if (!text || !uid || submit.status === 'sending') return;
    setSubmit({ status: 'sending' });
    try {
      await submitRecognition(text, uid);
      setDraft('');
      setSubmit({ status: 'sent' });
    } catch (err) {
      setSubmit({ status: 'error', message: errMessage(err) });
    }
  };

  const remaining = RECOGNITION_MAX - draft.length;

  return (
    <>
      {wall.status === 'loading' ? (
        <div className="home-wall-wait spinner-slot" aria-live="polite">
          <Spinner size={48} label="" />
          <span>Loading the wall…</span>
        </div>
      ) : (
        <>
          {wall.status === 'error' && (
            <p className="home-wall-note" role="alert">
              The shared wall could not load ({wall.message}). Showing a few illustrative notes instead.
            </p>
          )}
          <ul className="home-wall-grid">
            {notes.map((note) => (
              <li key={note.key} className="home-wall-card">
                <span className="home-wall-quote" aria-hidden="true">
                  “
                </span>
                <p>{note.text}</p>
                {note.illustrative && <span className="home-wall-tag">Illustrative</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {!uid ? (
        <p className="home-wall-signin">
          <Link to={`/account?mode=signin&next=${encodeURIComponent('/')}`}>Sign in with a username</Link> to
          add a thank-you. A moderator reads every note before it goes up — never with a name attached.
        </p>
      ) : submit.status === 'sent' ? (
        <div className="home-wall-sent" role="status">
          <p className="home-wall-sent-title">Thanks — a moderator will post it shortly.</p>
          <p className="home-wall-sent-sub">Your username is not shown on the wall.</p>
          <button type="button" className="home-pulse-change" onClick={() => setSubmit({ status: 'idle' })}>
            Add another
          </button>
        </div>
      ) : (
        <form className="home-wall-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="home-wall-label" htmlFor="home-wall-input">
            Add your own appreciation — it goes to a moderator first
          </label>
          <p className="home-wall-help" id="home-wall-help">
            No names, ranks or units — describe what they did, not who they are.
          </p>
          <div className="home-wall-controls">
            <input
              id="home-wall-input"
              className="home-wall-input"
              type="text"
              maxLength={RECOGNITION_MAX}
              placeholder="Thank someone — no names needed"
              aria-describedby="home-wall-help home-wall-count"
              value={draft}
              disabled={submit.status === 'sending'}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="submit"
              className="home-wall-submit"
              disabled={submit.status === 'sending' || !draft.trim()}
            >
              {submit.status === 'sending' ? (
                <>
                  <Spinner size={18} label="" fill="#fbf7ef" /> Sending…
                </>
              ) : (
                'Send to a moderator'
              )}
            </button>
          </div>
          {submit.status === 'error' && (
            <p className="home-wall-error" role="alert">
              {submit.message}
            </p>
          )}
          <p className="home-wall-count" id="home-wall-count">
            {remaining} characters left
          </p>
        </form>
      )}
    </>
  );
}

/* Page --------------------------------------------------------------------- */

export default function Home() {
  useSeo(
    'SAF Check-in — anonymous mental wellbeing check-in for NSFs and SAF servicemen',
    'A free, anonymous wellbeing check-in for NSFs and SAF servicemen. Thirty seconds a week, no name needed. Real stories from National Service, practical tips for stress and sleep, and verified helplines.',
    '/',
  );
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
      {FEATURES.qrTree && (
      <Suspense
        fallback={
          <div className="qrtree qrtree--loading spinner-slot" aria-hidden="true">
            <Spinner label="" />
          </div>
        }
      >
        <QrTree />
      </Suspense>
      )}

      {/* This week's pulse */}
      {FEATURES.polls && (
      <section className="home-pulse" aria-labelledby="home-pulse-question">
        <div className="home-pulse-card">
          <p className="home-pulse-kicker">This week’s pulse</p>
          <h2 id="home-pulse-question">{POLL.question}</h2>
          <PollCard />
        </div>
      </section>
      )}

      {/* Recognition wall */}
      {FEATURES.recognition && (
      <section className="home-wall" aria-labelledby="home-wall-title">
        <div className="home-wall-head">
          <h2 id="home-wall-title">Recognition wall</h2>
          <p>Small thank-yous to the people who made a hard week lighter.</p>
        </div>
        <RecognitionWall />
      </section>
      )}

      {/* Soft footer */}
      <section className="home-footnote" aria-label="Privacy note">
        <p className="home-footnote-strong">Your check-ins stay on this device.</p>
        <p className="home-footnote-sub">
          Votes and thank-yous are shared as counts and words only — never with a name. Built with
          care for Singapore’s servicemen, so the tough weeks feel a little less lonely.
        </p>
      </section>
    </div>
  );
}
