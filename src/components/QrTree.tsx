import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import QRCode from 'qrcode';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './QrTree.css';

/**
 * QrTree — a spring cherry-blossom tree whose canopy is built from the dark
 * modules of a QR code. Scrolling pins the section and tilts the camera from a
 * low isometric view (a tree) to straight top-down (a scannable QR code).
 *
 * Everything is generated procedurally from SITE_URL — no textures or models.
 */

export const SITE_URL = 'https://saf-checkin.web.app/';

const QUIET = 3; // quiet-zone modules around the code
const ISO_ELEVATION = THREE.MathUtils.degToRad(27);
const ISO_AZIMUTH = THREE.MathUtils.degToRad(45);
const CAMERA_DISTANCE = 120;

// Spring palette
const PINKS = ['#f6b7cf', '#f2a6c4', '#ec95b8', '#e884ad'];
const PINK_SIDE = '#d97aa2';
const GRASS = '#5f8f47';
const GRASS_BLADE = '#86b566';
const TRUNK = '#6e4632';
const TILE = '#fffdf8';
const GROUND = '#f4ecdd';
const GROUND_SIDE = '#d9ccb7';

// Deterministic PRNG so the tree looks the same on every visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);

type Scene = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  caps: THREE.MeshLambertMaterial;
  groundTop: THREE.MeshLambertMaterial;
  blades: THREE.MeshLambertMaterial;
  petals: THREE.Points;
  petalVel: Float32Array;
  extent: number; // half-size of the ground slab in world units
  dispose: () => void;
};

function buildScene(canvas: HTMLCanvasElement): Scene {
  const qr = QRCode.create(SITE_URL, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const isDark = (x: number, y: number) => data[y * size + x] === 1;
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

  const N = size + QUIET * 2;
  const extent = N / 2;
  const toWorld = (i: number) => i - size / 2 + 0.5; // module index → world coord (centred)
  const rand = mulberry32(20260826);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);

  scene.add(new THREE.HemisphereLight('#fff6f9', '#cdbba4', 1.1));
  const sun = new THREE.DirectionalLight('#fff4ec', 1.6);
  sun.position.set(0.35, 1, 0.25);
  scene.add(sun);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const track = <T extends THREE.BufferGeometry>(g: T) => (geometries.push(g), g);
  const mat = <T extends THREE.Material>(m: T) => (materials.push(m), m);

  // Ground slab with quiet zone -------------------------------------------
  const groundTop = mat(new THREE.MeshLambertMaterial({ color: GROUND }));
  const groundSide = mat(new THREE.MeshLambertMaterial({ color: GROUND_SIDE }));
  const slab = new THREE.Mesh(track(new THREE.BoxGeometry(N, 0.5, N)), [
    groundSide,
    groundSide,
    groundTop,
    groundSide,
    groundSide,
    groundSide,
  ]);
  slab.position.y = -0.25;
  scene.add(slab);

  // Count instances ---------------------------------------------------------
  let lightCount = 0;
  let blossomCount = 0;
  let grassCount = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!isDark(x, y)) lightCount++;
      else if (inFinder(x, y)) grassCount++;
      else blossomCount++;
    }

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Light modules: pale mosaic tiles ---------------------------------------
  const tiles = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.97, 0.08, 0.97)),
    mat(new THREE.MeshLambertMaterial({ color: TILE })),
    lightCount + QUIET * 4 * (size + QUIET), // tiles for the quiet zone too
  );
  let ti = 0;
  for (let y = -QUIET; y < size + QUIET; y++)
    for (let x = -QUIET; x < size + QUIET; x++) {
      const inside = x >= 0 && y >= 0 && x < size && y < size;
      if (inside && isDark(x, y)) continue;
      if (ti >= tiles.count) break;
      dummy.position.set(toWorld(x), 0.04, toWorld(y));
      dummy.updateMatrix();
      tiles.setMatrixAt(ti++, dummy.matrix);
    }
  tiles.count = ti;
  scene.add(tiles);

  // Finder patterns: grass tufts --------------------------------------------
  const grassBase = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(1, 0.22, 1)),
    mat(new THREE.MeshLambertMaterial({ color: GRASS })),
    grassCount,
  );
  const bladesMat = mat(new THREE.MeshLambertMaterial({ color: GRASS_BLADE }));
  const blades = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.16, 1, 0.16)), bladesMat, grassCount * 4);
  let gi = 0;
  let bi = 0;

  // Dark modules: blossom columns -------------------------------------------
  const columns = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.9, 1, 0.9)),
    mat(new THREE.MeshLambertMaterial({ color: PINK_SIDE })),
    blossomCount,
  );
  const capsMat = mat(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const caps = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.98, 0.5, 0.98)), capsMat, blossomCount);
  // A carpet of fallen petals under every blossom module: from the side it sits
  // beneath the floating canopy; from above it fills any hairline gap between
  // caps so each dark module is one solid block for scanners.
  const carpet = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(1, 0.12, 1)),
    mat(new THREE.MeshLambertMaterial({ color: '#c6567f' })),
    blossomCount,
  );
  let ci = 0;

  // Trunk goes on the dark module closest to the centre so it never corrupts a light one.
  let trunkX = -1;
  let trunkY = -1;
  let best = Infinity;
  const half = (size - 1) / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!isDark(x, y) || inFinder(x, y)) continue;
      const d = (x - half) ** 2 + (y - half) ** 2;
      if (d < best) {
        best = d;
        trunkX = x;
        trunkY = y;
      }
    }

  const maxR = Math.hypot(half, half);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!isDark(x, y)) continue;
      const wx = toWorld(x);
      const wz = toWorld(y);

      if (inFinder(x, y)) {
        dummy.position.set(wx, 0.11, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        grassBase.setMatrixAt(gi++, dummy.matrix);
        for (let k = 0; k < 4; k++) {
          const h = 0.5 + rand() * 0.9;
          dummy.position.set(wx + (rand() - 0.5) * 0.6, 0.22 + h / 2, wz + (rand() - 0.5) * 0.6);
          dummy.rotation.set((rand() - 0.5) * 0.35, 0, (rand() - 0.5) * 0.35);
          dummy.scale.set(1, h, 1);
          dummy.updateMatrix();
          blades.setMatrixAt(bi++, dummy.matrix);
        }
        continue;
      }

      // Canopy dome: tall in the middle, short at the edges, with a little noise.
      const r = Math.hypot(x - half, y - half) / maxR;
      const dome = Math.max(0, 1 - Math.pow(r / 0.92, 2));
      const isTrunk = x === trunkX && y === trunkY;
      // Canopy floats above the ground on a trunk; the outermost modules sit
      // on the ground as low blossom bushes so the code still reads from above.
      const top = isTrunk ? 14.5 : 5 + 8.5 * Math.pow(dome, 0.7) + rand() * 2.4;
      const edge = r > 0.86;
      const base = isTrunk || edge ? 0 : Math.max(3, top - (1.5 + 3.5 * dome + rand() * 2.5));
      const h = edge ? 0.8 + rand() * 1.2 : top - base;
      const y0 = edge ? 0 : base;

      dummy.rotation.set(0, 0, 0);
      dummy.position.set(wx, 0.06, wz);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carpet.setMatrixAt(ci, dummy.matrix);

      dummy.position.set(wx, y0 + h / 2, wz);
      dummy.scale.set(isTrunk ? 0.7 : 1, h, isTrunk ? 0.7 : 1);
      dummy.updateMatrix();
      columns.setMatrixAt(ci, dummy.matrix);
      columns.setColorAt(ci, color.set(isTrunk ? TRUNK : PINK_SIDE));

      // Slightly uneven cap sizes read as fluffy blossom clusters from the side.
      const puff = isTrunk ? 0.75 : 0.9 + rand() * 0.2;
      dummy.position.set(wx, y0 + h + 0.25, wz);
      dummy.scale.set(puff, 1 + rand() * 0.8, puff);
      dummy.updateMatrix();
      caps.setMatrixAt(ci, dummy.matrix);
      caps.setColorAt(ci, color.set(isTrunk ? TRUNK : PINKS[Math.floor(rand() * PINKS.length)]));
      ci++;
    }
  scene.add(grassBase, blades, carpet, columns, caps);

  // Falling petals -----------------------------------------------------------
  const PETALS = 160;
  const pos = new Float32Array(PETALS * 3);
  const petalVel = new Float32Array(PETALS * 2);
  for (let i = 0; i < PETALS; i++) {
    pos[i * 3] = (rand() - 0.5) * N;
    pos[i * 3 + 1] = rand() * 18;
    pos[i * 3 + 2] = (rand() - 0.5) * N;
    petalVel[i * 2] = 0.012 + rand() * 0.02; // fall speed
    petalVel[i * 2 + 1] = rand() * Math.PI * 2; // sway phase
  }
  const petalGeo = track(new THREE.BufferGeometry());
  petalGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const petalMat = mat(
    new THREE.PointsMaterial({
      color: '#f4a7c4',
      size: 0.45,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  const petals = new THREE.Points(petalGeo, petalMat);
  scene.add(petals);

  return {
    renderer,
    scene,
    camera,
    caps: capsMat,
    groundTop,
    blades: bladesMat,
    petals,
    petalVel,
    extent,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}

/** Position the orthographic camera for a reveal progress in [0, 1]. */
function placeCamera(s: Scene, progress: number, aspect: number) {
  const t = smooth(THREE.MathUtils.clamp(progress, 0, 1));
  const elevation = THREE.MathUtils.lerp(ISO_ELEVATION, Math.PI / 2, t);
  const azimuth = THREE.MathUtils.lerp(ISO_AZIMUTH, 0, t);

  const { camera } = s;
  camera.position.set(
    Math.cos(elevation) * Math.sin(azimuth) * CAMERA_DISTANCE,
    Math.sin(elevation) * CAMERA_DISTANCE,
    Math.cos(elevation) * Math.cos(azimuth) * CAMERA_DISTANCE,
  );
  // At the zenith (0,1,0) is parallel to the view direction; -z is the
  // continuous limit of screen-up as elevation → 90°.
  if (elevation > Math.PI / 2 - 1e-4) camera.up.set(0, 0, -1);
  else camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);

  // Frame: loose for the tree, tight for the code.
  const view = THREE.MathUtils.lerp(s.extent * 2.45, s.extent * 2.12, t);
  const w = aspect >= 1 ? view * aspect : view;
  const h = aspect >= 1 ? view : view / aspect;
  const lift = (1 - t) * s.extent * 0.32; // centre the tree (canopy sits high) in frame
  camera.left = -w / 2;
  camera.right = w / 2;
  camera.top = h / 2 + lift;
  camera.bottom = -h / 2 + lift;
  camera.updateProjectionMatrix();

  // Deepen the blossom tops and erase the tile grid as the canopy flattens,
  // so the finished code has clean, solid contrast for camera scanners.
  s.caps.color.setRGB(1 - 0.48 * t, 1 - 0.74 * t, 1 - 0.56 * t);
  s.groundTop.color.set(GROUND).lerp(new THREE.Color(TILE), t);
  s.blades.color.set(GRASS_BLADE).lerp(new THREE.Color(GRASS), t);
  (s.petals.material as THREE.PointsMaterial).opacity = 0.85 * (1 - smooth(Math.min(1, t * 1.6)));
}

export default function QrTree() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let s: Scene;
    try {
      s = buildScene(canvas);
    } catch {
      // No WebGL — draw a plain QR locally instead (nothing leaves the device).
      QRCode.toDataURL(SITE_URL, { errorCorrectionLevel: 'H', margin: 2, width: 320 })
        .then(setFallbackSrc)
        .catch(() => undefined);
      setProgress(1);
      return;
    }

    let current = reduced ? 1 : 0;
    let target = current;
    let visible = false;
    let frame = 0;
    let aspect = 1;

    const resize = () => {
      const stage = canvas.parentElement!;
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      s.renderer.setSize(width, height, false);
      aspect = width / height;
      placeCamera(s, current, aspect);
      s.renderer.render(s.scene, s.camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    resize();

    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      current += (target - current) * 0.12; // small lag so the scrub feels physical
      placeCamera(s, current, aspect);

      if (!reduced) {
        const attr = s.petals.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const time = performance.now() / 1000;
        for (let i = 0; i < arr.length / 3; i++) {
          arr[i * 3 + 1] -= s.petalVel[i * 2] * 4;
          arr[i * 3] += Math.sin(time * 1.3 + s.petalVel[i * 2 + 1]) * 0.012;
          if (arr[i * 3 + 1] < 0.3) arr[i * 3 + 1] = 18;
        }
        attr.needsUpdate = true;
      }
      s.renderer.render(s.scene, s.camera);
    };
    frame = requestAnimationFrame(tick);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(section);

    // The site nav is sticky and wraps on small screens; measure it so the
    // section pins directly beneath it and fills the rest of the viewport.
    const nav = document.querySelector<HTMLElement>('.layout-nav');
    const navHeight = () => nav?.offsetHeight ?? 0;
    const syncNav = () => section.style.setProperty('--qrtree-nav', `${navHeight()}px`);
    syncNav();
    const navRo = nav ? new ResizeObserver(() => (syncNav(), ScrollTrigger.refresh())) : null;
    if (nav && navRo) navRo.observe(nav);

    let st: ScrollTrigger | undefined;
    if (!reduced) {
      gsap.registerPlugin(ScrollTrigger);
      st = ScrollTrigger.create({
        trigger: section,
        start: () => `top ${navHeight()}px`,
        end: '+=150%',
        pin: true,
        scrub: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          target = self.progress;
          setProgress(self.progress);
        },
      });
    } else {
      setProgress(1);
    }

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      navRo?.disconnect();
      io.disconnect();
      st?.kill();
      s.dispose();
    };
  }, []);

  const revealed = progress > 0.92;

  return (
    <section className="qrtree" ref={sectionRef} aria-labelledby="qrtree-title">
      <div className="qrtree__copy">
        <p className="qrtree__kicker">Pass it on</p>
        <h2 id="qrtree-title">Scan to share with a buddy.</h2>
        <p className="qrtree__lead">
          Keep scrolling — the blossoms fold into a code you can point a camera at.
        </p>
      </div>

      <div className="qrtree__stage">
        <canvas ref={canvasRef} className="qrtree__canvas" aria-hidden="true" />
        {fallbackSrc && (
          <img className="qrtree__fallback" alt="QR code linking to this site" src={fallbackSrc} />
        )}
      </div>

      <p className={revealed ? 'qrtree__hint is-revealed' : 'qrtree__hint'} aria-live="polite">
        {revealed ? 'Point your camera at it — or copy the link below.' : 'Scroll to reveal ↓'}
      </p>
      <a className="qrtree__link" href={SITE_URL}>
        {SITE_URL.replace('https://', '')}
      </a>
    </section>
  );
}
