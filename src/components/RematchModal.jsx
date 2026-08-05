import React, { useState } from 'react';
import { X, RefreshCw, Search, Play } from './Icons';
import { searchCwf, fetchCwfPuzzle } from '../lib/api';

// Host picks the rematch puzzle: generate a fresh one, or import from
// crosswithfriends. On pick → onPick(puzzle) (the hook broadcasts the rematch).
const RematchModal = ({ open, onClose, onGenerate, onPick }) => {
  const [tab, setTab] = useState('generate');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingPid, setLoadingPid] = useState(null);

  if (!open) return null;

  const generate = async () => {
    setBusy(true); setError('');
    try {
      const puzzle = await onGenerate?.();
      if (puzzle) onPick(puzzle);
      else setError('Could not generate a full puzzle — try Crosswithfriends.');
    } catch (e) { setError(e.message || 'Generation failed.'); }
    setBusy(false);
  };

  const runSearch = async () => {
    setSearching(true); setError('');
    try { setResults(await searchCwf({ q })); } catch (e) { setError(e.message || 'Search failed.'); }
    setSearching(false);
  };

  const pickCwf = async (pid) => {
    setLoadingPid(pid); setError('');
    try { onPick(await fetchCwfPuzzle(pid)); } catch (e) { setError(e.message || 'Could not load puzzle.'); setLoadingPid(null); }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-ink/45 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div className="panel w-full max-w-lg p-6 animate-rise-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-2xl font-semibold text-ink">Rematch — new puzzle</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={20} /></button>
        </div>

        <div className="flex gap-1 mb-4 border-b-2 border-line">
          <button onClick={() => setTab('generate')} className={`tab ${tab === 'generate' ? 'tab-active' : ''}`}>Generate</button>
          <button onClick={() => setTab('cwf')} className={`tab ${tab === 'cwf' ? 'tab-active' : ''}`}>Crosswithfriends</button>
        </div>

        {tab === 'generate' ? (
          <div>
            <p className="text-ink-soft text-sm mb-4">Build a fresh puzzle from your loaded word list and current layout — everyone's board resets to it.</p>
            <button onClick={generate} disabled={busy} className="btn btn-accent w-full">
              {busy ? <><RefreshCw size={16} className="animate-spin" />Generating…</> : <><RefreshCw size={16} />Generate & restart</>}
            </button>
          </div>
        ) : (
          <div>
            <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search puzzles…" className="field pl-9" />
              </div>
              <button type="submit" className="btn">{searching ? <RefreshCw size={16} className="animate-spin" /> : 'Search'}</button>
            </form>
            <div className="divide-y divide-line max-h-72 overflow-y-auto">
              {results.map((p) => (
                <div key={p.pid} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate text-sm">{p.title}</div>
                    <div className="text-ink-faint text-xs truncate">{p.author}{p.size ? ` · ${p.size}` : ''}</div>
                  </div>
                  <button onClick={() => pickCwf(p.pid)} disabled={loadingPid === p.pid} className="btn btn-sm btn-accent">
                    {loadingPid === p.pid ? <RefreshCw size={13} className="animate-spin" /> : <><Play size={12} />Use</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="mt-4 border-l-2 border-wrong bg-wrong/8 px-3 py-2 text-wrong text-sm">{error}</div>}
      </div>
    </div>
  );
};

export default RematchModal;
