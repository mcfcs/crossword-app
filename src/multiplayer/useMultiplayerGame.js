// Multiplayer state adapter. Owns the shared board and exposes the EXACT prop
// surface PlayView expects, so <PlayView {...mp}/> works unchanged. Cell edits +
// host actions sync via a Supabase Realtime channel; cursors via presence.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { findSlots, getCellNumber } from '../utils/crosswordUtils';
import { supabase } from '../lib/supabase';
import { openChannel, loadPlayers, persistState, updateGameFields, addScore } from './client';

const key = (r, c) => `${r},${c}`;

export function useMultiplayerGame(game, me) {
  const puzzle = game.puzzle;
  const answers = puzzle.grid;                 // 2D letters / '#'
  const clues = puzzle.clues;
  const layout = useMemo(() => answers.map((row) => row.map((c) => (c === '#' ? '#' : '.'))), [answers]);
  const slots = useMemo(() => findSlots(layout), [layout]);

  const [grid, setGrid] = useState(() => game.state?.grid || answers.map((r) => r.map((c) => (c === '#' ? '#' : ''))));
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection] = useState('across');
  const [autoCheck, setAutoCheckState] = useState(!!game.auto_check);
  const [checkFlash, setCheckFlash] = useState(false);
  const [gamemode, setGamemodeState] = useState(game.gamemode || 'coop');
  const [revealedCells, setRevealedCells] = useState(new Set());
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [complete, setComplete] = useState(false);
  const [timer, setTimer] = useState(0);

  const chanRef = useRef(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const scoredCells = useRef(new Set());
  const scoredWords = useRef(new Set());
  const persistTimer = useRef(null);
  const isHost = me.isHost;

  // ---- timer ----
  useEffect(() => {
    if (complete) return undefined;
    const t = setInterval(() => setTimer((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [complete]);

  // ---- completion check ----
  const checkComplete = useCallback((g) => {
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (answers[r][c] !== '#' && g[r][c] !== answers[r][c]) return;
      }
    }
    setComplete(true);
  }, [answers]);

  const schedulePersist = useCallback(() => {
    if (!supabase) return;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => persistState(game.id, { grid: gridRef.current }), 1500);
  }, [game.id]);

  // ---- channel ----
  useEffect(() => {
    const ch = openChannel(game.id, me.id);
    if (!ch) return undefined;
    chanRef.current = ch;

    ch.on('broadcast', { event: 'cell' }, ({ payload }) => {
      setGrid((g) => { const ng = g.map((row) => [...row]); ng[payload.r][payload.c] = payload.letter; checkComplete(ng); return ng; });
    });
    ch.on('broadcast', { event: 'reveal' }, ({ payload }) => {
      setGrid((g) => { const ng = g.map((row) => [...row]); payload.cells.forEach(({ r, c, letter }) => { ng[r][c] = letter; }); checkComplete(ng); return ng; });
      setRevealedCells((s) => { const n = new Set(s); payload.cells.forEach(({ r, c }) => n.add(key(r, c))); return n; });
    });
    ch.on('broadcast', { event: 'autocheck' }, ({ payload }) => setAutoCheckState(payload.value));
    ch.on('broadcast', { event: 'check' }, () => flashCheck());
    ch.on('broadcast', { event: 'gamemode' }, ({ payload }) => setGamemodeState(payload.value));
    ch.on('broadcast', { event: 'score' }, ({ payload }) => setScores((s) => ({ ...s, [payload.playerId]: payload.score })));
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      setPlayers(Object.values(state).flat());
    });

    ch.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await ch.track({ playerId: me.id, name: me.name, color: me.color, r: null, c: null, dir: 'across' });
      const ps = await loadPlayers(game.id);
      setScores(Object.fromEntries(ps.map((p) => [p.player_id, p.score])));
    });

    return () => { try { supabase.removeChannel(ch); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  const flashCheck = useCallback(() => {
    setCheckFlash(true);
    setTimeout(() => setCheckFlash(false), 4000);
  }, []);

  // ---- update own presence cursor when selection changes ----
  useEffect(() => {
    chanRef.current?.track?.({ playerId: me.id, name: me.name, color: me.color, r: selectedCell?.row ?? null, c: selectedCell?.col ?? null, dir: direction });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCell, direction]);

  // ---- slot helpers (mirror PlayView / App) ----
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

  // ---- scoring (points mode) ----
  const bump = useCallback((delta) => {
    const next = (scores[me.id] || 0) + delta;
    setScores((s) => ({ ...s, [me.id]: next }));
    chanRef.current?.send({ type: 'broadcast', event: 'score', payload: { playerId: me.id, score: next } });
    addScore(game.id, me.id, delta);
  }, [scores, me.id, game.id]);

  const scoreForLetter = useCallback((r, c, letter, g) => {
    if (gamemode !== 'points' || letter !== answers[r][c]) return;
    if (!scoredCells.current.has(key(r, c))) { scoredCells.current.add(key(r, c)); bump(1); }
    // first fully-correct word through this cell → +3 bonus
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

  // ---- input (shared by physical + on-screen keyboards) ----
  const writeCell = useCallback((r, c, letter) => {
    setGrid((g) => { const ng = g.map((row) => [...row]); ng[r][c] = letter; checkComplete(ng); if (letter) scoreForLetter(r, c, letter, ng); return ng; });
    chanRef.current?.send({ type: 'broadcast', event: 'cell', payload: { r, c, letter } });
    schedulePersist();
  }, [checkComplete, scoreForLetter, schedulePersist]);

  const onVirtualKey = useCallback((k) => {
    if (!selectedCell) return;
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
  }, [selectedCell, direction, grid, writeCell]);

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

  // ---- host-only actions ----
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

  const formatTime = useCallback((s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, []);

  // The prop surface PlayView consumes, plus multiplayer extras for the view shell.
  return {
    // PlayView props
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
    // multiplayer shell extras
    isHost,
    gamemode,
    setGamemode,
    checkBoard,
    players,
    scores,
    code: game.code,
  };
}
