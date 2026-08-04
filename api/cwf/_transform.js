// Transform a crosswithfriends `game` payload into Krosalita's canonical puzzle
// shape: { meta, version, layout, grid, clues:{across,down} }.
// Import-only helper (leading "_" => ignored by Vercel routing).

const isBlack = (cell) => {
  if (cell == null) return true;
  if (typeof cell === 'object') return !!cell.black;
  return cell === '.' || cell === '#';
};

// A solution cell may be a letter, an object { value }, or a multi-char rebus.
const letterOf = (sol) => {
  if (sol == null) return '';
  const v = typeof sol === 'object' ? (sol.value ?? sol.solution ?? '') : sol;
  return String(v).toUpperCase();
};

export function toKrosalita(game) {
  const grid2d = game.grid || game.cells || [];
  const solution = game.solution || game.answers || grid2d;
  const rows = grid2d.length;
  const cols = rows ? grid2d[0].length : 0;

  let hasRebus = false;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (isBlack(grid2d[r][c])) { row.push('#'); continue; }
      const l = letterOf(solution[r]?.[c]);
      if (l.length > 1) hasRebus = true;
      row.push(l ? l[0] : '');
    }
    grid.push(row);
  }
  const black = (r, c) => r < 0 || c < 0 || r >= rows || c >= cols || grid[r][c] === '#';

  // Re-derive numbering with the standard rule (matches the app's getCellNumber).
  const across = [];
  const down = [];
  const acrossClues = game.clues?.across || [];
  const downClues = game.clues?.down || [];
  let num = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (black(r, c)) continue;
      const startsAcross = black(r, c - 1) && !black(r, c + 1);
      const startsDown = black(r - 1, c) && !black(r + 1, c);
      if (!startsAcross && !startsDown) continue;
      num += 1;
      if (startsAcross) {
        let len = 0;
        while (!black(r, c + len)) len++;
        let word = '';
        for (let i = 0; i < len; i++) word += grid[r][c + i];
        across.push({ number: num, row: r, col: c, length: len, word, clue: acrossClues[num] || '' });
      }
      if (startsDown) {
        let len = 0;
        while (!black(r + len, c)) len++;
        let word = '';
        for (let i = 0; i < len; i++) word += grid[r + i][c];
        down.push({ number: num, row: r, col: c, length: len, word, clue: downClues[num] || '' });
      }
    }
  }

  const layout = grid.map((row) => row.map((ch) => (ch === '#' ? '#' : '.')).join(''));

  return {
    version: '1.0',
    meta: {
      title: game.info?.title || game.title || 'Crosswith­friends puzzle',
      author: game.info?.author || game.author || '',
      source: 'crosswithfriends',
      hasRebus,
    },
    layout,
    grid,
    clues: { across, down },
  };
}
