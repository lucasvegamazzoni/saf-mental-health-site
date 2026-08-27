import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SignInGate from '../components/SignInGate';
import { CHALLENGES, CHECKIN_SCALE } from '../data/content';
import type { CheckinScore, ScalePoint } from '../data/content';
import { firebaseReady, useSession } from '../lib/auth';
import { usePwaInstall } from '../lib/pwa';
import { rovingKeyDown } from '../lib/roving';
import { getChallengeDone, getCheckins, onStoreChange, toggleChallenge } from '../lib/store';
import type { CheckinEntry } from '../lib/store';
import CheckIn from './CheckIn';
import './Me.css';

/* Helpers ------------------------------------------------------------------ */

function averageScore(entry: CheckinEntry): number | null {
  const scores = entry.answers
    .map((a) => (a && typeof a.score === 'number' && a.score >= 0 && a.score <= 2 ? a.score : null))
    .filter((s): s is CheckinScore => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((sum: number, s) => sum + s, 0) / scores.length;
}

function scalePointFor(avg: number): ScalePoint {
  const rounded = Math.min(2, Math.max(0, Math.round(avg)));
  return CHECKIN_SCALE.find((p) => p.score === rounded) ?? CHECKIN_SCALE[1];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function scoreFor(entry: CheckinEntry, qid: string): number | null {
  const answer = entry.answers.find((a) => a && a.qid === qid);
  if (!answer || typeof answer.score !== 'number') return null;
  return answer.score >= 0 && answer.score <= 2 ? answer.score : null;
}

const MICRO_STATS = [
  { qid: 'mood', label: 'Happiness', emoji: '😊', higherIsBetter: true },
  { qid: 'energy', label: 'Energy', emoji: '⚡', higherIsBetter: true },
  { qid: 'sleep', label: 'Sleep', emoji: '🌙', higherIsBetter: true },
  { qid: 'stress', label: 'Stress', emoji: '🌧️', higherIsBetter: false },
] as const;

type Tab = 'check-in' | 'timeline' | 'challenges';
const TABS: { id: Tab; label: string }[] = [
  { id: 'check-in', label: 'Check-in' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'challenges', label: 'Challenges' },
];
const isTab = (v: string | null): v is Tab =>
  v === 'check-in' || v === 'timeline' || v === 'challenges';

/* Sparkline ----------------------------------------------------------------- */

const SPARK_W = 320;
const SPARK_H = 96;
const SPARK_PAD_X = 12;
const SPARK_PAD_Y = 14;

function Sparkline({
  points,
  label,
}: {
  points: { avg: number; dateLabel: string }[];
  label: string;
}) {
  const innerW = SPARK_W - SPARK_PAD_X * 2;
  const innerH = SPARK_H - SPARK_PAD_Y * 2;
  const coords = points.map((p, i) => ({
    x: SPARK_PAD_X + (i * innerW) / (points.length - 1),
    y: SPARK_PAD_Y + ((2 - p.avg) / 2) * innerH,
  }));
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${SPARK_H - SPARK_PAD_Y} L ${coords[0].x.toFixed(1)} ${SPARK_H - SPARK_PAD_Y} Z`;
  const gridYs = [0, 1, 2].map((s) => SPARK_PAD_Y + ((2 - s) / 2) * innerH);

  return (
    <div className="me-spark-row">
      <div className="me-spark-scale" aria-hidden="true">
        <span>😊</span>
        <span>😞</span>
      </div>
      <svg
        className="me-spark"
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        role="img"
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
      >
        {gridYs.map((y) => (
          <line
            key={y}
            x1={SPARK_PAD_X}
            x2={SPARK_W - SPARK_PAD_X}
            y1={y}
            y2={y}
            stroke="rgba(46, 58, 52, 0.1)"
            strokeWidth="1"
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        ))}
        <path d={area} fill="rgba(169, 191, 160, 0.22)" stroke="none" />
        <path
          d={line}
          fill="none"
          stroke="var(--pine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="4"
            fill="var(--pine)"
            stroke="var(--paper)"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

/* Empty state ---------------------------------------------------------------- */

function EmptyTimeline({ onStart }: { onStart: () => void }) {
  return (
    <div className="me-empty">
      <svg className="me-empty-art" viewBox="0 0 260 84" aria-hidden="true">
        <path
          d="M16 66 C60 58 96 62 132 46 C168 30 204 34 244 22"
          fill="none"
          stroke="var(--sage-deep)"
          strokeWidth="2"
          strokeDasharray="1 9"
          strokeLinecap="round"
        />
        <circle cx="16" cy="66" r="5" fill="var(--gold)" />
        <circle cx="132" cy="46" r="4" fill="none" stroke="var(--sage-deep)" strokeWidth="2" />
        <circle cx="244" cy="22" r="5" fill="var(--terra)" />
      </svg>
      <h2 className="me-empty-title">Your timeline starts with your first 30-second check-in</h2>
      <p className="me-empty-body">
        A gentle snapshot of how your week is going, drawn a little further with every check-in.
      </p>
      <button type="button" className="me-empty-cta" onClick={onStart}>
        Start my first check-in
      </button>
    </div>
  );
}

/* Page ----------------------------------------------------------------------- */

const TIMELINE_LIMIT = 12;

interface Props {
  /** Tab to open when the URL has none (the /check-in route passes 'check-in'). */
  initialTab?: Tab;
}

export default function Me({ initialTab }: Props) {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const pwa = usePwaInstall();
  const signedIn = session.status === 'in';
  const gated = firebaseReady && !signedIn;

  const urlTab = params.get('tab');
  const tab: Tab = isTab(urlTab) ? urlTab : (initialTab ?? (signedIn ? 'timeline' : 'check-in'));
  const setTab = (next: Tab) => setParams({ tab: next });

  // Re-read the local cache whenever a check-in is saved or synced.
  const [version, setVersion] = useState(0);
  useEffect(() => onStoreChange(() => setVersion((v) => v + 1)), []);

  const timeline = useMemo(
    () =>
      getCheckins()
        .map((entry) => {
          const avg = averageScore(entry);
          return avg === null
            ? null
            : {
                avg,
                point: scalePointFor(avg),
                dateLabel: formatDate(entry.dateISO),
                entry,
              };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const [doneIds, setDoneIds] = useState<ReadonlySet<string>>(
    () => new Set(CHALLENGES.filter((c) => getChallengeDone(c.id)).map((c) => c.id)),
  );

  function handleToggle(id: string) {
    const nowDone = toggleChallenge(id);
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const recent = timeline.slice(-TIMELINE_LIMIT);
  const latest = timeline[timeline.length - 1];
  const previous = timeline[timeline.length - 2];
  const doneCount = doneIds.size;
  const allDone = doneCount === CHALLENGES.length;

  return (
    <div className="me-page">
      <header className="me-head">
        <h1>Your space</h1>
        <p className="me-sub">
          {signedIn ? (
            <>
              <span aria-hidden="true">{session.session.marker}</span> {session.session.callSign} —
              good to have you here.
            </>
          ) : (
            'Check in now. Keep it with a call sign whenever you like.'
          )}
        </p>
      </header>

      <div
        className="me-tabs"
        role="tablist"
        aria-label="Your space"
        onKeyDown={(e) => rovingKeyDown(e, '[role="tab"]')}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`me-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`me-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`me-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id !== 'check-in' && gated && (
              <span className="me-tab-lock" aria-hidden="true">
                ·
              </span>
            )}
            {t.id !== 'check-in' && gated && (
              <span className="me-visually-hidden"> (needs a call sign)</span>
            )}
          </button>
        ))}
      </div>

      {/* Check-in ------------------------------------------------------------ */}
      {tab === 'check-in' && (
        <section id="me-panel-check-in" role="tabpanel" aria-labelledby="me-tab-check-in">
          <CheckIn embedded />
        </section>
      )}

      {/* Timeline ------------------------------------------------------------ */}
      {tab === 'timeline' && (
        <section
          id="me-panel-timeline"
          role="tabpanel"
          aria-labelledby="me-tab-timeline"
          className="me-section"
        >
          {gated ? (
            <SignInGate
              what="your timeline"
              next="/me?tab=timeline"
              note={
                timeline.length > 0
                  ? `You have ${timeline.length} check-in${timeline.length === 1 ? '' : 's'} on this phone. A call sign keeps them together — and brings them to your next phone.`
                  : undefined
              }
            />
          ) : timeline.length === 0 ? (
            <EmptyTimeline onStart={() => setTab('check-in')} />
          ) : (
            <div className="me-card">
              {recent.length >= 2 && (
                <Sparkline
                  points={recent}
                  label={`Average check-in score across your last ${recent.length} check-ins, from ${recent[0].dateLabel} to ${recent[recent.length - 1].dateLabel}.`}
                />
              )}

              {timeline.length >= 2 && previous && (
                <ul
                  className="me-stats"
                  aria-label="How each area moved since your previous check-in"
                >
                  {MICRO_STATS.map((stat) => {
                    const now = scoreFor(latest.entry, stat.qid);
                    const before = scoreFor(previous.entry, stat.qid);
                    if (now === null || before === null) {
                      return (
                        <li key={stat.qid} className="me-stat">
                          <span className="me-stat-emoji" aria-hidden="true">
                            {stat.emoji}
                          </span>
                          <span className="me-stat-label">{stat.label}</span>
                          <span className="me-trend me-trend--steady">—</span>
                        </li>
                      );
                    }
                    const delta = now - before;
                    const word = delta > 0 ? 'Up' : delta < 0 ? 'Down' : 'Steady';
                    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '→';
                    const tone =
                      delta === 0
                        ? 'steady'
                        : delta > 0 === stat.higherIsBetter
                          ? 'better'
                          : 'worse';
                    return (
                      <li key={stat.qid} className="me-stat">
                        <span className="me-stat-emoji" aria-hidden="true">
                          {stat.emoji}
                        </span>
                        <span className="me-stat-label">{stat.label}</span>
                        <span
                          className={`me-trend me-trend--${tone}`}
                          title={`${stat.label}: ${word.toLowerCase()} compared with your previous check-in`}
                        >
                          <span aria-hidden="true">{arrow}</span> {word}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <ol className="me-chips" aria-label="Your check-ins, oldest first">
                {recent.map((t, i) => (
                  <li
                    key={`${t.entry.dateISO}-${i}`}
                    className={`me-chip${i === recent.length - 1 ? ' is-latest' : ''}`}
                  >
                    <span className="me-chip-emoji" aria-hidden="true">
                      {t.point.emoji}
                    </span>
                    <span className="me-chip-date">{t.dateLabel}</span>
                    <span className="me-visually-hidden">Feeling: {t.point.label}</span>
                  </li>
                ))}
              </ol>

              {timeline.length > TIMELINE_LIMIT && (
                <p className="me-note">Showing your last {TIMELINE_LIMIT} check-ins.</p>
              )}
              {timeline.length === 1 && (
                <p className="me-note">One more check-in and your trend line appears here.</p>
              )}

              <button type="button" className="me-add-link" onClick={() => setTab('check-in')}>
                Add today’s check-in
              </button>
            </div>
          )}
        </section>
      )}

      {/* Challenges ------------------------------------------------------------ */}
      {tab === 'challenges' && (
        <section
          id="me-panel-challenges"
          role="tabpanel"
          aria-labelledby="me-tab-challenges"
          className="me-section"
        >
          {gated ? (
            <SignInGate what="your challenges" next="/me?tab=challenges" />
          ) : (
            <>
              <div className="me-section-head">
                <h2 className="me-section-title">Growth challenges</h2>
                <span className={`me-badge${allDone ? ' is-complete' : ''}`}>
                  {doneCount} of {CHALLENGES.length} this week
                </span>
              </div>

              <ul className="me-challenges">
                {CHALLENGES.map((challenge) => {
                  const done = doneIds.has(challenge.id);
                  return (
                    <li key={challenge.id}>
                      <button
                        type="button"
                        className={`me-challenge${done ? ' is-done' : ''}`}
                        aria-pressed={done}
                        onClick={() => handleToggle(challenge.id)}
                      >
                        <span className="me-challenge-check" aria-hidden="true">
                          {done ? '✔' : ''}
                        </span>
                        <span className="me-challenge-text">{challenge.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="me-note">Tap one to mark it done — small wins count.</p>
            </>
          )}
        </section>
      )}

      {/* Privacy note ---------------------------------------------------------- */}
      <aside className="me-privacy" aria-label="Privacy note">
        <div className="me-privacy-inner">
          <h2 className="me-privacy-title">Private by design</h2>
          <p className="me-privacy-body">
            {signedIn
              ? 'Your check-ins and challenges are kept under your call sign only. There is no name, email or unit attached — nobody, including us, can tell who you are.'
              : 'Check-ins are saved in this browser, on this device. Nothing is uploaded unless you choose to keep it under a call sign — and even then, no name is ever attached.'}
          </p>
          {pwa.shouldShowHint && (
            <div className="me-install">
              <p className="me-install-body">
                {pwa.canPrompt
                  ? 'Keep this a tap away — add it to your home screen. It opens like an app and still works when the signal drops.'
                  : 'In Safari, tap Share, then "Add to Home Screen" to keep this a tap away. It still opens when the signal drops.'}
              </p>
              <div className="me-install-actions">
                {pwa.canPrompt && (
                  <button
                    type="button"
                    className="me-install-btn"
                    onClick={() => void pwa.promptInstall()}
                  >
                    Add to Home Screen
                  </button>
                )}
                <button type="button" className="me-install-dismiss" onClick={pwa.dismiss}>
                  Not now
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
