// GET /api/cwf/puzzle?pid=<id>[&debug=1]
// Reserves a game, joins over Socket.IO, replays events to get the full puzzle,
// and returns Krosalita's canonical { meta, version, layout, grid, clues }.
import { fetchGamePayload } from './_upstream.js';
import { toKrosalita } from './_transform.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { pid, debug } = req.query;
  if (!pid) return res.status(400).json({ error: 'missing_pid' });

  // The downforacross socket lives on a free host that cold-starts; one retry.
  let game;
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      game = await fetchGamePayload(String(pid));
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!game) {
    const msg = String(lastErr?.message || lastErr || 'unknown');
    const retryable = /timeout|connect|ECONN|network|create event/i.test(msg);
    return res.status(retryable ? 503 : 502).json({ error: 'fetch_failed', retryable, message: msg });
  }

  if (debug) return res.status(200).json({ game });

  try {
    const puzzle = toKrosalita(game);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(puzzle);
  } catch (err) {
    return res.status(500).json({ error: 'transform_failed', message: String(err.message || err) });
  }
}
