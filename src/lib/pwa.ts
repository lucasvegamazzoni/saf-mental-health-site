/* ---------------------------------------------------------------------------
 * pwa.ts — service-worker registration + "add to home screen" prompt hook.
 *
 * The SW (public/sw.js) is only registered in production builds so `npm run
 * dev` never serves a stale shell. It is base-path aware: the registration
 * scope is `import.meta.env.BASE_URL`, i.e. `/` on Firebase Hosting and
 * `/saf-mental-health-site/` on the GitHub Pages mirror.
 * ------------------------------------------------------------------------- */

import { useCallback, useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL;

/** Call once from main.tsx. Safe to call in any environment. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register(`${BASE}sw.js`, { scope: BASE })
      .then((registration) => {
        // Poll for a new shell now and then while the tab stays open.
        window.setInterval(() => registration.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch(() => {
        /* Offline shell is a nicety; the site works without it. */
      });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/* ---- Install prompt ---------------------------------------------------- */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'saf.pwa.installDismissed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOs;
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export interface PwaInstall {
  /** True when the app is already running from the home screen. */
  installed: boolean;
  /** Chromium/Android: a native prompt is available — call `promptInstall()`. */
  canPrompt: boolean;
  /** iOS Safari: no prompt API, show the "Share → Add to Home Screen" hint instead. */
  showIosHint: boolean;
  /** Either `canPrompt` or `showIosHint`, and the user hasn't dismissed the hint. */
  shouldShowHint: boolean;
  /** Opens the native prompt. Resolves 'accepted' | 'dismissed' | 'unavailable'. */
  promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Hide the hint for this device (persisted in localStorage). */
  dismiss(): void;
}

/**
 * usePwaInstall — surface a quiet "Add to Home Screen" hint.
 *
 * Suggested placement: the privacy aside on the Me page. Render nothing when
 * `shouldShowHint` is false; on `canPrompt` show a single secondary button
 * ("Add to Home Screen") that calls `promptInstall()`; on `showIosHint` show
 * one line of text ("In Safari, tap Share, then Add to Home Screen.").
 */
export function usePwaInstall(): PwaInstall {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const rerender = () => {
      force((n) => n + 1);
      setInstalled(isStandalone());
    };
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const ev = deferredPrompt;
    if (!ev) return 'unavailable' as const;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === 'accepted') deferredPrompt = null;
    notify();
    return outcome;
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode — hint just comes back next load */
    }
    setDismissed(true);
  }, []);

  const canPrompt = !installed && deferredPrompt !== null;
  const showIosHint = !installed && !canPrompt && isIos();

  return {
    installed,
    canPrompt,
    showIosHint,
    shouldShowHint: !dismissed && (canPrompt || showIosHint),
    promptInstall,
    dismiss,
  };
}
