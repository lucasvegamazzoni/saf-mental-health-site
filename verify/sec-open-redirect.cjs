/* Security check: can /account?next=… send a freshly signed-in user off-site?
 * Runs against production. Creates ONE throwaway 'verify-bot-*' account (recorded
 * in verify/sec-state.json so sec-cleanup.cjs can delete it).
 *   node verify/sec-open-redirect.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const B = process.env.SEC_BASE || 'https://saf-checkin.web.app';
const PASS = 'verify-pass-123';
const CALL = 'verify-bot-' + Math.floor(Math.random() * 1e6);
const STATE = path.join(__dirname, 'sec-state.json');
const readState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {});
const writeState = (patch) => fs.writeFileSync(STATE, JSON.stringify({ ...readState(), ...patch }, null, 2));

const PAYLOADS = [
  'https://evil.example/phish',
  '//evil.example/phish',
  'javascript:alert(document.domain)',
  'https:evil.example',
  '/\\evil.example',
  '%2F%2Fevil.example',
];

function check(label, ok, evidence = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${evidence ? '  — ' + evidence : ''}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  const browser = await chromium.launch();

  // Sign-up once with the first payload; later payloads use sign-in, each in a fresh context (fresh session).
  for (let i = 0; i < PAYLOADS.length; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', async (d) => { errors.push('DIALOG ' + d.message()); await d.dismiss(); });
    const payload = PAYLOADS[i];
    const mode = i === 0 ? 'create' : 'signin';
    const url = `${B}/account?mode=${mode}&next=${encodeURIComponent(payload)}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#account-callsign', { timeout: 20000 });
    await page.fill('#account-callsign', CALL);
    await page.fill('#account-password', PASS);
    errors.length = 0;
    await page.locator('.account-primary').click();
    await page.waitForTimeout(4000);
    const finalUrl = page.url();
    const stayed = new URL(finalUrl).origin === new URL(B).origin;
    check(`next=${payload} stays on ${new URL(B).host}`, stayed, `landed on ${finalUrl}${errors.length ? ' | ' + errors.join(' ; ') : ''}`);
    await ctx.close();
  }
  writeState({ redirectBot: { callSign: CALL, pass: PASS } });
  console.log('BOT', CALL);
  await browser.close();
})().catch((e) => { console.error('SEC-REDIRECT FAILED', e); process.exit(1); });
