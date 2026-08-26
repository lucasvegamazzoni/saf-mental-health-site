import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CHECKIN_QUESTIONS, CHECKIN_SCALE } from '../data/content';
import type { CheckinScore } from '../data/content';
import { currentUid, firebaseReady, useSession } from '../lib/auth';
import { saveCheckinEverywhere } from '../lib/sync';
import type { CheckinAnswer } from '../lib/store';
import './CheckIn.css';

const TOTAL = CHECKIN_QUESTIONS.length;

interface DraftAnswer {
  score: CheckinScore;
  followUps: string[];
}

interface Props {
  /** Rendered inside the "Me" page tabs (tighter spacing, h2 heading). */
  embedded?: boolean;
}

export default function CheckIn({ embedded = false }: Props) {
  const session = useSession();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Record<string, DraftAnswer>>({});
  const [done, setDone] = useState(false);
  const [lowCount, setLowCount] = useState(0);
  const savedRef = useRef(false);

  const question = CHECKIN_QUESTIONS[step];
  const current = draft[question.id];
  const followUpOpen =
    question.followUp !== undefined && current !== undefined && current.score <= 1;

  function complete(finalDraft: Record<string, DraftAnswer>) {
    if (savedRef.current) return;
    savedRef.current = true;
    const answers: CheckinAnswer[] = CHECKIN_QUESTIONS.flatMap((q) => {
      const a = finalDraft[q.id];
      return a ? [{ qid: q.id, score: a.score, followUps: a.followUps }] : [];
    });
    void saveCheckinEverywhere({ dateISO: new Date().toISOString(), answers }, currentUid());
    setLowCount(answers.filter((a) => a.score === 0).length);
    setDone(true);
  }

  function advance(nextDraft: Record<string, DraftAnswer>) {
    if (step < TOTAL - 1) {
      setStep(step + 1);
    } else {
      complete(nextDraft);
    }
  }

  function handleScore(score: CheckinScore) {
    const needsFollowUp = question.followUp !== undefined && score <= 1;
    // Keep chip picks when switching between the two low answers; clear otherwise.
    const keptFollowUps =
      needsFollowUp && current !== undefined && current.score <= 1 ? current.followUps : [];
    const nextDraft = {
      ...draft,
      [question.id]: { score, followUps: keptFollowUps },
    };
    setDraft(nextDraft);
    if (!needsFollowUp) advance(nextDraft);
  }

  function toggleFollowUp(option: string) {
    if (current === undefined) return;
    const followUps = current.followUps.includes(option)
      ? current.followUps.filter((o) => o !== option)
      : [...current.followUps, option];
    setDraft({ ...draft, [question.id]: { ...current, followUps } });
  }

  function goBack() {
    if (step > 0) setStep(step - 1);
  }

  const pageClass = `checkin-page${embedded ? ' checkin-page--embedded' : ''}`;
  const Heading = embedded ? 'h2' : 'h1';
  const signedIn = session.status === 'in';
  const canSave = firebaseReady && !signedIn;

  if (done) {
    return (
      <div className={pageClass}>
        <section className="checkin-finish" aria-live="polite">
          <span className="checkin-finish-mark" aria-hidden="true">
            ✔
          </span>
          <Heading className="checkin-finish-title">Thanks for checking in.</Heading>
          <p className="checkin-finish-line">
            {signedIn
              ? 'Noticing how you feel is already a step. This one is saved under your call sign.'
              : 'Noticing how you feel is already a step. This one is saved on this device.'}
          </p>
          {lowCount >= 3 && (
            <div className="checkin-finish-gentle">
              <p>
                It sounds like this week has been heavy. You don&rsquo;t have to carry it alone
                — the <strong>&ldquo;Need someone to talk to?&rdquo;</strong> button in the
                corner lists people who will listen, and{' '}
                <Link to="/resources">our resources</Link> have small things that can help.
              </p>
            </div>
          )}
          <div className="checkin-finish-links">
            {canSave ? (
              <>
                <Link
                  className="checkin-btn checkin-btn--primary"
                  to={`/account?mode=create&next=${encodeURIComponent('/me?tab=timeline')}`}
                >
                  Keep it with a call sign
                </Link>
                <Link className="checkin-btn checkin-btn--ghost" to="/stories">
                  Not now — read stories
                </Link>
              </>
            ) : (
              <>
                <Link className="checkin-btn checkin-btn--primary" to="/me?tab=timeline">
                  See your timeline
                </Link>
                <Link className="checkin-btn checkin-btn--ghost" to="/stories">
                  Read stories from others
                </Link>
              </>
            )}
          </div>
          {canSave && (
            <p className="checkin-note">
              A call sign keeps your timeline on any phone — no name, no email, ever.
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <header className="checkin-head">
        <Heading className="checkin-title">30-Second Check-in</Heading>
        <p className="checkin-lede">Ten quick taps, just for you.</p>
      </header>

      <div className="checkin-topline">
        <button
          type="button"
          className="checkin-back"
          onClick={goBack}
          disabled={step === 0}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M10 3 L5 8 L10 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <span className="checkin-count" aria-live="polite">
          {step + 1} of {TOTAL}
        </span>
      </div>

      <div className="checkin-dots" aria-hidden="true">
        {CHECKIN_QUESTIONS.map((q, i) => (
          <span
            key={q.id}
            className={
              'checkin-dot' +
              (i < step ? ' is-done' : '') +
              (i === step ? ' is-current' : '')
            }
          />
        ))}
      </div>

      <section className="checkin-card" key={question.id}>
        <h3 className="checkin-question">{question.text}</h3>

        <div className="checkin-scale" role="group" aria-label="Your answer">
          {CHECKIN_SCALE.map((point) => (
            <button
              key={point.score}
              type="button"
              className={
                'checkin-answer' + (current?.score === point.score ? ' is-selected' : '')
              }
              aria-pressed={current?.score === point.score}
              onClick={() => handleScore(point.score)}
            >
              <span className="checkin-answer-emoji" aria-hidden="true">
                {point.emoji}
              </span>
              <span className="checkin-answer-label">
                {question.scaleLabels ? question.scaleLabels[point.score] : point.label}
              </span>
            </button>
          ))}
        </div>

        {followUpOpen && question.followUp && (
          <div className="checkin-followup">
            <p className="checkin-followup-prompt">{question.followUp.prompt}</p>
            <p className="checkin-followup-hint">Optional — tap any that apply.</p>
            <div className="checkin-chips" role="group" aria-label={question.followUp.prompt}>
              {question.followUp.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    'checkin-chip' +
                    (current !== undefined && current.followUps.includes(option)
                      ? ' is-selected'
                      : '')
                  }
                  aria-pressed={current !== undefined && current.followUps.includes(option)}
                  onClick={() => toggleFollowUp(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="checkin-continue"
              onClick={() => advance(draft)}
            >
              {current !== undefined && current.followUps.length > 0
                ? 'Continue'
                : 'Skip & continue'}
            </button>
          </div>
        )}
      </section>

      <p className="checkin-note">
        {signedIn
          ? 'Saved under your call sign — no one else can see it.'
          : 'Your answers stay on this device — no one else sees them.'}
      </p>
    </div>
  );
}
