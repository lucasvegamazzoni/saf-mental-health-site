/* LUC-89 glass buttons — screenshots with the flag on and off + rendered contrast check.
 * Flips FEATURES.glassButtons in src/lib/flags.ts (Vite HMR picks it up), so run against a
 * dev server on :5221 and expect flags.ts to end where it started (true). */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const B = 'http://localhost:5221';
const OUT = path.join(__dirname, 'glass');
const FLAGS = path.join(__dirname, '..', 'src', 'lib', 'flags.ts');
const routes = [['home', '/'], ['account', '/account'], ['me', '/me'], ['stories', '/stories'], ['resources', '/resources'], ['checkin', '/check-in'], ['topic', '/resources/better-sleep']];

const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const PAPER = [251, 247, 239], PINE = [66, 96, 79], PINE_DEEP = [51, 70, 60];

function setFlag(on) {
  const s = fs.readFileSync(FLAGS, 'utf8').replace(/glassButtons: (true|false)/, `glassButtons: ${on}`);
  fs.writeFileSync(FLAGS, s);
}

// Worst-case (max-luminance for dark text / min for light text) pixel along a text-free column
// 10px inside the left edge of the element — covers the highlight wash top to bottom.
async function sampleContrast(page, selector, text) {
  const el = page.locator(selector + ':visible:not(:disabled)').first();
  if (!(await el.count())) return null;
  let buf;
  // hide the glyphs so every sampled pixel is the glass surface itself
  try {
    await el.scrollIntoViewIfNeeded({ timeout: 3000 });
    await el.evaluate((e, on) => { [e, ...e.querySelectorAll('*')].forEach((n) => { n.style.color = on ? 'transparent' : ''; }); }, true);
    await page.waitForTimeout(400); // colour transitions are 220ms
    buf = await el.screenshot({ timeout: 5000 });
    await el.evaluate((e, on) => { [e, ...e.querySelectorAll('*')].forEach((n) => { n.style.color = on ? 'transparent' : ''; }); }, false);
  } catch { return null; }
  const png = PNG.sync.read(buf);
  // pills are 999px-radius: sample inside the left end-cap centre (x = h/2), middle 70% of height
  const xs = [Math.max(4, Math.min(Math.floor(png.height / 2), Math.floor(png.width / 2) - 2)), Math.floor(png.width / 2)];
  let worst = Infinity, worstPx = null;
  for (const x of xs) for (let y = Math.floor(png.height * 0.12); y < Math.floor(png.height * 0.88); y++) {
    const i = (y * png.width + x) * 4;
    const px = [png.data[i], png.data[i + 1], png.data[i + 2]];
    const c = contrast(text, px);
    if (c < worst) { worst = c; worstPx = px; }
  }
  return { worst: worst.toFixed(2), px: worstPx };
}

(async () => {
  const browser = await chromium.launch();
  const report = [];
  const contrastOnly = process.argv.includes('--contrast-only');
  for (const on of (contrastOnly ? [true] : [true, false])) {
    setFlag(on);
    await new Promise((r) => setTimeout(r, 1500));
    const tag = on ? 'glass' : 'solid';
    for (const [w, h, vp] of (contrastOnly ? [[1280, 800, 'desktop']] : [[1280, 800, 'desktop'], [390, 844, 'mobile']])) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      for (const [name, url] of routes) {
        await page.goto(B + url, { waitUntil: 'load' });
        await page.waitForTimeout(2500);
        const attr = await page.evaluate(() => document.documentElement.dataset.buttons);
        if (attr !== tag) throw new Error(`expected data-buttons=${tag}, got ${attr}`);
        if (!contrastOnly) await page.screenshot({ path: path.join(OUT, `${name}-${vp}-${tag}.png`), fullPage: true });
        if (on && vp === 'desktop') {
          for (const [sel, text, label] of [
            ['.btn--primary', PAPER, 'paper'], ['.btn--ghost', PINE_DEEP, 'pine-deep'], ['.layout-help-btn', PAPER, 'paper'],
            ['.gate-primary', PAPER, 'paper'], ['.gate-secondary', PINE, 'pine'], ['.account-primary', PAPER, 'paper'],
            ['.account-secondary', PINE, 'pine'], ['.account-mode.is-active', PINE_DEEP, 'pine-deep'],
            ['.stories-chip', PINE, 'pine'], ['.stories-chip.is-active', PINE_DEEP, 'pine-deep'], ['.stories-readmore', PINE, 'pine'],
            ['.checkin-chip', PINE, 'pine'], ['.checkin-continue', PAPER, 'paper'], ['.checkin-answer', PINE, 'pine'],
            ['.resourcetopic-back', PINE, 'pine'], ['.resourcetopic-link', PINE, 'pine'], ['.resourcetopic-stories-link', PAPER, 'paper'],
            ['.layout-link', PINE, 'pine'], ['.layout-link.is-active', PINE_DEEP, 'pine-deep'], ['.layout-account', PINE, 'pine'],
          ]) {
            const r = await sampleContrast(page, sel, text);
            if (r) report.push({ route: url, sel, text: label, ...r });
          }
        }
      }
      await page.close();
    }
  }
  setFlag(true);
  await browser.close();
  const seen = new Set();
  console.log('selector | route | text | worst rendered contrast | pixel');
  for (const r of report) { const k = r.sel + r.route; if (seen.has(k)) continue; seen.add(k); console.log(`${r.sel} | ${r.route} | ${r.text} | ${r.worst} | rgb(${r.px})`); }
})();
