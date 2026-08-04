import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, RefreshCw, X } from './Icons';
import { searchCwf, fetchCwfPuzzle } from '../lib/api';

/**
 * Browse & import puzzles from crosswithfriends via the /api/cwf proxy.
 * On import it hands a canonical { grid, clues } puzzle back to the parent,
 * which loads it into Play mode through the existing startPlayMode().
 */
const BrowseView = ({ onPlay, onHost }) => {
  const [query, setQuery] = useState('');
  const [standard, setStandard] = useState(true);
  const [mini, setMini] = useState(true);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [loadingPid, setLoadingPid] = useState(null);
  const [notice, setNotice] = useState('');
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q, std, mn) => {
    setSearching(true);
    setError('');
    try {
      const puzzles = await searchCwf({ q, standard: std, mini: mn });
      setResults(puzzles);
      if (puzzles.length === 0) setError('No puzzles found. Try a different search.');
    } catch (err) {
      setError(err.message || 'Search failed.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search on query/filter changes.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, standard, mini), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, standard, mini, runSearch]);

  const importPuzzle = async (pid, { retry = false } = {}) => {
    setLoadingPid(pid);
    setError('');
    if (!retry) setNotice('');
    try {
      const puzzle = await fetchCwfPuzzle(pid);
      if (puzzle.meta?.hasRebus) setNotice('Heads up: this puzzle has rebus squares — multi-letter answers are shortened to one letter.');
      onPlay?.(puzzle); // switches to Play (this view unmounts)
    } catch (err) {
      if (err.retryable) {
        setNotice('The puzzle source is waking up (free host). Retrying…');
        setTimeout(() => importPuzzle(pid, { retry: true }), 3500); // keep the spinner
        return;
      }
      setError(err.message || 'Could not import that puzzle.');
      setLoadingPid(null);
    }
  };

  return (
    <div className="animate-rise-in" style={{ animationDelay: '60ms' }}>
      <div className="panel panel-pad mb-6">
        <div className="eyebrow">Import</div>
        <h2 className="font-display text-2xl font-semibold text-ink leading-tight mb-1">Play from Crosswithfriends</h2>
        <p className="text-ink-faint text-sm mb-4">Search the crosswithfriends catalogue and play any puzzle right here — no app, no iOS-only quirks.</p>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="field pl-9"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"><X size={15} /></button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="eyebrow mr-1">Sizes</span>
          <button onClick={() => setStandard((v) => !v)} className={`px-2.5 py-1 rounded-sm border text-[11px] font-bold uppercase tracking-wide transition ${standard ? 'border-ink bg-ink text-paper-raised' : 'border-ink/25 text-ink-soft hover:bg-ink/5'}`}>Standard</button>
          <button onClick={() => setMini((v) => !v)} className={`px-2.5 py-1 rounded-sm border text-[11px] font-bold uppercase tracking-wide transition ${mini ? 'border-ink bg-ink text-paper-raised' : 'border-ink/25 text-ink-soft hover:bg-ink/5'}`}>Mini</button>
          {searching && <span className="text-ink-faint text-xs flex items-center gap-1.5"><span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/25 border-t-ink" />Searching…</span>}
        </div>

        {notice && <div className="mt-4 border-l-2 border-gold bg-gold/8 px-4 py-3 text-ink-soft text-sm">{notice}</div>}
        {error && <div className="mt-4 border-l-2 border-wrong bg-wrong/8 px-4 py-3 text-wrong text-sm font-medium">{error}</div>}
      </div>

      {results.length > 0 && (
        <div className="panel divide-y divide-line overflow-hidden">
          {results.map((p) => (
            <div key={p.pid} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.03] transition">
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-ink truncate">{p.title}</div>
                <div className="text-ink-faint text-xs truncate">
                  {p.author && <span>{p.author}</span>}
                  {p.size && <span className="chip ml-2">{p.size}</span>}
                </div>
              </div>
              {onHost && (
                <button onClick={async () => { const puz = await fetchCwfPuzzle(p.pid).catch(() => null); if (puz) onHost(puz); }} className="btn btn-sm btn-ghost hidden sm:inline-flex">Host</button>
              )}
              <button onClick={() => importPuzzle(p.pid)} disabled={loadingPid === p.pid} className="btn btn-sm btn-accent">
                {loadingPid === p.pid ? <><RefreshCw size={14} className="animate-spin" />Loading…</> : <><Play size={13} />Play</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseView;
