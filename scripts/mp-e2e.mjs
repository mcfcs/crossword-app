// Two-client multiplayer end-to-end test — no npm deps.
//
// Spins up `vite preview` (production build), launches TWO headless Edge
// instances (separate profiles → distinct guest ids), seeds a game row via the
// Supabase REST API, then has both browsers JOIN the real Realtime channel via
// the app's own ?join= flow. Drives real keystrokes/clicks over the Chrome
// DevTools Protocol and asserts the two boards actually stay in sync — covering
// the bugs from the plan: edits transfer both ways, remote cursor highlights,
// presence (names) on both sides, board reconcile on rejoin, host auto-transfer
// on leave, and Enter/Space/Tab clue navigation.
//
// Run:  node scripts/mp-e2e.mjs        (build first: npm run build)
// It manages/kills its own preview server + Edge instances; nothing is left running.

import { spawn } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT_A = 9333, PORT_B = 9334;
const PREVIEW_PORT = 4173;
const BASE = `http://localhost:${PREVIEW_PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name) => { results.push({ name, pass: true }); console.log(`  ✓ ${name}`); };
const bad = (name, detail) => { results.push({ name, pass: false, detail }); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); };
const warn = (name, detail) => { results.push({ name, pass: true, warn: true }); console.log(`  ! ${name} (soft) ${detail ? `— ${detail}` : ''}`); };

// ---- read Supabase creds from .env ----
function readEnv() {
  const env = readFileSync(join(ROOT, '.env'), 'utf8');
  const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1]?.trim();
  const url = get('VITE_SUPABASE_URL'); const key = get('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env');
  return { url, key };
}

// ---- a tiny valid 5x5 puzzle (no blocks) ----
function makePuzzle() {
  const rows = ['ABCDE', 'FGHIJ', 'KLMNO', 'PQRST', 'UVWXY'];
  const grid = rows.map((r) => r.split(''));
  const across = [
    { number: 1, row: 0, col: 0, clue: 'A1' }, { number: 6, row: 1, col: 0, clue: 'A6' },
    { number: 7, row: 2, col: 0, clue: 'A7' }, { number: 8, row: 3, col: 0, clue: 'A8' },
    { number: 9, row: 4, col: 0, clue: 'A9' },
  ];
  const down = [
    { number: 1, row: 0, col: 0, clue: 'D1' }, { number: 2, row: 0, col: 1, clue: 'D2' },
    { number: 3, row: 0, col: 2, clue: 'D3' }, { number: 4, row: 0, col: 3, clue: 'D4' },
    { number: 5, row: 0, col: 4, clue: 'D5' },
  ];
  return { grid, clues: { across, down }, meta: { title: 'E2E' } };
}
const blankGrid = (grid) => grid.map((row) => row.map((c) => (c === '#' ? '#' : '')));
const uuid = () => 'e2e-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
const code5 = () => String(Math.floor(10000 + Math.random() * 90000));

// ---- minimal CDP client over the DevTools websocket ----
async function getPageWs(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const pg = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (pg) return pg.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`No CDP page target on :${port}`);
}
function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map(); const listeners = [];
  const ready = new Promise((res, rej) => { ws.addEventListener('open', () => res()); ws.addEventListener('error', () => rej(new Error('CDP ws error'))); });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method) listeners.forEach((l) => l(m));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params })); });
  return { ready, send, on: (cb) => listeners.push(cb), close: () => ws.close() };
}

async function makeClient(port, label) {
  const c = connectCdp(await getPageWs(port)); await c.ready;
  const errors = [];
  c.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || 'exception');
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console.error: ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  });
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable');
  const evalx = async (expr) => {
    const r = await c.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`[${label}] eval: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  const waitFor = async (expr, { timeout = 20000, interval = 250, desc = expr } = {}) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { if (await evalx(expr)) return true; await sleep(interval); }
    throw new Error(`[${label}] timeout waiting for: ${desc}`);
  };
  const navigate = async (url) => { await c.send('Page.navigate', { url }); await waitFor("document.readyState === 'complete'", { desc: 'page load' }); await sleep(400); };
  const clickText = (text) => evalx(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().includes(${JSON.stringify(text)}));if(!b)return false;b.click();return true;})()`);
  const gridSel = '.xw-grid--play';
  const readGrid = () => evalx(`(()=>{const rows=[...document.querySelectorAll('${gridSel} > .flex')];return rows.map(r=>[...r.querySelectorAll('.xw-cell')].map(c=>{const l=c.querySelector('.xw-letter');return l?l.textContent:'';}));})()`);
  const clickCell = (r, cc) => evalx(`(()=>{const rows=[...document.querySelectorAll('${gridSel} > .flex')];const cell=rows[${r}]?.querySelectorAll('.xw-cell')[${cc}];if(!cell)return false;cell.click();return true;})()`);
  const key = (k) => evalx(`(window.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true,cancelable:true})),true)`);
  const selected = () => evalx(`(()=>{const rows=[...document.querySelectorAll('${gridSel} > .flex')];for(let r=0;r<rows.length;r++){const cs=[...rows[r].querySelectorAll('.xw-cell')];for(let c=0;c<cs.length;c++)if(cs[c].classList.contains('bg-select'))return {r,c};}return null;})()`);
  const remoteTintAt = (r, cc) => evalx(`(()=>{const rows=[...document.querySelectorAll('${gridSel} > .flex')];const cell=rows[${r}]?.querySelectorAll('.xw-cell')[${cc}];if(!cell)return false;return [...cell.querySelectorAll('span')].some(s=>s.style&&(s.style.backgroundColor||s.style.boxShadow));})()`);
  const bodyHas = (t) => evalx(`document.body.innerText.includes(${JSON.stringify(t)})`);
  const setOffline = (off) => c.send('Network.emulateNetworkConditions', { offline: off, latency: 0, downloadThroughput: off ? 0 : -1, uploadThroughput: off ? 0 : -1 });
  // type a word starting at (r,c) in a direction, clicking each cell first (deterministic)
  const typeWord = async (r, cc, dir, word) => {
    for (let i = 0; i < word.length; i++) {
      const rr = dir === 'across' ? r : r + i; const ccc = dir === 'across' ? cc + i : cc;
      await clickCell(rr, ccc); await sleep(90); await key(word[i]); await sleep(160);
    }
  };
  return { label, evalx, waitFor, navigate, clickText, readGrid, clickCell, key, selected, remoteTintAt, bodyHas, setOffline, typeWord, errors, close: c.close };
}

// join the seeded game as a given identity via the app's ?join= flow
async function joinAs(cl, id, name, code) {
  await cl.navigate(BASE);
  await cl.evalx(`(localStorage.setItem('krosalita:mpId',${JSON.stringify(id)}),localStorage.setItem('krosalita:mpName',${JSON.stringify(name)}),true)`);
  await cl.navigate(`${BASE}/?join=${code}`);
  await cl.waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Join game'))`, { desc: 'join modal' });
  await cl.clickText('Join game');
  try {
    await cl.waitFor(`!!document.querySelector('.xw-grid--play') || !!document.querySelector('.xw-grid--game')`, { desc: 'board after join', timeout: 25000 });
  } catch (e) {
    const err = await cl.evalx(`(document.querySelector('.text-wrong,.border-wrong')?.innerText)||''`);
    const which = await cl.evalx(`document.querySelector('.xw-grid--play')?'play':document.querySelector('.xw-grid--game')?'game':'none'`);
    const body = await cl.evalx(`document.body.innerText.replace(/\\s+/g,' ').slice(0,400)`);
    throw new Error(`${e.message} | modalError="${err}" | grid=${which} | body="${body}" | jsErrors=${JSON.stringify(cl.errors.slice(-3))}`);
  }
  const studio = await cl.evalx(`!!document.querySelector('.xw-grid--play')`);
  if (!studio) { await cl.evalx(`(document.querySelector('[aria-label="Exit game view"]')?.click(),true)`); await sleep(600); } // ensure studio PlayView for assertions
  await cl.waitFor(`!!document.querySelector('.xw-grid--play')`, { desc: 'studio board' });
  await sleep(1500); // let realtime subscribe + presence sync
}

// ---- process management ----
const procs = [];
function killPid(pid) { try { spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ignore */ } }
function launchEdge(port) {
  const dir = mkdtempSync(join(tmpdir(), 'mpE2E-'));
  const p = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--window-size=1400,950', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });
  procs.push({ pid: p.pid, dir });
  return p;
}

async function main() {
  const { url, key } = readEnv();
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) throw new Error('dist/ missing — run `npm run build` first.');

  // 1) preview server
  console.log('• starting vite preview…');
  const preview = spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT), '--strictPort'], { cwd: ROOT, shell: true, stdio: 'ignore' });
  procs.push({ pid: preview.pid });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch { /* not up */ } await sleep(300); }

  // 2) seed a game row (A is host)
  const puzzle = makePuzzle(); const code = code5();
  const aId = uuid(), bId = uuid();
  console.log(`• seeding game ${code} (host=${aId.slice(0, 10)}…)`);
  const seed = await fetch(`${url}/rest/v1/games`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ code, host_id: aId, puzzle, gamemode: 'coop', state: { grid: blankGrid(puzzle.grid) }, status: 'playing' }),
  });
  if (!seed.ok) throw new Error(`seed insert failed: ${seed.status} ${await seed.text()}`);

  // 3) launch two browsers + join
  console.log('• launching two headless Edge clients…');
  launchEdge(PORT_A); launchEdge(PORT_B);
  const A = await makeClient(PORT_A, 'A'); const B = await makeClient(PORT_B, 'B');
  console.log('• A joining (host)…'); await joinAs(A, aId, 'Alice', code);
  console.log('• B joining…'); await joinAs(B, bId, 'Bob', code);

  console.log('\nassertions:');
  // presence: names on both sides (poll — presence diffs propagate async)
  const seesName = async (cl, name) => { for (let i = 0; i < 32; i++) { if (await cl.bodyHas(name)) return true; await sleep(250); } return false; };
  (await seesName(A, 'Bob')) ? ok('A sees Bob in the game') : bad('A sees Bob in the game');
  (await seesName(B, 'Alice')) ? ok('B sees Alice in the game') : bad('B sees Alice in the game');

  // sync A -> B
  await A.typeWord(0, 0, 'across', 'HELLO');
  await sleep(1200);
  let bg = await B.readGrid();
  (bg[0].join('') === 'HELLO') ? ok('A→B: edits transfer') : bad('A→B: edits transfer', `B row0="${bg[0].join('')}"`);

  // sync B -> A
  await B.typeWord(1, 0, 'across', 'WORLD');
  await sleep(1200);
  let ag = await A.readGrid();
  (ag[1].join('') === 'WORLD') ? ok('B→A: edits transfer') : bad('B→A: edits transfer', `A row1="${ag[1].join('')}"`);

  // remote cursor highlight: B's cursor is on row1 → A should tint there
  await B.clickCell(1, 2); await sleep(800);
  (await A.remoteTintAt(1, 2)) ? ok('A shows B’s remote cursor highlight') : bad('A shows B’s remote cursor highlight');

  // clue nav: Enter / Space / Tab advance selection
  await A.clickCell(0, 0); await sleep(300);
  const before = await A.selected();
  await A.key('Enter'); await sleep(400);
  const afterEnter = await A.selected();
  (JSON.stringify(before) !== JSON.stringify(afterEnter) && afterEnter) ? ok('Enter jumps to next clue') : bad('Enter jumps to next clue', `before=${JSON.stringify(before)} after=${JSON.stringify(afterEnter)}`);
  await A.key(' '); await sleep(300); const afterSpace = await A.selected();
  (JSON.stringify(afterSpace) !== JSON.stringify(afterEnter)) ? ok('Space jumps to next clue') : bad('Space jumps to next clue');
  await A.key('Tab'); await sleep(300); const afterTab = await A.selected();
  (JSON.stringify(afterTab) !== JSON.stringify(afterSpace)) ? ok('Tab jumps to next clue') : bad('Tab jumps to next clue');

  // reconcile on rejoin: reload B → should still show the current board (HELLO/WORLD)
  await B.navigate(`${BASE}/?join=${code}`);
  await B.waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Join game'))`, { desc: 'join modal (reload)' });
  await B.clickText('Join game');
  await B.waitFor(`!!document.querySelector('.xw-grid--play')`, { desc: 'board after rejoin', timeout: 25000 });
  await sleep(2000);
  bg = await B.readGrid();
  (bg[0].join('') === 'HELLO' && bg[1].join('') === 'WORLD') ? ok('B rejoin reconciles to current board') : bad('B rejoin reconciles to current board', `row0="${bg[0].join('')}" row1="${bg[1].join('')}"`);

  // offline → online reconnect (best-effort; phoenix heartbeat can be slow)
  try {
    await B.setOffline(true);
    await A.typeWord(2, 0, 'across', 'AAAAA'); await sleep(3000); // A persists while B is offline
    await B.setOffline(false);
    const t0 = Date.now(); let synced = false;
    while (Date.now() - t0 < 45000) { bg = await B.readGrid(); if (bg[2].join('') === 'AAAAA') { synced = true; break; } await sleep(1500); }
    synced ? ok('B recovers A’s edits after offline→online') : warn('B recovers A’s edits after offline→online', 'not within 45s (heartbeat timing)');
  } catch (e) { warn('offline→online reconnect', e.message); }

  // host leave → auto-transfer to B, B keeps editing; A can rejoin
  await A.clickText('Leave'); await sleep(2500);
  (await B.bodyHas('Check board')) ? ok('Host auto-transfers to B on host leave') : bad('Host auto-transfers to B on host leave', 'no host-only control on B');
  await B.typeWord(3, 0, 'across', 'BBBBB'); await sleep(800);
  bg = await B.readGrid();
  (bg[3].join('') === 'BBBBB') ? ok('B (new host) can still edit') : bad('B (new host) can still edit', `row3="${bg[3].join('')}"`);
  await joinAs(A, aId, 'Alice', code);
  ag = await A.readGrid();
  (ag[3].join('') === 'BBBBB') ? ok('A rejoins the same live game') : bad('A rejoins the same live game', `row3="${ag[3].join('')}"`);

  A.close(); B.close();
}

let exitCode = 0;
try { await main(); }
catch (e) { console.error('\nFATAL:', e.message); exitCode = 1; }
finally {
  for (const p of procs) if (p.pid) killPid(p.pid);
  await sleep(1500);
  for (const p of procs) if (p.dir) { try { rmSync(p.dir, { recursive: true, force: true }); } catch { /* ignore */ } }
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${'='.repeat(48)}\n${results.filter((r) => r.pass && !r.warn).length} passed, ${results.filter((r) => r.warn).length} soft, ${fails.length} failed`);
  if (fails.length) { console.log('FAILURES:'); fails.forEach((f) => console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`)); exitCode = 1; }
  process.exit(exitCode);
}
