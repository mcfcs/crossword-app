import React from 'react';
import { Crown, Eye, X } from '../Icons';

// Live leaderboard/roster. Ranks by score (points mode) or cells filled (co-op).
// Host sees per-player Kick / Make-host actions. `players` comes from presence.
const Roster = ({ players = [], scores = {}, fills = {}, gamemode = 'coop', isHost, hostId, myId, onKick, onTransferHost }) => {
  const points = gamemode === 'points';
  const valueOf = (id) => (points ? scores[id] || 0 : fills[id] || 0);
  const solvers = players.filter((p) => p && p.playerId && !p.spectator);
  const spectators = players.filter((p) => p && p.playerId && p.spectator);
  solvers.sort((a, b) => valueOf(b.playerId) - valueOf(a.playerId));

  const row = (p, rank) => (
    <div key={p.playerId} className="flex items-center gap-2.5 px-1 py-1.5 text-sm">
      {rank != null && <span className="font-mono text-ink-faint w-4 text-right text-xs">{rank}</span>}
      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
      <span className="truncate text-ink">{p.name}{p.playerId === myId ? ' (you)' : ''}</span>
      {p.playerId === hostId && <Crown size={13} className="text-gold shrink-0" title="Host" />}
      {p.spectator && <Eye size={13} className="text-ink-faint shrink-0" title="Spectator" />}
      {!p.spectator && <span className="ml-auto font-mono font-semibold text-ink tabular-nums">{valueOf(p.playerId)}<span className="text-ink-faint font-normal text-xs">{points ? ' pts' : ' cells'}</span></span>}
      {isHost && p.playerId !== myId && (
        <span className={`flex items-center gap-1 ${p.spectator ? 'ml-auto' : ''}`}>
          {!p.spectator && <button onClick={() => onTransferHost?.(p.playerId)} className="text-[11px] font-semibold text-ink-faint hover:text-accent" title="Make host">host</button>}
          <button onClick={() => onKick?.(p.playerId)} className="text-ink-faint hover:text-wrong" title="Kick"><X size={14} /></button>
        </span>
      )}
    </div>
  );

  return (
    <div>
      <div className="eyebrow mb-1">{points ? 'Standings' : 'Contribution'}</div>
      {solvers.map((p, i) => row(p, i + 1))}
      {spectators.length > 0 && (
        <>
          <div className="eyebrow mt-3 mb-1 text-ink-faint">Spectators</div>
          {spectators.map((p) => row(p, null))}
        </>
      )}
      {players.length === 0 && <div className="text-ink-faint text-sm py-2">Connecting…</div>}
    </div>
  );
};

export default Roster;
