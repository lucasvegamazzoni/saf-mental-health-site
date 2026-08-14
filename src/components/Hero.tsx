import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Link } from 'react-router-dom';

/* Decorative SVG layers ------------------------------------------------- */

function Clouds() {
  return (
    <svg className="clouds" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <g fill="#FDFBF6" opacity="0.9">
        <path d="M180 150c0-26 22-46 50-46 8-30 36-50 68-50 34 0 62 22 68 52 24 2 42 20 42 44H180z" />
        <path d="M1010 96c0-20 18-36 40-36 6-24 28-40 54-40 28 0 50 18 54 42 20 2 34 16 34 34h-182z" opacity="0.75" />
        <path d="M640 210c0-16 14-29 32-29 5-19 23-32 43-32 22 0 40 14 43 33 16 1 27 13 27 28H640z" opacity="0.6" />
      </g>
    </svg>
  );
}

function FarHills() {
  return (
    <svg className="hills hills--far" viewBox="0 0 1440 520" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 240 C240 150 420 210 640 190 C880 168 1080 100 1440 160 L1440 520 L0 520 Z"
        fill="#BFD4DE"
      />
      <path
        d="M0 360 C260 290 520 330 760 300 C1000 272 1220 300 1440 260 L1440 520 L0 520 Z"
        fill="#CBD9C0"
      />
      {/* white line-art leaf, as in the style reference */}
      <g stroke="#FDFBF6" strokeWidth="2.5" fill="none" opacity="0.85" strokeLinecap="round">
        <path d="M1240 470 C1250 420 1270 380 1305 350" />
        <path d="M1252 432 C1238 424 1228 410 1226 392 C1244 394 1256 404 1262 420" />
        <path d="M1262 404 C1276 396 1292 394 1308 400 C1298 414 1284 420 1268 418" />
        <path d="M1276 372 C1266 362 1260 348 1262 332 C1278 336 1288 348 1290 362" />
      </g>
    </svg>
  );
}

function NearHills() {
  return (
    <svg className="hills hills--near" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 150 C200 90 460 130 720 120 C980 110 1240 70 1440 120 L1440 420 L0 420 Z"
        fill="#A9BFA0"
      />
      <path
        d="M0 260 C280 200 560 240 840 225 C1100 212 1300 230 1440 205 L1440 420 L0 420 Z"
        fill="#7E9B77"
      />
      <path
        d="M0 350 C360 300 900 320 1440 300 L1440 420 L0 420 Z"
        fill="#42604F"
      />
    </svg>
  );
}

function Foliage() {
  return (
    <>
      {/* deep-green sprig, bottom left */}
      <svg className="sprig sprig--left" viewBox="0 0 220 340" aria-hidden="true">
        <g fill="#33463C">
          <path d="M110 340 C104 250 100 160 118 60 L126 62 C112 160 116 250 122 340 Z" />
          <path d="M116 96 C90 84 74 62 70 34 C100 42 118 62 122 92 Z" />
          <path d="M122 150 C96 140 78 120 72 92 C102 100 120 120 126 148 Z" />
          <path d="M124 206 C98 196 80 176 74 148 C104 156 122 176 128 204 Z" />
          <path d="M122 96 C146 82 172 78 198 86 C186 112 162 126 134 122 Z" />
          <path d="M126 152 C150 138 176 134 202 142 C190 168 166 182 138 178 Z" />
          <path d="M128 208 C152 194 178 190 204 198 C192 224 168 238 140 234 Z" />
        </g>
      </svg>
      {/* terracotta sprig, bottom right */}
      <svg className="sprig sprig--right" viewBox="0 0 220 340" aria-hidden="true">
        <g fill="#C0684B" opacity="0.92">
          <path d="M110 340 C116 250 120 160 102 60 L94 62 C108 160 104 250 98 340 Z" />
          <path d="M104 96 C130 84 146 62 150 34 C120 42 102 62 98 92 Z" />
          <path d="M98 150 C124 140 142 120 148 92 C118 100 100 120 94 148 Z" />
          <path d="M96 206 C122 196 140 176 146 148 C116 156 98 176 92 204 Z" />
          <path d="M98 96 C74 82 48 78 22 86 C34 112 58 126 86 122 Z" />
          <path d="M94 152 C70 138 44 134 18 142 C30 168 54 182 82 178 Z" />
        </g>
      </svg>
    </>
  );
}

/* Hero ------------------------------------------------------------------ */

export default function Hero() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const triggerElement = root.querySelector('[data-parallax-layers]');
      if (triggerElement) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: '0% 0%',
            end: '100% 0%',
            scrub: 0,
          },
        });
        // Krish's layer speeds, verbatim from the vision doc
        const layers = [
          { layer: '1', yPercent: 70 },
          { layer: '2', yPercent: 55 },
          { layer: '3', yPercent: 40 },
          { layer: '4', yPercent: 10 },
        ];
        layers.forEach((layerObj, idx) => {
          tl.to(
            triggerElement.querySelectorAll(`[data-parallax-layer="${layerObj.layer}"]`),
            { yPercent: layerObj.yPercent, ease: 'none' },
            idx === 0 ? undefined : '<',
          );
        });
      }

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero__title', { y: 42, autoAlpha: 0, duration: 1.05 })
        .from('.hero__officer', { y: 70, autoAlpha: 0, duration: 1.15 }, 0.15)
        .from('.hero__lead', { y: 24, autoAlpha: 0, duration: 0.9 }, 0.45)
        .from('.hero__ctas > *', { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.55);
    }, root);

    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="hero" ref={rootRef}>
      <section className="hero__visuals">
        <div data-parallax-layers className="hero__layers">
          <div data-parallax-layer="1" className="layer layer--sky" aria-hidden="true">
            <Clouds />
            <span className="sun" />
            <span className="ring" />
          </div>

          <div data-parallax-layer="2" className="layer layer--far" aria-hidden="true">
            <FarHills />
          </div>

          <div data-parallax-layer="3" className="layer layer--title">
            <h1 className="hero__title">You’re Not&nbsp;Alone.</h1>
          </div>

          <div data-parallax-layer="4" className="layer layer--front">
            <img
              className="hero__officer"
              src={`${import.meta.env.BASE_URL}officer.png`}
              alt="Illustration of a Singapore Armed Forces serviceman in No. 1 ceremonial dress, facing forward"
            />
            <NearHills />
            <Foliage />
          </div>
        </div>

        <div className="hero__overlay">
          <p className="hero__lead">
            A space to reflect, recharge, and hear from others who have walked the same path.
          </p>
          <div className="hero__ctas">
            <Link className="btn btn--primary" to="/check-in">
              Start My 30-Second Check-in
            </Link>
            <Link className="btn btn--ghost" to="/stories">
              Read Anonymous Stories
            </Link>
          </div>
        </div>

        <div className="hero__grain" aria-hidden="true" />
        <div className="hero__fade" aria-hidden="true" />
      </section>
    </div>
  );
}
