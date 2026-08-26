import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SignInGate from '../components/SignInGate';
import Spinner from '../components/Spinner';
import { useSession } from '../lib/auth';
import { MIN_GROUP, readTrend, recentWeekIds } from '../lib/trends';
import type { TrendSummary } from '../lib/trends';
import './Trends.css';

const WEEKS_BACK = 4;
const MOODS = ['Tough', 'Okay', 'Good'] as const;
const MOOD_CLASS = ['tough', 'okay', 'good'] as const;
const TOP_REASONS = 8;

type Load =
  | { state: 'loading' }
  | { state: 'ready'; trend: TrendSummary | null }
  | { state: 'error'; message: string };

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function weekLabel(id: string, index: number): string {
  if (index === 0) return 'This week';
  if (index === 1) return 'Last week';
  return id.replace(/^\d{4}-W/, 'Week ');
}

/** /trends — anonymous weekly aggregates. Signed-in only; counts only, never people. */
export default function Trends() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const weeks = recentWeekIds(WEEKS_BACK);
  const requested = params.get('week');
  const week = requested !== null && weeks.includes(requested) ? requested : weeks[0];
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const signedIn = session.status === 'in';

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    setLoad({ state: 'loading' });
    readTrend(week)
      .then((trend) => live && setLoad({ state: 'ready', trend }))
      .catch((err: unknown) =>
        live &&
        setLoad({
          state: 'error',
          message: err instanceof Error ? err.message : "Couldn't load this week.",
        }),
      );
    return () => {
      live = false;
    };
  }, [week, signedIn]);

  function pickWeek(id: string) {
    const next = new URLSearchParams(params);
    if (id === weeks[0]) next.delete('week');
    else next.set('week', id);
    setParams(next, { replace: true });
  }

  return (
    <div className="trends-page">
      <header className="trends-head">
        <p className="trends-kicker">This week, together</p>
        <h1 className="trends-title">How the week has been for everyone.</h1>
        <p className="trends-body">
          A week-by-week picture built from check-ins, added up. Commanders can look too — by
          design there is nothing here about any one person, only the group.
        </p>
      </header>

      {session.status === 'loading' && (
        <section className="trends-wait" aria-live="polite">
          <Spinner size={56} label="Checking your call sign" />
        </section>
      )}

      {session.status === 'out' && (
        <SignInGate
          what="the weekly picture"
          next="/trends"
          note="Trends are only shown to people with a call sign. Signing in never links your own check-ins to this page."
        />
      )}

      {signedIn && (
        <>
          <div className="trends-weeks" role="group" aria-label="Choose a week">
            {weeks.map((id, i) => (
              <button
                key={id}
                type="button"
                className={'trends-week' + (id === week ? ' is-selected' : '')}
                aria-pressed={id === week}
                onClick={() => pickWeek(id)}
              >
                {weekLabel(id, i)}
              </button>
            ))}
          </div>
          <p className="trends-weekid">Showing {week}</p>

          {load.state === 'loading' && (
            <section className="trends-wait" aria-live="polite">
              <Spinner size={56} label="Adding up the week" />
            </section>
          )}

          {load.state === 'error' && (
            <section className="trends-card" role="alert">
              <p>{load.message}</p>
              <button
                type="button"
                className="trends-secondary"
                onClick={() => pickWeek(week)}
              >
                Try again
              </button>
            </section>
          )}

          {load.state === 'ready' && (load.trend === null || load.trend.n < MIN_GROUP) && (
            <section className="trends-card" role="status">
              <p>
                Not enough check-ins this week to show a trend (we need at least {MIN_GROUP} so no
                one can be picked out).
              </p>
              {week === weeks[0] && (
                <Link className="trends-secondary" to="/check-in">
                  Do this week's check-in
                </Link>
              )}
            </section>
          )}

          {load.state === 'ready' && load.trend !== null && load.trend.n >= MIN_GROUP && (
            <TrendView trend={load.trend} />
          )}

          <p className="trends-foot">
            Each finished check-in adds one tick to this week's counts — the overall mood and any
            reasons picked. No call sign, no scores per question, no time of day is stored here,
            so there is no way to work back to a person.
          </p>
        </>
      )}
    </div>
  );
}

function TrendView({ trend }: { trend: TrendSummary }) {
  const moodTotal = trend.overall.reduce((s, v) => s + v, 0);
  const reasons = Object.entries(trend.reasons)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_REASONS);
  const maxReason = reasons.length > 0 ? reasons[0][1] : 0;

  const moodSummary = MOODS.map(
    (m, i) => `${m}: ${trend.overall[i]} (${pct(trend.overall[i], moodTotal)}%)`,
  ).join(', ');

  return (
    <section className="trends-panel" aria-labelledby="trends-n">
      <h2 id="trends-n" className="trends-n">
        {trend.n} check-in{trend.n === 1 ? '' : 's'}
      </h2>

      <h3 className="trends-h3">Overall mood</h3>
      <figure className="trends-moods">
        <div className="trends-moodbar" aria-hidden="true">
          {MOODS.map((m, i) => (
            <span
              key={m}
              className={`trends-moodseg trends-moodseg--${MOOD_CLASS[i]}`}
              style={{ flexGrow: Math.max(trend.overall[i], 0) }}
            />
          ))}
        </div>
        <figcaption className="trends-moodlegend">
          <span className="sr-only">Overall mood split — {moodSummary}.</span>
          {MOODS.map((m, i) => (
            <span key={m} className="trends-moodkey" aria-hidden="true">
              <span className={`trends-moodswatch trends-moodseg--${MOOD_CLASS[i]}`} />
              <strong>{m}</strong> {trend.overall[i]} · {pct(trend.overall[i], moodTotal)}%
            </span>
          ))}
        </figcaption>
      </figure>

      <h3 className="trends-h3">Top reasons</h3>
      {reasons.length === 0 ? (
        <p className="trends-body">No reasons were picked this week.</p>
      ) : (
        <ol className="trends-reasons">
          {reasons.map(([label, count]) => (
            <li key={label} className="trends-reason">
              <span className="trends-reason-label">{label}</span>
              <span className="trends-reason-track" aria-hidden="true">
                <span
                  className="trends-reason-fill"
                  style={{ width: `${pct(count, maxReason)}%` }}
                />
              </span>
              <span className="trends-reason-num">
                {count} <span aria-hidden="true">·</span>
                <span className="sr-only"> check-ins, </span> {pct(count, trend.n)}%
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="trends-body trends-small">
        Percentages are out of {trend.n} check-ins; one check-in can pick several reasons.
      </p>
    </section>
  );
}
