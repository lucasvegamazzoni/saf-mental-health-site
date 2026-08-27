/* Tiny assertions for src/data/polls.ts rotation. Run: node verify/polls-rotation.cjs */
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

// Transpile the TS module to CJS with esbuild (ships with vite) so node can load it.
const root = path.join(__dirname, '..');
const src = path.join(root, 'src', 'data', 'polls.ts');
const out = path.join(__dirname, '.polls.tmp.cjs');
execSync(`npx esbuild "${src}" --format=cjs --outfile="${out}" --log-level=silent`, { cwd: root });
const P = require(out);
fs.unlinkSync(out);

const ids = (n, y, w) => Array.from({ length: n }, (_, i) => `${y}-W${String(w + i).padStart(2, '0')}`);

// 1. deterministic weekId
assert.equal(P.weekId(new Date(2026, 7, 26)), '2026-W35');
assert.equal(P.weekId(new Date(2026, 7, 24)), P.weekId(new Date(2026, 7, 30)), 'Mon and Sun share a week');

// 5. year boundary
assert.equal(P.weekId(new Date(2027, 0, 3)), '2026-W53');
assert.equal(P.weekId(new Date(2027, 0, 4)), '2027-W01');
assert.deepEqual(P.challengesForWeek('2027-W01').slice(0, 4), P.challengesForWeek('2026-W53').slice(1));
assert.notEqual(P.pollForWeek('2026-W53'), P.pollForWeek('2027-W01'));

// 6. bank shape
assert.equal(P.POLL_BANK.length, 12);
assert.equal(P.CHALLENGE_BANK.length, 20);
for (const poll of P.POLL_BANK) {
  assert.equal(poll.options.length, 5, poll.question);
  assert.equal(poll.sampleResults.reduce((s, r) => s + r.percent, 0), 100, poll.question);
  assert.deepEqual(poll.sampleResults.map((r) => r.option), poll.options, poll.question);
}
assert.equal(new Set(P.CHALLENGE_BANK.map((c) => c.id)).size, 20, 'challenge ids unique');

// 2. 12 consecutive weeks -> 12 distinct polls
assert.equal(new Set(ids(12, 2026, 20).map(P.pollForWeek)).size, 12, 'polls repeat within bank length');

// 3. 20 consecutive weeks -> every challenge is a window start; no dup within a week
const starts = new Set();
for (const id of ids(20, 2026, 20)) {
  const c = P.challengesForWeek(id);
  assert.equal(c.length, 5, id);
  assert.equal(new Set(c.map((x) => x.id)).size, 5, `duplicate challenge in ${id}`);
  starts.add(c[0].id);
}
assert.equal(starts.size, 20, 'challenge rotation does not cover the bank');

// 4. consecutive weeks differ / windows slide by one
assert.notEqual(P.pollForWeek('2026-W35'), P.pollForWeek('2026-W36'));
assert.deepEqual(P.challengesForWeek('2026-W36').slice(0, 4), P.challengesForWeek('2026-W35').slice(1));

console.log('polls-rotation: all assertions passed');
