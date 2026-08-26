import { useCallback, useEffect, useState } from 'react';
import Spinner from '../Spinner';
import { listPendingRecognitions, setRecognitionStatus } from '../../lib/db';
import type { RecognitionDoc } from '../../lib/db';
import './RecognitionsQueue.css';

type QueueState =
  | { status: 'loading' }
  | { status: 'ok'; items: RecognitionDoc[] }
  | { status: 'error'; message: string };

const errMessage = (err: unknown) =>
  err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Pending recognitions, oldest first. Approve publishes to the wall; Reject hides it for good. */
export default function RecognitionsQueue() {
  const [queue, setQueue] = useState<QueueState>({ status: 'loading' });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setQueue({ status: 'loading' });
    try {
      setQueue({ status: 'ok', items: await listPendingRecognitions() });
    } catch (err) {
      setQueue({ status: 'error', message: errMessage(err) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, status: 'published' | 'rejected') => {
    if (busy) return;
    setBusy(id);
    setActionError(null);
    try {
      await setRecognitionStatus(id, status);
      setQueue((q) => (q.status === 'ok' ? { status: 'ok', items: q.items.filter((r) => r.id !== id) } : q));
    } catch (err) {
      setActionError(errMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (queue.status === 'loading') {
    return (
      <div className="rq-card rq-wait spinner-slot" aria-live="polite">
        <Spinner size={48} label="Loading pending recognitions" />
      </div>
    );
  }

  if (queue.status === 'error') {
    return (
      <div className="rq-card" role="alert">
        <p className="rq-error">Could not load the queue: {queue.message}</p>
        <button type="button" className="rq-btn rq-btn-secondary" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  if (queue.items.length === 0) {
    return (
      <div className="rq-card rq-empty" role="status">
        <p className="mod-stub-kicker">All clear</p>
        <p>No recognitions waiting. Check back later.</p>
        <button type="button" className="rq-btn rq-btn-secondary" onClick={() => void load()}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="rq-list">
      <p className="rq-count" aria-live="polite">
        {queue.items.length === 1 ? '1 note waiting' : `${queue.items.length} notes waiting`} — oldest first.
        Reject anything with a name, rank, unit or anything unkind.
      </p>
      {actionError && (
        <p className="rq-error" role="alert">
          {actionError}
        </p>
      )}
      <ul className="rq-items">
        {queue.items.map((r) => {
          const isBusy = busy === r.id;
          return (
            <li key={r.id} className="rq-card rq-item">
              <p className="rq-text">“{r.text}”</p>
              <p className="rq-meta">Sent {when(r.createdAt)}</p>
              <div className="rq-actions">
                <button
                  type="button"
                  className="rq-btn rq-btn-primary"
                  disabled={busy !== null}
                  onClick={() => void decide(r.id, 'published')}
                >
                  {isBusy && <Spinner size={18} label="" fill="#fbf7ef" />}
                  Approve
                </button>
                <button
                  type="button"
                  className="rq-btn rq-btn-secondary"
                  disabled={busy !== null}
                  onClick={() => void decide(r.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
