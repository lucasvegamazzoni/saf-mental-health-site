import { useCallback, useEffect, useState } from 'react';
import { STORY_THEMES } from '../../data/content';
import { listPendingStories, setStoryStatus } from '../../lib/db';
import type { StoryDoc, StoryStatus } from '../../lib/db';
import { riskLabel } from '../../lib/risk';
import Spinner from '../Spinner';
import './StoriesQueue.css';

type LoadState = 'loading' | 'ready' | 'error';

function whenLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function QueueCard({
  story,
  onDecide,
}: {
  story: StoryDoc;
  onDecide: (id: string, status: StoryStatus) => Promise<void>;
}) {
  const [busy, setBusy] = useState<StoryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const themeEmoji = STORY_THEMES.find((t) => t.label === story.theme)?.emoji;
  const flagged = story.flags.length > 0;

  const decide = async (status: StoryStatus) => {
    setBusy(status);
    setError(null);
    try {
      await onDecide(story.id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that — try again.');
      setBusy(null);
    }
  };

  return (
    <article className={`sq-card${flagged ? ' is-flagged' : ''}`} aria-label={story.title}>
      <div className="sq-meta">
        {flagged && (
          <ul className="sq-flags" aria-label="Read with care">
            {story.flags.map((f) => (
              <li key={f} className="sq-flag">
                {riskLabel(f)}
              </li>
            ))}
          </ul>
        )}
        <span className="sq-tag">
          {themeEmoji && <span aria-hidden="true">{themeEmoji}</span>} {story.theme || 'No theme'}
        </span>
        <span className="sq-when">
          {whenLabel(story.createdAt)} · doing {story.hopeScore}/5 now · {story.readMins} min
        </span>
      </div>

      <h3 className="sq-title">{story.title}</h3>
      <div className="sq-body">
        {story.body.map((para, i) => (
          <p key={`${i}-${para.slice(0, 24)}`}>{para}</p>
        ))}
      </div>

      {error && (
        <p className="sq-error" role="alert">
          {error}
        </p>
      )}

      <div className="sq-actions">
        <button
          type="button"
          className="sq-approve"
          disabled={busy !== null}
          onClick={() => decide('published')}
        >
          {busy === 'published' ? <Spinner size={20} fill="#fbf7ef" label="" /> : 'Approve'}
        </button>
        <button
          type="button"
          className="sq-reject"
          disabled={busy !== null}
          onClick={() => decide('rejected')}
        >
          {busy === 'rejected' ? <Spinner size={20} label="" /> : 'Reject'}
        </button>
      </div>
    </article>
  );
}

/** Pending stories for moderators — flagged first, full text, approve / reject. */
export default function StoriesQueue() {
  const [items, setItems] = useState<StoryDoc[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      setItems(await listPendingStories());
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the queue.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = useCallback(async (id: string, status: StoryStatus) => {
    // Optimistic: drop the card now, put it back if the write fails.
    let removed: StoryDoc | undefined;
    let at = -1;
    setItems((cur) => {
      at = cur.findIndex((s) => s.id === id);
      removed = cur[at];
      return cur.filter((s) => s.id !== id);
    });
    try {
      await setStoryStatus(id, status);
    } catch (err) {
      setItems((cur) => {
        if (!removed || cur.some((s) => s.id === id)) return cur;
        const next = [...cur];
        next.splice(Math.min(Math.max(at, 0), next.length), 0, removed);
        return next;
      });
      throw err;
    }
  }, []);

  const flaggedCount = items.filter((s) => s.flags.length > 0).length;

  return (
    <div className="sq">
      <div className="sq-head">
        <span className="sq-count" aria-live="polite">
          {state === 'ready'
            ? `${items.length} waiting${flaggedCount ? ` · ${flaggedCount} to read first` : ''}`
            : state === 'loading'
              ? 'Loading…'
              : 'Not loaded'}
        </span>
        <button type="button" className="sq-refresh" onClick={() => void load()} disabled={state === 'loading'}>
          Refresh
        </button>
      </div>

      {state === 'loading' && (
        <div className="sq-empty" role="status">
          <Spinner size={40} label="Loading the stories queue" />
        </div>
      )}

      {state === 'error' && (
        <div className="sq-empty" role="alert">
          <p className="sq-empty-title">Couldn't load the queue.</p>
          <p className="sq-empty-body">{error}</p>
          <button type="button" className="sq-refresh" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {state === 'ready' && items.length === 0 && (
        <div className="sq-empty" role="status">
          <span className="sq-empty-mark" aria-hidden="true">
            🌱
          </span>
          <p className="sq-empty-title">Nothing waiting.</p>
          <p className="sq-empty-body">New stories land here the moment someone shares one.</p>
        </div>
      )}

      {state === 'ready' && items.length > 0 && (
        <div className="sq-list">
          {items.map((story) => (
            <QueueCard key={story.id} story={story} onDecide={decide} />
          ))}
        </div>
      )}
    </div>
  );
}
