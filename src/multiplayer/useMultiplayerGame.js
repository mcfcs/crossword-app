// Multiplayer state adapter. Owns the shared board and exposes the EXACT prop
// surface PlayView/GameView expect, plus multiplayer social extras (roster,
// scores, fills, chat, reactions, toasts, host actions, rematch). Cell edits +
// host/social actions sync via a Supabase Realtime channel; cursors via presence.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { findSlots, getCellNumber } from '../utils/crosswordUtils';
import { supabase } from '../lib/supabase';
import { sfx } from '../utils/sound';
import {
  openChannel, loadPlayers, persistState, updateGameFields, addScore,
  addFills, resetPlayers, sendChatRow, loadChat, kickPlayer, setHost,
} from './client';

const key = (r, c) => `${r},${c}`;
const blank = (answers) => answers.map((row) => row.map((c) => (c === '#' ? '#' : '')));

export function useMultiplayerGame(game, me) {
  // --- reactive puzzle (so a host rematch can swap it in place) ---
  const [puzzle, setPuzzle] = useState(game.puzzle);
  const answers = puzzle.grid;                 // 2D letters / '#'
  const clues = puzzle.clues;
  const layout = useMemo(() => answers.map((row) => row.map((c) => (c === '#' ? '#' : '.'))), [answers]);
  const slots = useMemo(() => findSlots(layout), [layout]);
  const circles = useMemo(() => new Set(puzzle.circles || []), [puzzle]);
  const shades = useMemo(() => new Set(puzzle.shades || []), [puzzle]);

  const [grid, setGrid] = useState(() => game.state?.grid || blank(answers));
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [autoCheck, setAutoCheckState] = useState(!!game.auto_check);
  const [checkFlash, setCheckFlash] = useState(false);
  const [gamemode, setGamemodeState] = useState(game.gamemode || 'coop');
  const [revealedCells, setRevealedCells] = useState(new Set());
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [fills, setFills] = useState({});
  const [complete, setComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [chat, setChat] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [hostId, setHostId] = useState(game.host_id);
  const [kicked, setKicked] = useState(false);

  const isHost = hostId === me.id;
  const isSpectator = !!me.isSpectator;

  const chanRef = useRef(null);
  const gridRef = useRef(grid); gridRef.current = grid;
  const answersRef = useRef(answers); answersRef.current = answers;
  const scoredCells = useRef(new Set());
  const scoredWords = useRef(new Set());
  const persistTimer = useRef(null);
  const myFillsRef = useRef(0);
  const prevPlayersRef = useRef(new Map());
  const seqRef = useRef(0);

  // ---- timer ----
  useEffect(() => {
    if (complete) return undefined;
    const t = setInterval(() => setTimer((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [complete]);

  // ---- helpers (stable; read current answers via ref so once-registered
  //      channel handlers stay correct after a rematch swaps the puzzle) ----
  const checkComplete = useCallback((g) => {
    const a = answersRef.current;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (a[r]?.[c] !== '#' && g[r]?.[c] !== a[r]?.[c]) return;
      }
    }
    setComplete(true);
  }, []);

  const flashCheck = useCallback(() => {
    setCheckFlash(true);
    setTimeout(() => setCheckFlash(false), 4000);
  }, []);

  const pushToast = useCallback((text) => {
    const id = ++seqRef.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const addReaction = useCallback((name, emoji) => {
    const id = ++seqRef.current;
    setReactions((r) => [...r, { id, name, emoji, x: 10 + Math.random() * 80 }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2500);
  }, []);

  const schedulePersist = useCallback(() => {
    if (!supabase) return;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => persistState(game.id, { grid: gridRef.current }), 1500);
  }, [game.id]);

  const applyRematch = useCallback((newPuzzle) => {
    setPuzzle(newPuzzle);
    setGrid(blank(newPuzzle.grid));
    setRevealedCells(new Set());
    setScores({}); setFills({}); myFillsRef.current = 0;
    scoredCells.current = new Set(); scoredWords.current = new Set();
    setComplete(false); setTimer(0); setSelectedCell(null);
    pushToast('New puzzle — rematch!');
  }, [pushToast]);

  // ---- channel (registered once per game) ----
  useEffect(() => {
    const ch = openChannel(game.id, me.id);
    if (!ch) return undefined;
    chanRef.current = ch;

    ch.on('broadcast', { event: 'cell' }, ({ payload }) => {
      setGrid((g) => { const ng = g.map((row) => [...row]); if (ng[payload.r]?.[payload.c] !== undefined) ng[payload.r][payload.c] = payload.letter; checkComplete(ng); return ng; });
    });
    ch.on('broadcast', { event: 'reveal' }, ({ payload }) => {
      setGrid((g) => { const ng = g.map((row) => [...row]); payload.cells.forEach(({ r, c, letter }) => { if (ng[r]?.[c] !== undefined) ng[r][c] = letter; }); checkComplete(ng); return ng; });
      setRevealedCells((s) => { const n = new Set(s); payload.cells.forEach(({ r, c }) => n.add(key(r, c))); return n; });
    });
    ch.on('broadcast', { event: 'autocheck' }, ({ payload }) => setAutoCheckState(payload.value));
    ch.on('broadcast', { event: 'check' }, () => flashCheck());
    ch.on('broadcast', { event: 'gamemode' }, ({ payload }) => { setGamemodeState(payload.value); setScores({}); scoredCells.current = new Set(); scoredWords.current = new Set(); });
    ch.on('broadcast', { event: 'score' }, ({ payload }) => setScores((s) => ({ ...s, [payload.playerId]: payload.score })));
    ch.on('broadcast', { event: 'fills' }, ({ payload }) => setFills((f) => ({ ...f, [payload.playerId]: payload.fills })));
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => setChat((c) => [...c, payload.msg]));
    ch.on('broadcast', { event: 'reaction' }, ({ payload }) => addReaction(payload.name, payload.emoji));
    ch.on('broadcast', { event: 'host' }, ({ payload }) => setHostId(payload.hostId));
    ch.on('broadcast', { event: 'rematch' }, ({ payload }) => applyRematch(payload.puzzle));
    ch.on('broadcast', { event: 'kick' }, ({ payload }) => { if (payload.playerId === me.id) setKicked(true); });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const list = Object.values(state).flat();
      setPlayers(list);
      // diff for join/leave toasts (skip self)
      const cur = new Map(list.filter((p) => p.playerId && p.playerId !== me.id).map((p) => [p.playerId, p.name]));
      const prev = prevPlayersRef.current;
      if (prev.size || cur.size) {
        cur.forEach((name, id) => { if (!prev.has(id)) pushToast(`${name} joined`); });
        prev.forEach((name, id) => { if (!cur.has(id)) pushToast(`${name} left`); });
      }
      prevPlayersRef.current = cur;
    });

    ch.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await ch.track({ playerId: me.id, name: me.name, color: me.color, r: null, c: null, dir: 'across', spectator: isSpectator });
      const ps = await loadPlayers(game.id);
      setScores(Object.fromEntries(ps.map((p) => [p.player_id, p.score])));
      setFills(Object.fromEntries(ps.map((p) => [p.player_id, p.fills || 0])));
      myFillsRef.current = ps.find((p) => p.player_id === me.id)?.fills || 0;
      setChat(await loadChat(game.id));
    });

    return () => { try { supabase.removeChannel(ch); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  // ---- celebrate on completion (shared board finishes together) ----
  useEffect(() => { if (complete) { sfx.win(); pushToast('Puzzle solved! 🎉'); } }, [complete, pushToast]);

  // ---- broadcast own cursor on selection change ----
  useEffect(() => {
    chanRef.current?.track?.({ playerId: me.id, name: me.name, color: me.color, r: selectedCell?.row ?? null, c: selectedCell?.col ?? null, dir: direction, spectator: isSpectator });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, direction]);

  // ---- slot helpers ----
  const getSlotAt = useCallback((cell, dir) => {
    if (!cell) return null;
    return slots.find((s) => {
      if (s.direction !== dir) return false;
      if (s.direction === 'across') return s.row === cell.row && cell.col >= s.col && cell.col < s.col + s.length;
      return s.col === cell.col && cell.row >= s.row && cell.row < s.row + s.length;
    });
  }, [slots]);
  const getPlayCurrentSlot = useCallback(() => getSlotAt(selectedCell, direction), [getSlotAt, selectedCell, direction]);
  const getNumberForCell = useCallback((r, c, clueSet = clues) => getCellNumber(clueSet, r, c), [clues]);

  // ---- scoring + fills ----
  const bump = useCallback((delta) => {
    const next = (scores[me.id] || 0) + delta;
    setScores((s) => ({ ...s, [me.id]: next }));
    chanRef.current?.send({ type: 'broadcast', event: 'score', payload: { playerId: me.id, score: next } });
    addScore(game.id, me.id, delta);
  }, [scores, me.id, game.id]);

  const bumpFills = useCallback(() => {
    myFillsRef.current += 1;
    const next = myFillsRef.current;
    setFills((f) => ({ ...f, [me.id]: next }));
    chanRef.current?.send({ type: 'broadcast', event: 'fills', payload: { playerId: me.id, fills: next } });
    addFills(game.id, me.id, 1);
  }, [me.id, game.id]);

  const scoreForLetter = useCallback((r, c, letter, g) => {
    if (gamemode !== 'points' || letter !== answers[r][c]) return;
    if (!scoredCells.current.has(key(r, c))) { scoredCells.current.add(key(r, c)); bump(1); }
    for (const dir of ['across', 'down']) {
      const slot = getSlotAt({ row: r, col: c }, dir);
      if (!slot || scoredWords.current.has(slot.id)) continue;
      let full = true;
      for (let i = 0; i < slot.length; i++) {
        const rr = dir === 'across' ? slot.row : slot.row + i;
        const cc = dir === 'across' ? slot.col + i : slot.col;
        if (g[rr][cc] !== answers[rr][cc]) { full = false; break; }
      }
      if (full) { scoredWords.current.add(slot.id); bump(3); }
    }
  }, [gamemode, answers, bump, getSlotAt]);

  // ---- input ----
  const writeCell = useCallback((r, c, letter) => {
    if (isSpectator) return;
    const wasEmpty = !gridRef.current[r]?.[c];
    setGrid((g) => { const ng = g.map((row) => [...row]); ng[r][c] = letter; checkComplete(ng); if (letter) scoreForLetter(r, c, letter, ng); return ng; });
    chanRef.current?.send({ type: 'broadcast', event: 'cell', payload: { r, c, letter } });
    if (letter) { sfx.key(); if (wasEmpty) bumpFills(); }
    schedulePersist();
  }, [isSpectator, checkComplete, scoreForLetter, schedulePersist, bumpFills]);

  const onVirtualKey = useCallback((k) => {
    if (isSpectator || !selectedCell) return;
    const { row, col } = selectedCell;
    const blocked = (r, c) => r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === '#';
    if (k === 'Backspace') {
      if (grid[row][col]) writeCell(row, col, '');
      else if (direction === 'across' && !blocked(row, col - 1)) { writeCell(row, col - 1, ''); setSelectedCell({ row, col: col - 1 }); }
      else if (direction === 'down' && !blocked(row - 1, col)) { writeCell(row - 1, col, ''); setSelectedCell({ row: row - 1, col }); }
      return;
    }
    if (k.length === 1 && /[a-zA-Z]/.test(k)) {
      writeCell(row, col, k.toUpperCase());
      if (direction === 'across' && !blocked(row, col + 1)) setSelectedCell({ row, col: col + 1 });
      else if (direction === 'down' && !blocked(row + 1, col)) setSelectedCell({ row: row + 1, col });
      return;
    }
    if (k === 'ArrowRight' && !blocked(row, col + 1)) { setSelectedCell({ row, col: col + 1 }); setDirection('across'); }
    else if (k === 'ArrowLeft' && !blocked(row, col - 1)) { setSelectedCell({ row, col: col - 1 }); setDirection('across'); }
    else if (k === 'ArrowDown' && !blocked(row + 1, col)) { setSelectedCell({ row: row + 1, col }); setDirection('down'); }
    else if (k === 'ArrowUp' && !blocked(row - 1, col)) { setSelectedCell({ row: row - 1, col }); setDirection('down'); }
  }, [isSpectator, selectedCell, direction, grid, writeCell]);

  const handlePlayCellClick = useCallback((r, c) => {
    if (grid[r][c] === '#') return;
    if (selectedCell?.row === r && selectedCell?.col === c) setDirection((d) => (d === 'across' ? 'down' : 'across'));
    else setSelectedCell({ row: r, col: c });
  }, [grid, selectedCell]);

  const goToAdjacentClue = useCallback((delta) => {
    const list = direction === 'across' ? clues.across : clues.down;
    if (!list?.length) return;
    const slot = getPlayCurrentSlot();
    let idx = slot ? list.findIndex((cl) => cl.row === slot.row && cl.col === slot.col) : -1;
    idx = idx === -1 ? 0 : (idx + delta + list.length) % list.length;
    setSelectedCell({ row: list[idx].row, col: list[idx].col });
  }, [direction, clues, getPlayCurrentSlot]);

  // ---- host actions ----
  const revealCells = useCallback((cells) => {
    chanRef.current?.send({ type: 'broadcast', event: 'reveal', payload: { cells } });
    setGrid((g) => { const ng = g.map((row) => [...row]); cells.forEach(({ r, c, letter }) => { ng[r][c] = letter; }); checkComplete(ng); return ng; });
    setRevealedCells((s) => { const n = new Set(s); cells.forEach(({ r, c }) => n.add(key(r, c))); return n; });
    schedulePersist();
  }, [checkComplete, schedulePersist]);

  const revealCell = useCallback(() => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    revealCells([{ r: row, c: col, letter: answers[row][col] }]);
  }, [selectedCell, answers, revealCells]);
  const revealWord = useCallback(() => {
    const slot = getPlayCurrentSlot();
    if (!slot) return;
    const cells = [];
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      cells.push({ r, c, letter: answers[r][c] });
    }
    revealCells(cells);
  }, [getPlayCurrentSlot, answers, revealCells]);
  const revealAll = useCallback(() => {
    const cells = [];
    for (let r = 0; r < answers.length; r++) for (let c = 0; c < answers[r].length; c++) if (answers[r][c] !== '#') cells.push({ r, c, letter: answers[r][c] });
    revealCells(cells);
  }, [answers, revealCells]);

  const setPlayAutoCheck = useCallback((updater) => {
    const value = typeof updater === 'function' ? updater(autoCheck) : updater;
    setAutoCheckState(value);
    chanRef.current?.send({ type: 'broadcast', event: 'autocheck', payload: { value } });
    updateGameFields(game.id, { auto_check: value });
  }, [autoCheck, game.id]);

  const checkBoard = useCallback(() => { flashCheck(); chanRef.current?.send({ type: 'broadcast', event: 'check', payload: {} }); }, [flashCheck]);

  const setGamemode = useCallback((value) => {
    setGamemodeState(value);
    scoredCells.current = new Set(); scoredWords.current = new Set();
    setScores({});
    chanRef.current?.send({ type: 'broadcast', event: 'gamemode', payload: { value } });
    updateGameFields(game.id, { gamemode: value });
  }, [game.id]);

  const kick = useCallback((playerId) => {
    kickPlayer(game.id, playerId);
    chanRef.current?.send({ type: 'broadcast', event: 'kick', payload: { playerId } });
  }, [game.id]);

  const transferHost = useCallback((playerId) => {
    setHost(game.id, playerId);
    setHostId(playerId);
    chanRef.current?.send({ type: 'broadcast', event: 'host', payload: { hostId: playerId } });
    pushToast('Host transferred');
  }, [game.id, pushToast]);

  const rematch = useCallback((newPuzzle) => {
    updateGameFields(game.id, { puzzle: newPuzzle, state: { grid: blank(newPuzzle.grid) }, status: 'playing' });
    resetPlayers(game.id);
    chanRef.current?.send({ type: 'broadcast', event: 'rematch', payload: { puzzle: newPuzzle } });
    applyRematch(newPuzzle);
  }, [game.id, applyRematch]);

  // ---- social ----
  const sendChat = useCallback((text) => {
    const t = (text || '').trim();
    if (!t) return;
    const msg = { player_id: me.id, name: me.name, color: me.color, text: t, created_at: new Date().toISOString() };
    setChat((c) => [...c, msg]);
    chanRef.current?.send({ type: 'broadcast', event: 'chat', payload: { msg } });
    sendChatRow(game.id, { playerId: me.id, name: me.name, color: me.color, text: t });
  }, [me.id, me.name, me.color, game.id]);

  const sendReaction = useCallback((emoji) => {
    addReaction(me.name, emoji);
    chanRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { playerId: me.id, name: me.name, emoji } });
  }, [addReaction, me.id, me.name]);

  const formatTime = useCallback((s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, []);

  const remoteCells = useMemo(() => {
    const map = {};
    for (const p of players) {
      if (!p || p.playerId === me.id || p.r == null || p.c == null) continue;
      const slot = getSlotAt({ row: p.r, col: p.c }, p.dir || 'across');
      if (slot) {
        for (let i = 0; i < slot.length; i++) {
          const rr = slot.direction === 'across' ? slot.row : slot.row + i;
          const cc = slot.direction === 'across' ? slot.col + i : slot.col;
          const k = `${rr},${cc}`;
          (map[k] = map[k] || {}).tint = p.color;
        }
      }
      const ck = `${p.r},${p.c}`;
      const cur = (map[ck] = map[ck] || {});
      cur.ring = p.color;
      cur.name = p.name;
    }
    return map;
  }, [players, me.id, getSlotAt]);

  return {
    // PlayView / GameView surface
    playGrid: grid,
    playClues: clues,
    playAnswers: answers,
    playDirection: direction,
    playSelectedCell: selectedCell,
    playComplete: complete,
    playTimer: timer,
    playAutoCheck: autoCheck || checkFlash,
    revealedCells,
    setPlayAutoCheck,
    revealCell,
    revealWord,
    revealAll,
    handlePlayCellClick,
    getNumberForCell,
    getPlayCurrentSlot,
    setPlaySelectedCell: setSelectedCell,
    setPlayDirection: setDirection,
    formatTime,
    onVirtualKey,
    goToAdjacentClue,
    remoteCells,
    circles,
    shades,
    // multiplayer shell + social
    isHost,
    isSpectator,
    hostId,
    myId: me.id,
    gamemode,
    setGamemode,
    checkBoard,
    players,
    scores,
    fills,
    chat,
    reactions,
    toasts,
    kicked,
    sendChat,
    sendReaction,
    kick,
    transferHost,
    rematch,
    code: game.code,
  };
}
