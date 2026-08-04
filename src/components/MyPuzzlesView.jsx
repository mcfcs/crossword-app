import React, { useState, useEffect, useCallback } from 'react';
import { Play, PenTool, Trash2, RefreshCw } from './Icons';
import { supabaseEnabled } from '../lib/supabase';
import { listMyPuzzles, deletePuzzle, setPuzzlePublic } from '../lib/puzzles';

// A signed-in user's saved crosswords. Guests see a sign-in prompt.
const MyPuzzlesView = ({ authUser, onSignIn, onPlay, onEdit, onHost }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!authUser) return;
    setLoading(true); setError('');
    try { setRows(await listMyPuzzles()); }
    catch (err) { setError(err.message || 'Could not load puzzles.'); }
    finally { setLoading(false); }
  }, [authUser]);

  useEffect(() => { load(); }, [load]);

  if (!supabaseEnabled) {
    return (
      <div className="panel p-10 text-center animate-rise-in">
        <h3 className="font-display text-2xl font-semibold text-ink mb-2">Saved puzzles need Supabase</h3>
        <p className="text-ink-faint max-w-md mx-auto text-sm">Configure <code className="chip">VITE_SUPABASE_URL</code> / <code className="chip">VITE_SUPABASE_ANON_KEY</code> to enable accounts.</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="panel p-10 text-center animate-rise-in">
        <h3 className="font-display text-2xl font-semibold text-ink mb-2">Your puzzle library</h3>
        <p className="text-ink-faint mb-6 max-w-md mx-auto text-sm">Sign in to save crosswords you create and pick them up on any device.</p>
        <button onClick={onSignIn} className="btn btn-accent">Sign in</button>
      </div>
    );
  }

  const remove = async (id) => { await deletePuzzle(id); setRows((r) => r.filter((x) => x.id !== id)); };
  const togglePublic = async (row) => { await setPuzzlePublic(row.id, !row.is_public); setRows((r) => r.map((x) => (x.id === row.id ? { ...x, is_public: !x.is_public } : x))); };

  return (
    <div className="animate-rise-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-semibold text-ink">My Puzzles</h2>
        <button onClick={load} className="btn btn-sm btn-ghost"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      {error && <div className="mb-4 border-l-2 border-wrong bg-wrong/8 px-4 py-3 text-wrong text-sm">{error}</div>}
      {rows.length === 0 && !loading && <div className="panel p-8 text-center text-ink-faint text-sm">No saved puzzles yet. Build one in Create and hit “Save”.</div>}
      {rows.length > 0 && (
        <div className="panel divide-y divide-line overflow-hidden">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[0.03] transition">
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-ink truncate">{row.title || 'Untitled'}</div>
                <div className="text-ink-faint text-xs">{new Date(row.created_at).toLocaleDateString()} {row.is_public && <span className="chip ml-1">public</span>}</div>
              </div>
              <button onClick={() => onPlay?.(row.data)} className="btn btn-sm btn-accent"><Play size={13} />Play</button>
              <button onClick={() => onEdit?.(row.data)} className="btn btn-sm hidden sm:inline-flex"><PenTool size={13} />Edit</button>
              <button onClick={() => onHost?.(row.data)} className="btn btn-sm btn-ghost hidden sm:inline-flex">Host</button>
              <button onClick={() => togglePublic(row)} className="btn btn-sm btn-ghost hidden md:inline-flex">{row.is_public ? 'Make private' : 'Make public'}</button>
              <button onClick={() => remove(row.id)} className="text-ink-faint hover:text-wrong p-1.5"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPuzzlesView;
