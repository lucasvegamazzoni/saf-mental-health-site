import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { EMERGENCY_CONTACTS } from '../data/contacts';
import {
  GREETING,
  GuidedProvider,
  QUICK_STARTS,
  type CompanionProvider,
  type Message,
  type NextStep,
} from '../lib/companion';
import Spinner from './Spinner';
import './Companion.css';

/**
 * Companion — a floating "Talk it through" launcher (bottom-left, clear of the
 * emergency button) that opens a calm sheet. Guided replies only; the whole
 * conversation lives in React state and is gone on close or reload.
 */

const provider: CompanionProvider = new GuidedProvider();
let seq = 0;
const nextId = () => `m${++seq}`;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function helpMessage(): Message {
  return {
    id: nextId(),
    role: 'companion',
    text: "Here's who you can reach. None of them need your name.",
    steps: EMERGENCY_CONTACTS.map((c) => ({
      label: c.href ? `${c.label} · ${c.detail}` : `${c.label} — ${c.detail}`,
      to: c.href ?? '',
    })),
  };
}

function StepLink({ step, onNavigate, onHelp }: { step: NextStep; onNavigate: () => void; onHelp: () => void }) {
  if (step.to === '#help') {
    return (
      <button type="button" className="companion-step" onClick={onHelp}>
        {step.label}
      </button>
    );
  }
  if (!step.to) {
    return <span className="companion-step companion-step--plain">{step.label}</span>;
  }
  if (step.to.startsWith('/')) {
    return (
      <Link className="companion-step" to={step.to} onClick={onNavigate}>
        {step.label}
      </Link>
    );
  }
  const external = step.to.startsWith('http');
  return (
    <a
      className={`companion-step${step.to.startsWith('tel:') ? ' companion-step--tel' : ''}`}
      href={step.to}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {step.label}
    </a>
  );
}

export default function Companion() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const inputId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setMessages([]);
    setInput('');
    setError(null);
    setThinking(false);
    // Return focus to the launcher after the sheet unmounts.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  // Greeting on open, focus the input, lock body scroll on small screens.
  useEffect(() => {
    if (!open) return;
    setMessages([{ id: nextId(), role: 'companion', text: GREETING }]);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape closes; Tab is trapped inside the sheet while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const nodes = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !sheetRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages, thinking]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || thinking) return;
      setError(null);
      setInput('');
      const history = messages;
      const userMsg: Message = { id: nextId(), role: 'user', text };
      setMessages((m) => [...m, userMsg]);
      setThinking(true);
      try {
        const reply = await provider.reply(history, text);
        setMessages((m) => [
          ...m,
          { id: nextId(), role: 'companion', text: reply.text, steps: reply.steps, handover: reply.handover },
        ]);
      } catch {
        setError("That didn't go through. Your words are still here — try sending again.");
        setInput(text);
      } finally {
        setThinking(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [messages, thinking],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onInputKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const showHelp = () => setMessages((m) => [...m, helpMessage()]);
  const onlyGreeting = messages.length <= 1;

  return (
    <div className="companion">
      <button
        ref={launcherRef}
        type="button"
        className="companion-launch"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        Talk it through
      </button>

      {open && (
        <>
          <div className="companion-scrim" onClick={close} aria-hidden="true" />
          <div
            ref={sheetRef}
            className="companion-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
          >
            <header className="companion-head">
              <div>
                <p className="companion-kicker">Talk it through</p>
                <h2 id={titleId} className="companion-title">
                  Guided companion
                </h2>
                <p id={descId} className="companion-honest">
                  Not an AI yet. Nothing you type is stored.
                </p>
              </div>
              <button type="button" className="companion-close" onClick={close} aria-label="Close companion">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div ref={logRef} className="companion-log" aria-live="polite" aria-relevant="additions">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`companion-msg companion-msg--${m.role}${m.handover ? ' companion-msg--handover' : ''}`}
                >
                  {m.text.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                  {m.steps && m.steps.length > 0 && (
                    <div className="companion-steps">
                      {m.steps.map((s) => (
                        <StepLink key={s.label} step={s} onNavigate={close} onHelp={showHelp} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="companion-msg companion-msg--companion companion-msg--wait">
                  <Spinner size={28} label="Thinking" />
                </div>
              )}
            </div>

            {onlyGreeting && !thinking && (
              <div className="companion-quick" role="group" aria-label="Quick starts">
                {QUICK_STARTS.map((q) => (
                  <button key={q} type="button" className="companion-chip" onClick={() => void send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form className="companion-form" onSubmit={onSubmit}>
              <label htmlFor={inputId} className="companion-label">
                What's on your mind?
              </label>
              <div className="companion-row">
                <textarea
                  ref={inputRef}
                  id={inputId}
                  className="companion-input"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onInputKey}
                  autoComplete="off"
                  maxLength={600}
                />
                <button type="submit" className="companion-send" disabled={!input.trim() || thinking}>
                  Send
                </button>
              </div>
              {error && (
                <p className="companion-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>
        </>
      )}
    </div>
  );
}
