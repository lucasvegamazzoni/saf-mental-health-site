import type { KeyboardEvent } from 'react';

/**
 * Arrow-key navigation for `role="tablist"` and `role="radiogroup"` containers
 * (WAI-ARIA APG): Left/Right (and Up/Down) move focus to the previous/next
 * item, Home/End jump to the ends, and the newly focused item is activated.
 * Pair with a roving `tabIndex` (0 on the selected item, -1 on the rest).
 */
export function rovingKeyDown(e: KeyboardEvent<HTMLElement>, itemSelector: string): void {
  const keys: Record<string, number | 'first' | 'last'> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
    Home: 'first',
    End: 'last',
  };
  const move = keys[e.key];
  if (move === undefined) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(itemSelector)).filter(
    (el) => !el.hasAttribute('disabled'),
  );
  const from = items.indexOf(document.activeElement as HTMLElement);
  if (items.length === 0 || from === -1) return;
  e.preventDefault();
  const to =
    move === 'first' ? 0 : move === 'last' ? items.length - 1 : (from + move + items.length) % items.length;
  items[to].focus();
  items[to].click();
}
