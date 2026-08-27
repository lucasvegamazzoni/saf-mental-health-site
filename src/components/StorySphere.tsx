/* ---------------------------------------------------------------------------
 * StorySphere — desktop-only explorer that floats every story as a pastel
 * bubble on a slowly turning sphere (Fibonacci distribution, drag to rotate,
 * momentum). Clicking a bubble hands the story id back to the page, which
 * scrolls to and expands the matching card. The card list below stays the
 * accessible, canonical view; on phones (< 768px) this renders nothing and
 * runs no animation frames.
 * ------------------------------------------------------------------------- */

import { useEffect, useMemo, useRef, useState } from 'react';
import { STORY_THEMES } from '../data/content';
import type { Story } from '../data/content';
import './StorySphere.css';

interface Props {
  stories: Story[];
  /** Active `?theme=` filter — stories outside it are dimmed and not focusable. */
  activeTheme: string | null;
  onOpen: (id: string) => void;
}

const DESKTOP = '(min-width: 768px)';
const REDUCED = '(prefers-reduced-motion: reduce)';
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const AUTO_SPEED = 0.0028; // rad / frame at 60fps — a slow, calm turn
const DRAG_SPEED = 0.0055; // rad / px
const FRICTION = 0.94;
const MIN_VELOCITY = 0.0004;
const CLICK_SLOP = 6; // px of movement before a press becomes a drag
const PALETTES = 5;

/** Small, stable string hash (FNV-1a) → [0, 1). Replaces Math.random so layout never shuffles. */
function hash01(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

interface Point {
  x: number;
  y: number;
  z: number;
}

function fibonacciPoints(ids: string[]): Point[] {
  const n = ids.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, y: 0, z: 1 }];
  // A seed derived from the whole id set nudges the golden spiral so the
  // arrangement is unique per data set but identical on every render.
  const seed = hash01(ids.join('|')) * Math.PI * 2;
  return ids.map((id, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN * i + seed + (hash01(id) - 0.5) * 0.35;
    return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
  });
}

/* Orientation is a 3×3 rotation matrix (row-major), not Euler angles — so a drag
   in any direction rotates about the matching *screen* axis and the sphere never
   locks at the poles (LUC-100). */
type Mat = [number, number, number, number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function mul(a: Mat, b: Mat): Mat {
  const o = new Array(9) as Mat;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
}
const rotX = (a: number): Mat => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const rotY = (a: number): Mat => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
/** Apply a rotation about the screen X/Y axes *after* the current orientation. */
const turn = (m: Mat, aboutX: number, aboutY: number): Mat => mul(rotX(aboutX), mul(rotY(aboutY), m));
const apply = (m: Mat, p: Point): Point => ({
  x: m[0] * p.x + m[1] * p.y + m[2] * p.z,
  y: m[3] * p.x + m[4] * p.y + m[5] * p.z,
  z: m[6] * p.x + m[7] * p.y + m[8] * p.z,
});

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export default function StorySphere({ stories, activeTheme, onOpen }: Props) {
  const isDesktop = useMedia(DESKTOP);
  const reduced = useMedia(REDUCED);

  if (!isDesktop || stories.length === 0) return null;
  return <Sphere stories={stories} activeTheme={activeTheme} onOpen={onOpen} reduced={reduced} />;
}

function Sphere({ stories, activeTheme, onOpen, reduced }: Props & { reduced: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rot = useRef<Mat>(turn(IDENTITY, -0.35, 0.6));
  const vel = useRef({ x: 0, y: 0 });
  const hovering = useRef(false);
  const drag = useRef<{ id: number; lastX: number; lastY: number; moved: number } | null>(null);
  const suppressClick = useRef(false);

  const ids = useMemo(() => stories.map((s) => s.id), [stories]);
  const points = useMemo(() => fibonacciPoints(ids), [ids]);

  // Paint every node's transform for the current rotation. Called from RAF
  // (animated) or once (reduced motion / static).
  const paint = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const radius = stage.clientWidth * 0.38;
    const m = rot.current;
    points.forEach((p, i) => {
      const el = nodeRefs.current[i];
      if (!el) return;
      const q = apply(m, p);
      const depth = (q.z + 1) / 2; // 0 back … 1 front
      const scale = 0.55 + depth * 0.5;
      el.style.transform = `translate(-50%, -50%) translate(${(q.x * radius).toFixed(1)}px, ${(q.y * radius).toFixed(1)}px) scale(${scale.toFixed(3)})`;
      el.style.zIndex = String(Math.round(depth * 100) + 1);
      el.style.setProperty('--depth', depth.toFixed(3));
    });
  };

  useEffect(() => {
    if (reduced) {
      paint();
      return;
    }
    let raf = 0;
    const tick = () => {
      const dragging = drag.current !== null;
      if (!dragging) {
        if (vel.current.x !== 0 || vel.current.y !== 0) {
          rot.current = turn(rot.current, vel.current.x, vel.current.y);
        }
        vel.current.x *= FRICTION;
        vel.current.y *= FRICTION;
        if (Math.abs(vel.current.x) < MIN_VELOCITY) vel.current.x = 0;
        if (Math.abs(vel.current.y) < MIN_VELOCITY) vel.current.y = 0;
        if (!hovering.current && vel.current.x === 0 && vel.current.y === 0) {
          rot.current = turn(rot.current, 0, AUTO_SPEED);
        }
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, reduced]);

  // Re-paint on resize so the radius tracks the stage width (static mode too).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag.current = { id: e.pointerId, lastX: e.clientX, lastY: e.clientY, moved: 0 };
    vel.current = { x: 0, y: 0 };
    suppressClick.current = false;
    // Capture is taken only once the press turns into a drag (see onPointerMove):
    // capturing here would re-target the click away from the bubble button.
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved > CLICK_SLOP && !suppressClick.current) {
      suppressClick.current = true;
      e.currentTarget.classList.add('is-dragging');
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    rot.current = turn(rot.current, -dy * DRAG_SPEED, dx * DRAG_SPEED);
    vel.current = { x: -dy * DRAG_SPEED * 0.6, y: dx * DRAG_SPEED * 0.6 };
    if (reduced) paint();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    e.currentTarget.classList.remove('is-dragging');
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (reduced) vel.current = { x: 0, y: 0 };
  };

  return (
    <section
      className={`sphere${activeTheme ? ' is-filtered' : ''}`}
      aria-label="Story explorer"
    >
      <div
        ref={stageRef}
        className="sphere-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => {
          hovering.current = true;
        }}
        onPointerLeave={() => {
          hovering.current = false;
        }}
      >
        {stories.map((story, i) => {
          const themeIndex = Math.max(
            0,
            STORY_THEMES.findIndex((t) => t.label === story.theme),
          );
          const emoji = STORY_THEMES[themeIndex]?.emoji ?? '🌱';
          const dim = activeTheme !== null && story.theme !== activeTheme;
          return (
            <button
              key={story.id}
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              type="button"
              className={`sphere-node sphere-node--p${themeIndex % PALETTES}${dim ? ' is-dim' : ''}`}
              aria-label={`Open story: ${story.title}`}
              aria-hidden={dim || undefined}
              tabIndex={dim ? -1 : 0}
              disabled={dim}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onOpen(story.id);
              }}
            >
              <span className="sphere-node-face" aria-hidden="true">
                <span className="sphere-node-emoji">{emoji}</span>
              </span>
              <span className="sphere-node-label" aria-hidden="true">
                {story.title}
              </span>
            </button>
          );
        })}
      </div>
      <p className="sphere-caption">Drag to explore · click a bubble to read</p>
    </section>
  );
}
