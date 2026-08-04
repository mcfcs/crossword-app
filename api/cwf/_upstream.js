// Upstream constants + helpers for the crosswithfriends / downforacross scrape.
// Isolated here so a contract change is a one-file fix. Files/dirs starting with
// "_" are ignored by Vercel's routing, so this is import-only (not an endpoint).
import { io } from 'socket.io-client';

export const SITE = 'https://www.crosswithfriends.com';
export const SOCKET = 'https://downforacross-com.onrender.com';

// A realistic UA avoids trivial bot blocking on the upstream REST endpoints.
export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const jsonHeaders = { 'User-Agent': UA, Accept: 'application/json' };

export async function upstreamGet(path, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SITE}${path}`, { headers: jsonHeaders, signal: ctrl.signal });
    if (!res.ok) throw new Error(`upstream GET ${path} -> ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function upstreamPost(path, body, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SITE}${path}`, {
      method: 'POST',
      headers: { ...jsonHeaders, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`upstream POST ${path} -> ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(t);
  }
}

const randomId = () =>
  (globalThis.crypto?.randomUUID?.() || `k${Date.now()}${Math.floor(Math.random() * 1e6)}`);

/**
 * Fetch the full puzzle (grid + solution + clues) for a puzzle id.
 * Mirrors the criss flow: reserve a game id, seed a game from the puzzle, then
 * join over Socket.IO and replay events until we see the `create` event that
 * carries the game payload. Resolves the raw cwf `game` object.
 */
export async function fetchGamePayload(pid, { socketTimeoutMs = 20000 } = {}) {
  // 1) reserve a game id, then append a short slug like the real client does
  //    (counter returns "102390352" → game id "102390352-zint").
  const gidRes = await upstreamPost('/api/counters/gid', {});
  const base = String(gidRes.gid ?? gidRes.value ?? gidRes.count ?? randomId());
  const slug = Math.random().toString(36).slice(2, 6);
  const gid = `${base}-${slug}`;
  const dfacId = randomId().replace(/-/g, '').slice(0, 8);

  // 2) seed a game from this puzzle
  await upstreamPost('/api/game', { gid, pid, dfac_id: dfacId });

  // 3) join over Socket.IO and pull the full event history. Use the default
  //    polling→websocket upgrade the browser uses (most compatible with the
  //    free Render host).
  return await new Promise((resolve, reject) => {
    let settled = false;
    const socket = io(SOCKET, {
      auth: { dfacId },
      extraHeaders: { Origin: SITE },
      reconnection: false,
      timeout: 15000,
    });

    const done = (err, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.disconnect(); } catch { /* ignore */ }
      err ? reject(err) : resolve(val);
    };

    const timer = setTimeout(() => done(new Error('socket timeout')), socketTimeoutMs);

    const extractGame = (events) => {
      const list = Array.isArray(events) ? events : events?.events || [];
      const created = list.find((e) => e?.type === 'create');
      const game = created?.params?.game || created?.params;
      if (!game) return done(new Error('no create event'));
      done(null, game);
    };

    socket.on('connect', () => {
      socket.emit('join_game', gid, () => {
        socket.emit('sync_all_game_events', gid, (events) => extractGame(events));
      });
    });
    socket.on('connect_error', (e) => done(new Error(`socket connect_error: ${e?.message || e}`)));
    socket.on('error', (e) => done(new Error(`socket error: ${e?.message || e}`)));
  });
}
