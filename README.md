# You're Not Alone — SAF Mental Health website

Anonymous wellbeing platform for servicemen (Krish's project). Currently: **landing hero only**.

## Run

```bash
cd ~/Webdesign_SAF/saf-mental-health-site
npm install
npm run dev        # → http://localhost:5173
```

## What's here

- **Hero** (`src/components/Hero.tsx`): Osmo-style layered parallax per the vision doc —
  GSAP ScrollTrigger + Lenis, layers at yPercent 70 (sky) / 55 (far hills) / 40 (title) /
  10 (officer + near hills). Title "You're Not Alone.", subtitle, primary CTA
  "Start My 30-Second Check-in", secondary "Read Anonymous Stories", top-right persistent
  "Need someone to talk to?" pill (tel: SAF Counselling 1800-278-0022).
- **Officer image** (`public/officer.png`): generated in Google Flow (flat wellness-illustration
  style, faceless, SAF Army No. 1 dress), background removed via flood-fill script
  (`assets/../` see second-brain project file). Source + reference images: `~/Webdesign_SAF/assets/`.
- **Palette/tokens** in `src/index.css` `:root` — cream/paper, pine/sage greens, dusty blue,
  terracotta accent. Fonts: Fraunces (display) + Inter (body) via Google Fonts.
- Respects `prefers-reduced-motion` (parallax + smooth scroll disabled).

## Next

Weekly 30-second check-in (primary CTA target), anonymous stories. Full spec:
Google Doc "SAF Mental health Website" + `~/second-brain/projects/saf-mental-health-website.md`.
