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
// Crown (in module units) — an ellipsoid of blossom clusters on a trunk.
const CROWN_Y = 12.5;
const CROWN_RY = 7;

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
  wood: THREE.MeshLambertMaterial;
  puffs: THREE.MeshLambertMaterial;
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

  // Dark modules: blossom clusters -------------------------------------------
  // Each cluster = one full-cell "cap" cube (the scannable module seen from
  // above) plus a few small puff cubes tucked inside its footprint for fluff.
  const PUFFS = 3;
  const puffsMat = mat(new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true }));
  const puffs = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.5, 0.5, 0.5)), puffsMat, blossomCount * PUFFS);
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

  const crownR = size * 0.44; // crown radius in modules — the ground code shows around it
  const tx = toWorld(trunkX);
  const tz = toWorld(trunkY);
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

      // Crown: each dark module gets ONE cluster in its own cell, at a height
      // on the crown ellipsoid's upper shell, lower shell or interior — so from
      // the side it reads as a round tree, and from above every cell is still
      // exactly one solid module.
      const rho = Math.hypot(wx - tx, wz - tz) / crownR;

      dummy.rotation.set(0, 0, 0);
      dummy.position.set(wx, 0.06, wz);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      carpet.setMatrixAt(ci, dummy.matrix);

      let cy: number;
      if (rho >= 1) {
        cy = 0.45; // outside the crown: a low mound of fallen blossom
      } else {
        const shell = Math.sqrt(1 - rho * rho) * CROWN_RY;
        const pick = rand();
        cy =
          pick < 0.55
            ? CROWN_Y + shell * (0.8 + rand() * 0.2)
            : pick < 0.8
              ? CROWN_Y - shell * (0.65 + rand() * 0.35)
              : CROWN_Y + (rand() * 2 - 1) * shell * 0.7;
      }

      const inCrown = rho < 1;
      const puff = 0.9 + rand() * 0.1;
      dummy.position.set(wx, cy, wz);
      dummy.scale.set(puff, inCrown ? 0.7 + rand() * 0.6 : 0.35, puff);
      dummy.updateMatrix();
      caps.setMatrixAt(ci, dummy.matrix);
      caps.setColorAt(ci, color.set(PINKS[Math.floor(rand() * PINKS.length)]));

      for (let k = 0; k < PUFFS; k++) {
        const sc = inCrown ? 0.7 + rand() * 0.5 : 0; // no puffs on the ground mounds
        dummy.position.set(wx + (rand() - 0.5) * 0.45, cy + (rand() - 0.5) * 1.1, wz + (rand() - 0.5) * 0.45);
        dummy.rotation.set(rand() * 0.6, rand() * 0.6, rand() * 0.6);
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        puffs.setMatrixAt(ci * PUFFS + k, dummy.matrix);
        puffs.setColorAt(ci * PUFFS + k, color.set(rand() < 0.5 ? PINK_SIDE : PINKS[Math.floor(rand() * PINKS.length)]));
      }
      ci++;
    }
  scene.add(grassBase, blades, carpet, puffs, caps);

  // Trunk + branches ---------------------------------------------------------
  // Decorative wood that fades out as the crown flattens (it would otherwise
  // draw thin dark lines across light modules from above).
  const wood = mat(new THREE.MeshLambertMaterial({ color: TRUNK, transparent: true }));
  const limbGeo = track(new THREE.CylinderGeometry(0.32, 0.45, 1, 7));
  const tree = new THREE.Group();
  const up = new THREE.Vector3(0, 1, 0);
  const addLimb = (a: THREE.Vector3, b: THREE.Vector3, thick: number) => {
    const d = b.clone().sub(a);
    const len = d.length();
    const m = new THREE.Mesh(limbGeo, wood);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(thick, len, thick);
    m.quaternion.setFromUnitVectors(up, d.normalize());
    tree.add(m);
  };
  // Leaning trunk in three segments, base pinned to its dark module.
  let p = new THREE.Vector3(tx, 0, tz);
  const trunkTop = CROWN_Y + 1.5;
  for (let i = 0; i < 3; i++) {
    const n = new THREE.Vector3(p.x + (rand() - 0.5) * 0.35, p.y + trunkTop / 3, p.z + (rand() - 0.5) * 0.35);
    addLimb(p, n, 1 - i * 0.2);
    p = n;
  }
  // Primary branches reaching out into the crown, each with a twig.
  const BRANCHES = 7;
  for (let i = 0; i < BRANCHES; i++) {
    const ang = (i / BRANCHES) * Math.PI * 2 + rand() * 0.6;
    const start = new THREE.Vector3(tx, 5 + rand() * 6, tz);
    const reach = crownR * (0.45 + rand() * 0.4);
    const end = new THREE.Vector3(
      tx + Math.cos(ang) * reach,
      CROWN_Y + (rand() * 0.9 - 0.15) * CROWN_RY,
      tz + Math.sin(ang) * reach,
    );
    addLimb(start, end, 0.42);
    const mid = start.clone().lerp(end, 0.55);
    const a2 = ang + (rand() - 0.5) * 1.4;
    const r2 = reach * 0.45;
    addLimb(mid, new THREE.Vector3(mid.x + Math.cos(a2) * r2, mid.y + 1.5 + rand() * 2.5, mid.z + Math.sin(a2) * r2), 0.22);
  }
  scene.add(tree);

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
    wood,
    puffs: puffsMat,
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
  const fade = 1 - smooth(THREE.MathUtils.clamp((t - 0.55) / 0.35, 0, 1));
  s.wood.opacity = fade;
  s.puffs.opacity = fade; // puffs speckle light pink inside dark modules from above
  s.puffs.visible = fade > 0.01;
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
      // Exposed so verify/final-shoot.cjs can unpin before a full-page capture.
      (window as Window & { __safScrollTrigger?: typeof ScrollTrigger }).__safScrollTrigger = ScrollTrigger;
      st = ScrollTrigger.create({
        trigger: section,
        start: () => `top ${navHeight()}px`,
        // Scroll runway: shorter on phones so the pin spacer doesn't read as
        // a blank gap below the tree. (Full-page captures still show the
        // spacer — see verify/final-shoot.cjs.)
        end: () => (window.innerWidth < 768 ? '+=100%' : '+=150%'),
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
