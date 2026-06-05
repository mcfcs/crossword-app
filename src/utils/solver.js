// Crossword solver — Wave-Function-Collapse with AC-3 style constraint
// propagation and backtracking. Pure and synchronous (no React, no yields):
// it is meant to run inside a Web Worker so it can execute flat-out while the
// UI stays responsive.
//
// Optimizations over the original inline version:
//  - Cell possibilities are 26-bit integer masks instead of Set<char>.
//    Intersection is a single `&`, membership a single `&`, size a popcount,
//    and a checkpoint of all cell masks is one Int32Array.slice() (no per-cell
//    Set cloning in the hot path).
//  - A word -> dictionary-item Map replaces the per-placement linear scan.
//
// Returns the same shape the app consumed before:
//   { grid, placements:[{slot,word,clue}], complete, attempts, requiredPlaced, failedWord }

import { findSlots } from './crosswordUtils.js';

const A_CODE = 65;
const FULL = (1 << 26) - 1;
const bitOf = (ch) => 1 << (ch.charCodeAt(0) - A_CODE);
const popcount = (n) => {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  n = (n + (n >> 4)) & 0x0f0f0f0f;
  return (n * 0x01010101) >> 24;
};

export function solveCrossword(opts) {
  const {
    wordList,
    layout,
    presetGrid = null,
    requiredWordsList = [],
    requiredModeArg = 'anchor',
    presetClues = {},
    timeoutMs = 120000,
    onProgress = () => {},
    onBest = () => {},
    now = () => Date.now(),
    isCancelled = () => false,
  } = opts;

  const slots = findSlots(layout);
  const rows = layout.length;
  const cols = layout[0].length;
  const requiredSet = new Set(requiredWordsList.map((w) => w.toUpperCase()));
  const requiredModeLocal = requiredModeArg || 'anchor';

  if (slots.length === 0) {
    return { grid: null, placements: [], attempts: 0, complete: false, requiredPlaced: 0, failedWord: null };
  }

  // word -> first dictionary item (for clue lookup)
  const wordItemMap = new Map();
  for (const it of wordList) if (!wordItemMap.has(it.word)) wordItemMap.set(it.word, it);

  // candidate words bucketed by length
  const wordsByLength = {};
  for (const item of wordList) {
    const len = item.word.length;
    (wordsByLength[len] || (wordsByLength[len] = [])).push(item);
  }

  const cellIndex = (r, c) => r * cols + c;

  // per slot: the cells it covers (with flat index + position)
  const slotCells = new Map();
  for (const slot of slots) {
    const cells = [];
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      cells.push({ r, c, index: i, cell: cellIndex(r, c) });
    }
    slotCells.set(slot.id, cells);
  }

  // per cell: which slots cross it (and at what position)
  const cellToSlots = new Map();
  for (const slot of slots) {
    for (const cell of slotCells.get(slot.id)) {
      let arr = cellToSlots.get(cell.cell);
      if (!arr) cellToSlots.set(cell.cell, (arr = []));
      arr.push({ slot, index: cell.index });
    }
  }

  const presetCharAt = (r, c) => {
    if (presetGrid && presetGrid[r] && presetGrid[r][c] && presetGrid[r][c] !== '#') {
      return presetGrid[r][c].toUpperCase();
    }
    return null;
  };

  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const buildEmptyGrid = () => {
    const g = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        if (layout[r][c] === '#') row.push('#');
        else row.push(presetCharAt(r, c) || null);
      }
      g.push(row);
    }
    return g;
  };

  const wfcSolve = (startTime, attemptNum) => {
    const grid = buildEmptyGrid();

    // cell letter possibilities as bitmasks
    const cellMask = new Int32Array(rows * cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (layout[r][c] === '#') continue;
        const p = presetCharAt(r, c);
        cellMask[cellIndex(r, c)] = p ? bitOf(p) : FULL;
      }
    }

    // per-slot remaining candidate words
    const slotPossibilities = new Map();
    for (const slot of slots) {
      const cands = wordsByLength[slot.length] || [];
      slotPossibilities.set(slot.id, new Set(shuffleArray(cands.map((c) => c.word))));
    }

    const usedWords = new Set();
    const usedRequired = new Set();
    const placements = [];
    const placedSlotIds = new Set();
    let lastPlacedWord = null;
    let lastConflictWord = null;

    const getActiveConflictWord = () =>
      lastConflictWord || (placements.length ? placements[placements.length - 1].word : lastPlacedWord) || null;

    // OR of the letters that can sit at `position` across a slot's words
    const posLetters = (slotId, position) => {
      let m = 0;
      for (const w of slotPossibilities.get(slotId)) m |= bitOf(w[position]);
      return m;
    };

    const updateCell = (r, c) => {
      const cell = cellIndex(r, c);
      const using = cellToSlots.get(cell);
      if (!using || using.length === 0) return true;
      let mask = FULL;
      for (const { slot, index } of using) {
        if (placedSlotIds.has(slot.id)) continue;
        mask &= posLetters(slot.id, index);
      }
      const ch = grid[r][c];
      if (ch !== null && ch !== '#') mask = bitOf(ch);
      cellMask[cell] = mask;
      return mask !== 0;
    };

    const filterSlot = (slot) => {
      const cells = slotCells.get(slot.id);
      const next = new Set();
      for (const w of slotPossibilities.get(slot.id)) {
        if (usedWords.has(w)) continue;
        let ok = true;
        for (const cell of cells) {
          const ch = grid[cell.r][cell.c];
          if (ch !== null && ch !== '#') {
            if (ch !== w[cell.index]) { ok = false; break; }
          } else if ((cellMask[cell.cell] & bitOf(w[cell.index])) === 0) {
            ok = false;
            break;
          }
        }
        if (ok) next.add(w);
      }
      slotPossibilities.set(slot.id, next);
      return next.size > 0;
    };

    // AC-3 fixpoint propagation. Returns false on contradiction.
    const propagate = () => {
      let changed = true;
      let iterations = 0;
      while (changed && iterations < 500) {
        changed = false;
        iterations++;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (layout[r][c] === '#') continue;
            const cell = cellIndex(r, c);
            const old = cellMask[cell];
            if (!updateCell(r, c)) return false;
            if (cellMask[cell] !== old) changed = true;
          }
        }
        for (const slot of slots) {
          if (placedSlotIds.has(slot.id)) continue;
          const before = slotPossibilities.get(slot.id).size;
          if (!filterSlot(slot)) return false;
          if (slotPossibilities.get(slot.id).size !== before) changed = true;
        }
      }
      return true;
    };

    const getSlotEntropy = (slot) => {
      const cells = slotCells.get(slot.id);
      let total = 0;
      for (const cell of cells) total += popcount(cellMask[cell.cell]);
      return total / cells.length;
    };

    const findLowestEntropySlot = () => {
      let minEntropy = Infinity;
      let minSlot = null;
      for (const slot of slots) {
        if (placedSlotIds.has(slot.id)) continue;
        const words = slotPossibilities.get(slot.id);
        if (words.size === 0) continue;
        const entropy = getSlotEntropy(slot);
        let hasRequiredCandidate = false;
        if (requiredSet.size) {
          for (const w of words) {
            if (requiredSet.has(w) && !usedRequired.has(w)) { hasRequiredCandidate = true; break; }
          }
        }
        let adjustedEntropy = entropy + Math.random() * 0.001;
        if (requiredModeLocal === 'anchor' && hasRequiredCandidate) adjustedEntropy -= 1000;
        if (requiredModeLocal === 'opportunistic' && hasRequiredCandidate) adjustedEntropy -= 200;
        if (adjustedEntropy < minEntropy) { minEntropy = adjustedEntropy; minSlot = slot; }
      }
      return minSlot;
    };

    const placeWord = (slot, word, clueOverride = '') => {
      const cells = slotCells.get(slot.id);
      for (const cell of cells) {
        const ex = grid[cell.r][cell.c];
        if (ex && ex !== word[cell.index] && ex !== '#') return false;
      }
      for (const cell of cells) {
        grid[cell.r][cell.c] = word[cell.index];
        cellMask[cell.cell] = bitOf(word[cell.index]);
      }
      usedWords.add(word);
      if (requiredSet.has(word)) usedRequired.add(word);
      placedSlotIds.add(slot.id);
      lastPlacedWord = word;
      const presetKey = `${slot.direction}-${slot.row}-${slot.col}`;
      const item = wordItemMap.get(word) || { word, clue: '' };
      const finalClue = clueOverride || presetClues[presetKey] || item.clue || '';
      placements.push({ slot, word, clue: finalClue });
      return true;
    };

    const snapshot = () => ({
      grid: grid.map((row) => [...row]),
      placements: [...placements],
      complete: placements.length === slots.length && usedRequired.size === requiredSet.size,
      requiredPlaced: usedRequired.size,
      backtracks,
      failedWord: getActiveConflictWord(),
    });

    const saveState = () => ({
      grid: grid.map((row) => [...row]),
      cellMask: cellMask.slice(),
      slotPossibilities: new Map([...slotPossibilities.entries()].map(([k, v]) => [k, new Set(v)])),
      usedWords: new Set(usedWords),
      usedRequired: new Set(usedRequired),
      placedSlotIds: new Set(placedSlotIds),
      placements: [...placements],
    });

    const restoreState = (s) => {
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = s.grid[r][c];
      cellMask.set(s.cellMask);
      slotPossibilities.clear();
      for (const [k, v] of s.slotPossibilities) slotPossibilities.set(k, new Set(v));
      usedWords.clear();
      for (const w of s.usedWords) usedWords.add(w);
      usedRequired.clear();
      for (const w of s.usedRequired) usedRequired.add(w);
      placedSlotIds.clear();
      for (const id of s.placedSlotIds) placedSlotIds.add(id);
      placements.length = 0;
      placements.push(...s.placements);
    };

    let backtracks = 0;

    // initial propagation
    if (!propagate()) {
      return { grid, placements, complete: false, backtracks, requiredPlaced: usedRequired.size, failedWord: getActiveConflictWord() };
    }

    // anchor required words where they fit current constraints
    if (requiredModeLocal === 'anchor' && requiredSet.size > 0) {
      for (const reqWord of shuffleArray([...requiredSet])) {
        if (usedRequired.has(reqWord)) continue;
        const candidateSlots = shuffleArray(slots.filter((s) => s.length === reqWord.length && !placedSlotIds.has(s.id)));
        for (const slot of candidateSlots) {
          const cells = slotCells.get(slot.id);
          let fits = true;
          for (const cell of cells) {
            const ex = grid[cell.r][cell.c];
            if (ex && ex !== reqWord[cell.index]) { fits = false; break; }
          }
          if (fits) { placeWord(slot, reqWord); break; }
        }
      }
    }

    // pre-place fully-filled preset slots even if not in the dictionary
    for (const slot of slots) {
      if (placedSlotIds.has(slot.id)) continue;
      const cells = slotCells.get(slot.id);
      let full = true;
      let str = '';
      for (const cell of cells) {
        const ch = grid[cell.r][cell.c];
        if (!ch || ch === '#') { full = false; break; }
        str += ch;
      }
      if (full) placeWord(slot, str, presetClues[`${slot.direction}-${slot.row}-${slot.col}`] || '');
    }

    const stateStack = [];
    let lastTick = startTime;

    while (placements.length < slots.length) {
      if (isCancelled()) return snapshot();
      const t = now();
      if (t - startTime > timeoutMs) return snapshot();
      if (t - lastTick > 80) {
        lastTick = t;
        onProgress(`Attempt ${attemptNum} (${((t - startTime) / 1000).toFixed(1)}s): ${placements.length}/${slots.length} slots, ${backtracks} backtracks…`);
      }

      const slot = findLowestEntropySlot();
      if (!slot) {
        if (stateStack.length === 0) {
          lastConflictWord = lastPlacedWord;
          return { grid, placements, complete: false, backtracks, requiredPlaced: usedRequired.size, failedWord: getActiveConflictWord() };
        }
        backtracks++;
        const prev = stateStack.pop();
        lastConflictWord = prev.triedWord || lastPlacedWord;
        restoreState(prev.state);
        slotPossibilities.get(prev.slot.id).delete(prev.triedWord);
        continue;
      }

      const possibilities = [...slotPossibilities.get(slot.id)];
      if (possibilities.length === 0) {
        if (stateStack.length === 0) {
          lastConflictWord = lastPlacedWord;
          return { grid, placements, complete: false, backtracks, requiredPlaced: usedRequired.size, failedWord: getActiveConflictWord() };
        }
        backtracks++;
        const prev = stateStack.pop();
        lastConflictWord = prev.triedWord || lastPlacedWord;
        restoreState(prev.state);
        slotPossibilities.get(prev.slot.id).delete(prev.triedWord);
        continue;
      }

      const savedState = saveState();
      const requiredOption = possibilities.find((w) => requiredSet.has(w) && !usedRequired.has(w));
      const chosenWord = requiredOption || possibilities[0];
      stateStack.push({ slot, triedWord: chosenWord, state: savedState });

      if (!placeWord(slot, chosenWord)) {
        slotPossibilities.get(slot.id).delete(chosenWord);
        stateStack.pop();
        continue;
      }

      if (!propagate()) {
        backtracks++;
        lastConflictWord = chosenWord;
        restoreState(savedState);
        slotPossibilities.get(slot.id).delete(chosenWord);
        stateStack.pop();
      }
    }

    return {
      grid,
      placements,
      complete: placements.length === slots.length && usedRequired.size === requiredSet.size,
      backtracks,
      requiredPlaced: usedRequired.size,
      failedWord: getActiveConflictWord(),
    };
  };

  // ===== attempts loop =====
  const startTime = now();
  let attempts = 0;
  let bestResult = { grid: buildEmptyGrid(), placements: [], requiredPlaced: 0, failedWord: null };
  let bestScore = 0;
  let bestRequired = 0;
  let lastResult = null;

  while (!isCancelled() && now() - startTime <= timeoutMs) {
    attempts++;
    const result = wfcSolve(startTime, attempts);
    lastResult = result;

    if (result.complete) {
      onProgress(`Complete! Solved in ${((now() - startTime) / 1000).toFixed(1)}s (attempt ${attempts}, ${result.backtracks} backtracks)`);
      return { ...result, attempts, complete: true, failedWord: null };
    }

    if (result.requiredPlaced > bestRequired || (result.requiredPlaced === bestRequired && result.placements.length > bestScore)) {
      bestRequired = result.requiredPlaced;
      bestScore = result.placements.length;
      const fallbackFailed = result.placements.length
        ? result.placements[result.placements.length - 1].word
        : result.failedWord || bestResult.failedWord || null;
      bestResult = {
        grid: result.grid.map((row) => [...row]),
        placements: [...result.placements],
        requiredPlaced: result.requiredPlaced,
        failedWord: fallbackFailed,
      };
      onBest({ grid: bestResult.grid, placements: bestResult.placements, requiredPlaced: bestResult.requiredPlaced, attempts, failedWord: bestResult.failedWord || null, complete: false });
    }
  }

  return {
    grid: bestResult.grid || (lastResult && lastResult.grid) || null,
    placements: bestResult.placements.length ? bestResult.placements : (lastResult ? lastResult.placements : []),
    requiredPlaced: bestResult.requiredPlaced || (lastResult ? lastResult.requiredPlaced : 0) || 0,
    attempts,
    failedWord:
      bestResult.failedWord ||
      (lastResult && lastResult.failedWord) ||
      (lastResult && lastResult.placements.length ? lastResult.placements[lastResult.placements.length - 1].word : null) ||
      null,
    complete: false,
  };
}
