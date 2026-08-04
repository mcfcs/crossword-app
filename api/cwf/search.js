// GET /api/cwf/search?q=&page=0&pageSize=50&standard=true&mini=true
// Proxies crosswithfriends' puzzle_list and returns a trimmed, stable shape.
import { upstreamGet } from './_upstream.js';

export const config = { maxDuration: 20 };

const bool = (v, dflt) => (v == null ? dflt : v === 'true' || v === '1' || v === true);

const sizeLabel = (item) => {
  const g = item.content?.grid || item.grid;
  if (Array.isArray(g) && g.length) {
    const rows = g.length;
    const cols = Array.isArray(g[0]) ? g[0].length : Math.round(g.length ** 0.5);
    return `${rows}x${cols}`;
  }
  return item.size || '';
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { q = '', page = '0', pageSize = '50', standard, mini, debug } = req.query;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  params.set('filter[nameOrTitleFilter]', String(q));
  params.set('filter[sizeFilter][Standard]', String(bool(standard, true)));
  params.set('filter[sizeFilter][Mini]', String(bool(mini, true)));

  try {
    const data = await upstreamGet(`/api/puzzle_list?${params.toString()}`);
    if (debug) return res.status(200).json(data);

    const list = Array.isArray(data) ? data : data.puzzles || data.results || [];
    const puzzles = list.map((item) => {
      const info = item.content?.info || {};
      return {
        pid: String(item.pid ?? item.id ?? item._id ?? ''),
        title: info.titleOverride || info.title || item.title || 'Untitled',
        author: info.author || item.author || '',
        type: info.type || '',
        size: sizeLabel(item),
        uploaded: item.uploaded_at || item.stats?.uploaded_at || item.date || null,
      };
    }).filter((p) => p.pid);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ puzzles });
  } catch (err) {
    return res.status(502).json({ error: 'search_failed', message: String(err.message || err) });
  }
}
