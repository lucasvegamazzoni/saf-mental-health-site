import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMERGENCY_CONTACTS, SEED_STORIES, STORY_THEMES } from '../data/content';
import type { Story } from '../data/content';
import SignInGate from '../components/SignInGate';
import Spinner from '../components/Spinner';
import StorySphere from '../components/StorySphere';
import { ensureAnonymousUid, firebaseReady, useSession } from '../lib/auth';
import { listPublishedStories, submitStory } from '../lib/db';
import type { StoryDoc } from '../lib/db';
import { anonymise, segments } from '../lib/anonymise';
import type { AnonymiseResult } from '../lib/anonymise';
import { flagRisks, needsCareNow } from '../lib/risk';
import { rovingKeyDown } from '../lib/roving';
import './Stories.css';

/* Helpers ----------------------------------------------------------------- */

function Dot({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="currentColor" />
    </svg>
  );
}

const HELPER_PROMPTS = [
  'What happened?',
  'How did you feel?',
  'What helped?',
  'What advice would you give?',
];

const HOPE_LABELS: Record<Story['hopeScore'], string> = {
  1: 'Still heavy',
  2: 'Getting by',
  3: 'Okay',
  4: 'Better',
  5: 'Good',
};

const MIN_WORDS = 20;
const PREVIEW_CHARS = 160;

function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function makePreview(paras: string[]): string {
  const flat = paras.join(' ');
  if (flat.length <= PREVIEW_CHARS) return flat;
  const cut = flat.slice(0, PREVIEW_CHARS);
  const atWord = cut.lastIndexOf(' ');
  return `${cut.slice(0, atWord > 80 ? atWord : PREVIEW_CHARS).trimEnd()}…`;
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readMinsFor(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 200));
}

function fromDoc(doc: StoryDoc): Story {
  return {
    id: doc.id,
    title: doc.title,
    theme: doc.theme,
    preview: doc.preview,
    body: doc.body,
    lessons: doc.lessons,
    hopeScore: doc.hopeScore,
    readMins: doc.readMins,
  };
}

/* Story card -------------------------------------------------------------- */

function HopeScore({ score }: { score: Story['hopeScore'] }) {
  return (
    <span className="stories-hope" role="img" aria-label={`Hope score ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Dot key={n} className={`stories-hope-leaf${n <= score ? ' is-filled' : ''}`} />
      ))}
      <span className="stories-hope-num" aria-hidden="true">
        {score}/5
      </span>
    </span>
  );
}

function storyCardId(id: string): string {
  return `story-${id}`;
}

function StoryCard({
  story,
  expanded,
  onToggle,
}: {
  story: Story;
  expanded: boolean;
  onToggle: () => void;
}) {
  const themeEmoji = STORY_THEMES.find((t) => t.label === story.theme)?.emoji;
  const bodyId = `stories-more-${story.id}`;

  return (
    <article id={storyCardId(story.id)} className="stories-card" tabIndex={-1}>
      <div className="stories-card-meta">
        <span className="stories-tag">
          {themeEmoji && <span aria-hidden="true">{themeEmoji}</span>} {story.theme}
        </span>
        {story.illustrative && <span className="stories-tag-sample">Illustrative</span>}
        <HopeScore score={story.hopeScore} />
        <span className="stories-readtime">{story.readMins} min read</span>
      </div>

      <h2 className="stories-card-title">{story.title}</h2>
      <p className="stories-card-preview">{story.preview}</p>

      <div id={bodyId} className="stories-card-more" hidden={!expanded}>
        {story.body.map((para, i) => (
          <p key={`${i}-${para.slice(0, 24)}`} className="stories-card-para">
            {para}
          </p>
        ))}
        {story.lessons.length > 0 && (
          <div className="stories-lessons">
            <h3 className="stories-lessons-title">What helped this person?</h3>
            <ul className="stories-lessons-list">
              {story.lessons.map((lesson) => (
                <li key={lesson} className="stories-lesson">
                  <span className="stories-lesson-check" aria-hidden="true">
                    ✔
                  </span>
                  {lesson}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        className="stories-readmore"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        {expanded ? 'Show less' : 'Read more'}
      </button>
    </article>
  );
}

/* Share flow -------------------------------------------------------------- */

type Step = 'write' | 'review' | 'sent';

interface Sent {
  flags: string[];
}

function ShareStory({ uid }: { uid: string | null }) {
  const [step, setStep] = useState<Step>('write');
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState('');
  const [reviewed, setReviewed] = useState<AnonymiseResult | null>(null);
  const [titleReviewed, setTitleReviewed] = useState<AnonymiseResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState('');
  const [theme, setTheme] = useState<string | null>(null);
  const [hope, setHope] = useState<Story['hopeScore'] | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  const words = wordCount(draft);
  const tooShort = words < MIN_WORDS;

  const goReview = () => {
    const r = anonymise(draft.trim());
    setReviewed(r);
    setTitleReviewed(anonymise(title.trim()));
    setEdited(r.text);
    setEditing(false);
    setError(null);
    setStep('review');
  };

  const finalText = editing ? edited : (reviewed?.text ?? '');
  const canSubmit = Boolean(theme) && hope !== null && finalText.trim().length > 0 && !pending;

  const submit = async () => {
    if (!theme || hope === null) return;
    setPending(true);
    setError(null);
    try {
      // Safety net: the writer may have typed a name back in while editing.
      const safe = anonymise(finalText.trim()).text;
      const safeTitle = (titleReviewed?.text ?? '').trim();
      const body = toParagraphs(safe);
      const flags = flagRisks(safe);
      // No call sign? An anonymous Firebase session gives us a throwaway uid that is never linked to a person.
      const authorUid = uid ?? (await ensureAnonymousUid());
      await submitStory({
        theme,
        title: safeTitle || 'An anonymous story',
        preview: makePreview(body),
        body,
        lessons: [],
        hopeScore: hope,
        readMins: readMinsFor(safe),
        authorUid,
        flags,
      });
      setSent({ flags });
      setStep('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — nothing was sent.');
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setStep('write');
    setTitle('');
    setDraft('');
    setReviewed(null);
    setTitleReviewed(null);
    setEditing(false);
    setEdited('');
    setTheme(null);
    setHope(null);
    setSent(null);
    setError(null);
  };

  if (step === 'sent' && sent) {
    const care = needsCareNow(sent.flags);
    return (
      <section className="stories-share" aria-labelledby="stories-share-title">
        <div className="stories-sent" role="status">
          <p className="stories-kicker">Sent</p>
          <h2 id="stories-share-title" className="stories-share-title">
            Thank you for sharing.
          </h2>
          <p className="stories-sent-body">
            Sent to a moderator. It stays anonymous — nothing here shows who you are. Once it is
            approved it will appear on this page.
          </p>
          {care && (
            <div className="stories-care">
              <p className="stories-care-title">
                That sounded like a heavy stretch. If any of it is still with you, these people are
                glad to hear from you — any time, no explanation needed.
              </p>
              <ul className="stories-care-list">
                {EMERGENCY_CONTACTS.map((c) => (
                  <li key={c.label} className="stories-care-item">
                    {c.href ? (
                      <a className="stories-care-name" href={c.href} target="_blank" rel="noreferrer">
                        {c.label}
                      </a>
                    ) : (
                      <span className="stories-care-name">{c.label}</span>
                    )}
                    <span className="stories-care-detail">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="stories-secondary" onClick={reset}>
            Share another
          </button>
        </div>
      </section>
    );
  }

  if (step === 'review' && reviewed) {
    const n = reviewed.changes.length + (titleReviewed?.changes.length ?? 0);
    return (
      <section className="stories-share" aria-labelledby="stories-share-title">
        <p className="stories-kicker">Review before sharing</p>
        <h2 id="stories-share-title" className="stories-share-title">
          Here is how it will read.
        </h2>
        <p className="stories-share-prompt" role="status">
          {n === 0
            ? 'We did not spot any details that could identify someone. You can still edit.'
            : `We removed ${n} ${n === 1 ? 'detail' : 'details'} that could identify someone. You can still edit.`}
        </p>

        {titleReviewed && titleReviewed.text && (
          <p className="stories-review-title">
            {segments(titleReviewed).map((s, i) =>
              s.change ? (
                <mark key={i} className="stories-mark" title={`Was: ${s.change.from}`}>
                  {s.text}
                </mark>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )}
          </p>
        )}

        {editing ? (
          <>
            <label className="stories-label" htmlFor="stories-edit">
              Your story (edited)
            </label>
            <textarea
              id="stories-edit"
              className="stories-share-input"
              rows={9}
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
            />
          </>
        ) : (
          <div className="stories-review" role="region" aria-label="Anonymised story">
            {toParagraphsWithMarks(reviewed)}
          </div>
        )}

        <div className="stories-review-actions">
          <button
            type="button"
            className="stories-secondary"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? 'Done editing' : 'Edit'}
          </button>
          <button
            type="button"
            className="stories-secondary"
            onClick={() => {
              setStep('write');
              setError(null);
            }}
          >
            Back
          </button>
        </div>

        <fieldset className="stories-fieldset" disabled={pending}>
          <legend className="stories-label">Which theme fits best?</legend>
          <div
            className="stories-pick"
            role="radiogroup"
            aria-label="Theme"
            onKeyDown={(e) => rovingKeyDown(e, '[role="radio"]')}
          >
            {STORY_THEMES.map((t, i) => (
              <button
                key={t.label}
                type="button"
                role="radio"
                aria-checked={theme === t.label}
                tabIndex={theme === t.label || (theme === null && i === 0) ? 0 : -1}
                className={`stories-chip${theme === t.label ? ' is-active' : ''}`}
                onClick={() => setTheme(t.label)}
              >
                <span aria-hidden="true">{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="stories-fieldset" disabled={pending}>
          <legend className="stories-label">How are you doing now?</legend>
          <div
            className="stories-pick"
            role="radiogroup"
            aria-label="How you are doing now"
            onKeyDown={(e) => rovingKeyDown(e, '[role="radio"]')}
          >
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={hope === n}
                tabIndex={hope === n || (hope === null && n === 1) ? 0 : -1}
                className={`stories-chip stories-hope-chip${hope === n ? ' is-active' : ''}`}
                onClick={() => setHope(n)}
              >
                <span className="stories-hope-chip-num">{n}</span> {HOPE_LABELS[n]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="stories-error" role="alert">
            {error}
          </p>
        )}

        <div className="stories-share-actions">
          <button
            type="button"
            className="stories-share-submit"
            disabled={!canSubmit}
            onClick={submit}
          >
            {pending ? <Spinner size={22} fill="#fbf7ef" label="" /> : 'Send to a moderator'}
          </button>
          <span className="stories-share-note">
            This leaves your device and goes to a moderator. No call sign is shown with it.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="stories-share" aria-labelledby="stories-share-title">
      <h2 id="stories-share-title" className="stories-share-title">
        Share Your Story
      </h2>
      <p className="stories-share-prompt">
        What's something you've been through that might help someone else?
      </p>
      {uid === null && (
        <p className="stories-share-anon">
          No call sign needed — your story is stored with no link to you. With a call sign you could
          edit or withdraw it later, but it is never required.
        </p>
      )}
      <ul className="stories-share-hints" aria-label="Prompts to get you started">
        {HELPER_PROMPTS.map((prompt) => (
          <li key={prompt} className="stories-share-hint">
            {prompt}
          </li>
        ))}
      </ul>

      <label className="stories-label" htmlFor="stories-title">
        A short title <span className="stories-label-opt">(optional)</span>
      </label>
      <input
        id="stories-title"
        className="stories-title-input"
        type="text"
        maxLength={80}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="stories-label" htmlFor="stories-draft">
        Your story
      </label>
      <textarea
        id="stories-draft"
        className="stories-share-input"
        placeholder="Write as much or as little as you like…"
        rows={7}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <p className="stories-count" aria-live="polite">
        {tooShort ? `${words}/${MIN_WORDS} words to get started` : `${words} words`}
      </p>

      <div className="stories-share-actions">
        <button
          type="button"
          className="stories-share-submit"
          disabled={tooShort}
          onClick={goReview}
        >
          Review before sharing
        </button>
        <span className="stories-share-note">
          Next you'll see it with names and places removed. Nothing is sent yet.
        </span>
      </div>
    </section>
  );
}

/** Render the anonymised text as paragraphs, with each placeholder highlighted. */
function toParagraphsWithMarks(result: AnonymiseResult) {
  const segs = segments(result);
  const paras: Array<Array<{ text: string; change?: AnonymiseResult['changes'][number] }>> = [[]];
  for (const s of segs) {
    if (s.change) {
      paras[paras.length - 1].push(s);
      continue;
    }
    const parts = s.text.split(/\n\s*\n|\n/);
    parts.forEach((part, i) => {
      if (i > 0) paras.push([]);
      if (part) paras[paras.length - 1].push({ text: part });
    });
  }
  return paras
    .filter((p) => p.length > 0)
    .map((p, pi) => (
      <p key={pi} className="stories-card-para">
        {p.map((s, i) =>
          s.change ? (
            <mark key={i} className="stories-mark" title={`Was: ${s.change.from}`}>
              {s.text}
            </mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
    ));
}

/* Page -------------------------------------------------------------------- */

export default function Stories() {
  const [params, setParams] = useSearchParams();
  const activeTheme = params.get('theme');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Set by the sphere: after the card expands, scroll to it and move focus there.
  const jumpTo = useRef<string | null>(null);
  const [remote, setRemote] = useState<Story[] | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const session = useSession();
  const uid = session.status === 'in' ? session.session.uid : null;

  useEffect(() => {
    let live = true;
    listPublishedStories()
      .then((docs) => {
        if (!live) return;
        setRemote(docs.map(fromDoc));
        setLoadState('ready');
      })
      .catch(() => {
        if (!live) return;
        setRemote([]);
        setLoadState('error');
      });
    return () => {
      live = false;
    };
  }, []);

  const all = useMemo(() => [...(remote ?? []), ...SEED_STORIES], [remote]);
  const visible = activeTheme ? all.filter((story) => story.theme === activeTheme) : all;

  useEffect(() => {
    const id = jumpTo.current;
    if (!id || expandedId !== id) return;
    jumpTo.current = null;
    const el = document.getElementById(storyCardId(id));
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }, [expandedId]);

  const openStory = (id: string) => {
    jumpTo.current = id;
    setExpandedId(id);
  };

  const setTheme = (label: string | null) => {
    const next = new URLSearchParams(params);
    if (label) next.set('theme', label);
    else next.delete('theme');
    setParams(next, { replace: true });
  };

  return (
    <div className="stories-page">
      <header className="stories-head">
        <h1 className="stories-title">Real Stories. Real Growth.</h1>
        <p className="stories-sub">
          Every story shared here is completely anonymous. Names and identifying details are
          automatically removed so everyone can speak honestly and safely.
        </p>
        <p className="stories-banner">
          <span aria-hidden="true">🌱</span> Illustrative stories, written from common NS
          experiences. Real anonymous stories appear here as they're approved.
        </p>
      </header>

      <div className="stories-chips" role="group" aria-label="Filter stories by theme">
        <button
          type="button"
          className={`stories-chip${activeTheme === null ? ' is-active' : ''}`}
          aria-pressed={activeTheme === null}
          onClick={() => setTheme(null)}
        >
          All
        </button>
        {STORY_THEMES.map((theme) => (
          <button
            key={theme.label}
            type="button"
            className={`stories-chip${activeTheme === theme.label ? ' is-active' : ''}`}
            aria-pressed={activeTheme === theme.label}
            onClick={() => setTheme(activeTheme === theme.label ? null : theme.label)}
          >
            <span aria-hidden="true">{theme.emoji}</span> {theme.label}
          </button>
        ))}
      </div>

      <StorySphere stories={all} activeTheme={activeTheme} onOpen={openStory} />

      {loadState === 'loading' && (
        <p className="stories-loading" role="status">
          <Spinner size={28} label="" /> Looking for approved stories…
        </p>
      )}
      {loadState === 'error' && (
        <p className="stories-loading" role="status">
          Couldn't reach the shared space right now — showing the illustrative stories only.
        </p>
      )}

      {visible.length === 0 ? (
        <p className="stories-empty">
          Nothing under this theme yet — real anonymous stories will fill this space.
        </p>
      ) : (
        <div className="stories-list">
          {visible.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              expanded={expandedId === story.id}
              onToggle={() =>
                setExpandedId((current) => (current === story.id ? null : story.id))
              }
            />
          ))}
        </div>
      )}

      {session.status === 'loading' ? (
        <p className="stories-loading" role="status">
          <Spinner size={28} label="" /> Checking your space…
        </p>
      ) : firebaseReady ? (
        <ShareStory uid={uid} />
      ) : (
        <SignInGate
          what="anything you share"
          next={activeTheme ? `/stories?theme=${encodeURIComponent(activeTheme)}` : '/stories'}
        />
      )}
    </div>
  );
}
