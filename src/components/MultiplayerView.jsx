import React, { useState, useEffect } from 'react';
import PlayView from './PlayView';
import GameView from './GameView';
import LobbyModal from './LobbyModal';
import RematchModal from './RematchModal';
import Roster from './mp/Roster';
import ChatPanel from './mp/ChatPanel';
import Toasts from './mp/Toasts';
import Reactions from './mp/Reactions';
import { Play, FolderOpen, X, Share, Check, Maximize, RefreshCw, MessageCircle } from './Icons';
import { supabaseEnabled } from '../lib/supabase';
import { useMultiplayerGame } from '../multiplayer/useMultiplayerGame';

const inviteUrl = (code) => `${window.location.origin}${window.location.pathname}?join=${code}`;

// Renders the live board once you're in a game. Drives PlayView (studio) or
// GameView (immersive) via the multiplayer adapter, plus roster/chat/toasts.
function MultiplayerBoard({ game, me, onLeave, onGeneratePuzzle }) {
  const mp = useMultiplayerGame(game, me);
  const [copied, setCopied] = useState(false);
  const [gameView, setGameView] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches);
  const [chatOpen, setChatOpen] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);

  const copyInvite = () => {
    const url = inviteUrl(mp.code);
    (navigator.clipboard?.writeText(url) || Promise.reject())
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => { window.prompt('Copy this invite link:', url); });
  };

  // kicked by host → leave
  useEffect(() => { if (mp.kicked) onLeave(); }, [mp.kicked, onLeave]);

  // Leave cleanly: hand off host / drop from roster before tearing down.
  const handleLeave = async () => { try { await mp.leaveGame(); } catch { /* ignore */ } onLeave(); };

  // physical keyboard → shared board (works for studio + game view)
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable) return;
      const navKey = e.key === 'Enter' || e.key === ' ' || e.key === 'Tab';
      if (e.key === 'Backspace' || e.key.startsWith('Arrow') || navKey || (e.key.length === 1 && /[a-zA-Z]/.test(e.key))) {
        e.preventDefault();
        mp.onVirtualKey(e.key === 'Tab' && e.shiftKey ? 'ShiftTab' : e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mp]);

  const doRematch = (puzzle) => { mp.rematch(puzzle); setRematchOpen(false); };

  return (
    <>
      {gameView ? (
        <GameView
          {...mp}
          onCheckPuzzle={mp.checkBoard}
          onKick={mp.kick}
          onTransferHost={mp.transferHost}
          onRematch={() => setRematchOpen(true)}
          onCopyInvite={copyInvite}
          onLeave={handleLeave}
          onExit={() => setGameView(false)}
        />
      ) : (
        <div className="animate-rise-in">
          <div className="panel panel-pad mb-5">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="eyebrow">Game code</div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-2xl font-bold tracking-[0.3em] text-ink">{mp.code}</div>
                  <button onClick={copyInvite} className={`btn btn-sm ${copied ? 'btn-ink' : 'btn-ghost'}`}>
                    {copied ? <><Check size={14} />Copied!</> : <><Share size={14} />Invite link</>}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <button onClick={() => setGameView(true)} className="btn btn-sm btn-ghost"><Maximize size={14} />Game view</button>
                {mp.isHost && <button onClick={() => mp.setGamemode(mp.gamemode === 'coop' ? 'points' : 'coop')} className="btn btn-sm btn-ghost">Mode · {mp.gamemode === 'coop' ? 'Co-op' : 'Points'}</button>}
                {mp.isHost && <button onClick={mp.checkBoard} className="btn btn-sm">Check board</button>}
                {mp.isHost && <button onClick={() => setRematchOpen(true)} className="btn btn-sm btn-ghost"><RefreshCw size={14} />Rematch</button>}
                <button onClick={() => setChatOpen((o) => !o)} className="btn btn-sm btn-ghost"><MessageCircle size={14} />Chat{mp.chat.length ? ` · ${mp.chat.length}` : ''}</button>
                <button onClick={handleLeave} className="btn btn-sm btn-ghost"><X size={14} />Leave</button>
              </div>
            </div>
            {!mp.connected && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <span className="inline-block w-2 h-2 rounded-full bg-wrong animate-pulse" />Reconnecting…
              </div>
            )}
            <div className="rule-hair my-3" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Roster players={mp.players} scores={mp.scores} fills={mp.fills} gamemode={mp.gamemode} isHost={mp.isHost} hostId={mp.hostId} myId={me.id} onKick={mp.kick} onTransferHost={mp.transferHost} />
              {chatOpen && <div className="h-64 border border-line rounded-lg px-2"><ChatPanel chat={mp.chat} myId={me.id} onSend={mp.sendChat} onReact={mp.sendReaction} /></div>}
            </div>
          </div>

          <PlayView {...mp} canControl={mp.isHost} difficultyInfo={{ score: null, label: '' }} onEnterGameView={() => setGameView(true)} />
        </div>
      )}

      <Toasts toasts={mp.toasts} />
      <Reactions reactions={mp.reactions} />
      <RematchModal open={rematchOpen} onClose={() => setRematchOpen(false)} onGenerate={onGeneratePuzzle} onPick={doRematch} />
    </>
  );
}

const MultiplayerView = ({ puzzle, seedPuzzle, onConsumeSeed, authUser, autoJoinCode, onGeneratePuzzle }) => {
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
    return <MultiplayerBoard game={session.game} me={session.me} onLeave={() => setSession(null)} onGeneratePuzzle={onGeneratePuzzle} />;
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
