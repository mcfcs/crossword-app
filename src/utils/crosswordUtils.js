// Shared crossword utilities

export const parseCSV = (text) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const getDay = (raw) => {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return dayNames[d.getDay()];
  };
  const lines = text.trim().split('\n');
  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    if (parts.length >= 3) {
      const rawDate = parts[0].replace(/"/g, '').trim();
      const word = parts[1].replace(/"/g, '').trim().toUpperCase().replace(/[^A-Z]/g, '');
      const clue = parts[2].replace(/"/g, '').trim();
      const difficulty = (parts[3] || '').replace(/"/g, '').trim();
      if (word && clue) {
        parsed.push({ date: rawDate, day: getDay(rawDate), word, clue, difficulty });
      }
    }
  }
  return parsed.sort((a, b) => b.word.length - a.word.length);
};

// findSlots is pure in `layout` and is called from many hot paths (render,
// click handlers, the solver). Memoize on the layout array reference so a given
// layout's slots are computed once. Layout grids are treated as immutable
// (replaced, never mutated in place), and the returned array is only read, so
// sharing the cached instance is safe.
const slotsCache = new WeakMap();

export const findSlots = (layout) => {
  if (layout && typeof layout === 'object') {
    const cached = slotsCache.get(layout);
    if (cached) return cached;
    const computed = computeSlots(layout);
    slotsCache.set(layout, computed);
    return computed;
  }
  return computeSlots(layout);
};

// Build a "row,col" -> clue number lookup for a clue set, cached per clue-set
// object so per-cell number lookups during render are O(1) instead of scanning
// both clue arrays for every cell.
const cellNumberCache = new WeakMap();

export const getCellNumber = (clueSet, r, c) => {
  if (!clueSet) return null;
  let map = cellNumberCache.get(clueSet);
  if (!map) {
    map = new Map();
    for (const cl of clueSet.across || []) {
      const k = `${cl.row},${cl.col}`;
      if (!map.has(k)) map.set(k, cl.number);
    }
    for (const cl of clueSet.down || []) {
      const k = `${cl.row},${cl.col}`;
      if (!map.has(k)) map.set(k, cl.number);
    }
    cellNumberCache.set(clueSet, map);
  }
  const n = map.get(`${r},${c}`);
  return n === undefined ? null : n;
};

const computeSlots = (layout) => {
  const slots = [];
  const rows = layout.length;
  const cols = layout[0].length;
  for (let r = 0; r < rows; r++) {
    let start = -1;
    for (let c = 0; c <= cols; c++) {
      if (c < cols && layout[r][c] === '.') {
        if (start === -1) start = c;
      } else {
        if (start !== -1 && c - start >= 2) {
          slots.push({ row: r, col: start, length: c - start, direction: 'across', id: `across-${r}-${start}` });
        }
        start = -1;
      }
    }
  }
  for (let c = 0; c < cols; c++) {
    let start = -1;
    for (let r = 0; r <= rows; r++) {
      if (r < rows && layout[r][c] === '.') {
        if (start === -1) start = r;
      } else {
        if (start !== -1 && r - start >= 2) {
          slots.push({ row: start, col: c, length: r - start, direction: 'down', id: `down-${start}-${c}` });
        }
        start = -1;
      }
    }
  }
  return slots;
};

export const assignNumbers = (placements) => {
  const numbered = [];
  const numberMap = new Map();
  let currentNumber = 1;
  const positions = placements.map(p => ({
    row: p.slot.row,
    col: p.slot.col,
    direction: p.slot.direction,
    word: p.word,
    clue: p.clue,
    length: p.slot.length
  })).sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  for (const pos of positions) {
    const key = `${pos.row},${pos.col}`;
    if (!numberMap.has(key)) numberMap.set(key, currentNumber++);
    numbered.push({ number: numberMap.get(key), direction: pos.direction, word: pos.word, clue: pos.clue, row: pos.row, col: pos.col, length: pos.length });
  }
  return numbered;
};

export const getWordFromGrid = (grid, row, col, length, direction) => {
  let word = '';
  for (let i = 0; i < length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    if (grid[r] && grid[r][c] && grid[r][c] !== '#') word += grid[r][c] || '_';
  }
  return word;
};

export const getLayoutStats = (layoutGrid) => {
  if (!layoutGrid || layoutGrid.length === 0) {
    return { slots: 0, blackCells: 0, acrossSlots: 0, downSlots: 0 };
  }

  const normalized = layoutGrid.map(row => Array.isArray(row) ? row : row.split(''));
  const slots = findSlots(normalized);
  const lengthCounts = slots.reduce((acc, s) => {
    acc[s.length] = (acc[s.length] || 0) + 1;
    return acc;
  }, {});
  const blackCells = normalized.reduce((sum, row) => sum + row.filter(cell => cell === '#').length, 0);
  const acrossSlots = slots.filter(slot => slot.direction === 'across').length;
  const downSlots = slots.filter(slot => slot.direction === 'down').length;

  return { slots: slots.length, blackCells, acrossSlots, downSlots, lengthCounts };
};
