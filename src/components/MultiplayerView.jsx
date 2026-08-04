import React, { useState, useEffect } from 'react';
import PlayView from './PlayView';
import LobbyModal from './LobbyModal';
import { Play, FolderOpen, X, Share, Check } from './Icons';
import { supabaseEnabled } from '../lib/supabase';
import { useMultiplayerGame } from '../multiplayer/useMultiplayerGame';

const inviteUrl = (code) => `${window.location.origin}${window.location.pathname}?join=${code}`;

// Renders the live board once you're in a game. Uses the multiplayer adapter to
// drive the unchanged PlayView, plus a lobby panel (code, roster, host controls).
function MultiplayerBoard({ game, me, onLeave }) {
  const mp = useMultiplayerGame(game, me);
  const [copied, setCopied] = useState(false);
  const copyInvite = () => {
    const url = inviteUrl(mp.code);
    (navigator.clipboard?.writeText(url) || Promise.reject())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { window.prompt('Copy this invite link:', url); });
  };

  // physical keyboard → shared board
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable) return;
      if (e.key === 'Backspace' || e.key.startsWith('Arrow') || (e.key.length === 1 && /[a-zA-Z]/.test(e.key))) {
        e.preventDefault();
        mp.onVirtualKey(e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mp]);

  return (
    <div className="animate-rise-in">
      <div className="panel panel-pad mb-5 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="eyebrow">Game code</div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl font-bold tracking-[0.3em] text-ink">{mp.code}</div>
            <button onClick={copyInvite} className={`btn btn-sm ${copied ? 'btn-ink' : 'btn-ghost'}`}>
              {copied ? <><Check size={14} />Copied!</> : <><Share size={14} />Invite link</>}
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[180px]">
          <div className="eyebrow mb-1.5">Players{mp.gamemode === 'points' ? ' · scores' : ''}</div>
          <div className="flex flex-wrap gap-2">
            {mp.players.length === 0 && <span className="text-ink-faint text-sm">Connecting…</span>}
            {mp.players.map((p) => (
              <span key={p.playerId} className="chip" style={{ borderColor: p.color }}>
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.name}{p.playerId === me.id ? ' (you)' : ''}
                {mp.gamemode === 'points' && <b className="ml-1 text-ink">{mp.scores[p.playerId] || 0}</b>}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {mp.isHost && (
            <>
              <button onClick={() => mp.setGamemode(mp.gamemode === 'coop' ? 'points' : 'coop')} className="btn btn-sm btn-ghost">
                Mode · {mp.gamemode === 'coop' ? 'Co-op' : 'Points'}
              </button>
              <button onClick={mp.checkBoard} className="btn btn-sm">Check board</button>
            </>
          )}
          <button onClick={onLeave} className="btn btn-sm btn-ghost"><X size={14} />Leave</button>
        </div>
      </div>

      <PlayView {...mp} canControl={mp.isHost} difficultyInfo={{ score: null, label: '' }} />
    </div>
  );
}

const MultiplayerView = ({ puzzle, seedPuzzle, onConsumeSeed, authUser, autoJoinCode }) => {
  const [session, setSession] = useState(null); // { game, me }
  // Mounts fresh when you switch to this tab; open the host lobby if Browse
  // handed over a puzzle, or the join lobby if arriving via an invite link.
  const [lobby, setLobby] = useState(seedPuzzle ? 'host' : autoJoinCode ? 'join' : null); // null | 'host' | 'join'

  const hostPuzzle = seedPuzzle || puzzle;

  if (!supabaseEnabled) {
    return (
      <div className="panel p-10 text-center animate-rise-in">
        <h3 className="font-display text-2xl font-semibold text-ink mb-2">Multiplayer needs Supabase</h3>
        <p className="text-ink-faint max-w-md mx-auto text-sm">Set <code className="chip">VITE_SUPABASE_URL</code> and <code className="chip">VITE_SUPABASE_ANON_KEY</code> (see <code className="chip">.env.example</code>) and apply <code className="chip">supabase/migrations/0001_init.sql</code>, then reload.</p>
      </div>
    );
  }

  if (session) {
    return <MultiplayerBoard game={session.game} me={session.me} onLeave={() => setSession(null)} />;
  }

  return (
    <>
      <div className="panel p-10 text-center animate-rise-in">
        <h3 className="font-display text-2xl font-semibold text-ink mb-2">Play together</h3>
        <p className="text-ink-faint mb-6 max-w-md mx-auto text-sm">Host any puzzle — generated, imported from Browse, or Tagalog — and share the 5-digit code. Or join a friend's game.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => setLobby('host')} disabled={!hostPuzzle} className="btn btn-accent"><Play size={14} />Host a game</button>
          <button onClick={() => setLobby('join')} className="btn"><FolderOpen size={16} />Join by code</button>
        </div>
        {!hostPuzzle && <p className="text-ink-faint text-xs mt-5 italic">Load or generate a puzzle first (Generate / Browse / Play) to host one.</p>}
      </div>

      <LobbyModal
        isOpen={!!lobby}
        defaultMode={lobby || 'host'}
        initialCode={autoJoinCode || ''}
        puzzle={hostPuzzle}
        authUser={authUser}
        onClose={() => { setLobby(null); onConsumeSeed?.(); }}
        onReady={({ game, me }) => { setSession({ game, me }); setLobby(null); onConsumeSeed?.(); }}
      />
    </>
  );
};

export default MultiplayerView;
