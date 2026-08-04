// Thin client for the in-repo crosswithfriends proxy (Vercel serverless /api/cwf/*).

export async function searchCwf({ q = '', page = 0, standard = true, mini = true } = {}) {
  const params = new URLSearchParams({
    q, page: String(page), standard: String(standard), mini: String(mini),
  });
  const res = await fetch(`/api/cwf/search?${params.toString()}`);
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || `Search failed (${res.status})`);
  }
  const data = await res.json();
  return data.puzzles || [];
}

export async function fetchCwfPuzzle(pid) {
  const res = await fetch(`/api/cwf/puzzle?pid=${encodeURIComponent(pid)}`);
  const data = await res.json().catch(() => ({}));
  if (res.status === 503) {
    const e = new Error(data.message || 'The puzzle source is waking up — try again.');
    e.retryable = true;
    throw e;
  }
  if (!res.ok) throw new Error(data.message || `Couldn’t load puzzle (${res.status})`);
  return data; // { meta, version, layout, grid, clues }
}
