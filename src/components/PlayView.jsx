import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Trophy } from './Icons';

const PlayView = ({
  playGrid,
  playClues,
  playDirection,
  playSelectedCell,
  playAnswers,
  playComplete,
  playTimer,
  playAutoCheck,
  revealedCells,
  setPlayAutoCheck,
  revealCell,
  revealWord,
  revealAll,
  handlePlayCellClick,
  getNumberForCell,
  getPlayCurrentSlot,
  setPlaySelectedCell,
  setPlayDirection,
  formatTime,
  difficultyInfo
}) => {
  const cluesContainerRef = useRef(null);
  const clueRefs = useRef({});

  const difficultyColorClass = (label = '') => {
    const d = label.toUpperCase();
    if (d === 'EASY') return 'text-inkblue';
    if (d === 'FAIR') return 'text-grass';
    if (d === 'MODERATE') return 'text-gold';
    if (d === 'HARD') return 'text-accent';
    if (d === 'DIFFICULT') return 'text-accent-deep';
    return 'text-ink-soft';
  };

  useEffect(() => {
    const slot = getPlayCurrentSlot();
    if (!slot) return;
    const direction = slot.direction;
    const clueList = direction === 'across' ? playClues.across : playClues.down;
    const clue = clueList.find(c => c.row === slot.row && c.col === slot.col);
    if (!clue) return;
    const id = `${direction}-${clue.number}`;
    const el = clueRefs.current[id];
    const container = cluesContainerRef.current;
    if (el && container) {
      const targetTop = el.offsetTop - 8;
      container.scrollTop = Math.max(0, targetTop);
    }
  }, [playSelectedCell, playDirection, playClues, getPlayCurrentSlot]);

  if (!playGrid) return null;

  // Compute the active slot once per render (getPlayCurrentSlot rebuilds the
  // layout + re-derives slots, so calling it per cell was O(cells × findSlots)).
  const activeSlot = getPlayCurrentSlot();
  const inActiveWord = (r, c) => {
    if (!activeSlot) return false;
    if (activeSlot.direction === 'across') return r === activeSlot.row && c >= activeSlot.col && c < activeSlot.col + activeSlot.length;
    return c === activeSlot.col && r >= activeSlot.row && r < activeSlot.row + activeSlot.length;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-rise-in">
      <div className="xl:col-span-2 space-y-5">
        {/* ---- solve toolbar ---- */}
        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex items-baseline gap-2">
                <span className="eyebrow">Time</span>
                <span className="font-mono text-2xl font-medium text-ink tabular-nums">{formatTime(playTimer)}</span>
              </div>
              {playComplete && (
                <span className="inline-flex items-center gap-1.5 text-grass font-display font-semibold text-lg">
                  <Trophy size={20} />Complete
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {difficultyInfo?.label && (
                <span className="inline-flex items-center gap-2 border border-ink/20 bg-paper-sunken px-3 py-1.5 rounded-sm">
                  <span className="eyebrow">Difficulty</span>
                  <span className={`font-display font-semibold ${difficultyColorClass(difficultyInfo.label)}`}>{difficultyInfo.label}</span>
                  {difficultyInfo.score !== null && <span className="font-mono text-xs text-ink-faint">({Math.round(difficultyInfo.score)})</span>}
                </span>
              )}
              <button onClick={() => setPlayAutoCheck(prev => !prev)} className={`btn btn-sm ${playAutoCheck ? 'btn-ink' : 'btn-ghost'}`}>
                Auto-check {playAutoCheck ? 'On' : 'Off'}
              </button>
              <button onClick={revealCell} className="btn btn-sm">Reveal Cell</button>
              <button onClick={revealWord} className="btn btn-sm">Reveal Word</button>
              <button onClick={revealAll} className="btn btn-sm btn-accent">Reveal All</button>
            </div>
          </div>
        </div>

        {/* ---- the grid ---- */}
        <div className="panel panel-pad">
          <div className="overflow-x-auto pb-2">
            <div className="xw-grid">
              {playGrid.map((row, r) => (
                <div key={r} className="flex">
                  {row.map((cell, c) => {
                    const isSelected = playSelectedCell?.row === r && playSelectedCell?.col === c;
                    const isInWord = inActiveWord(r, c);
                    const isRevealed = revealedCells.has(`${r},${c}`);
                    const showCorrectness = (playAutoCheck || playComplete) && !!playAnswers;
                    const isCorrect = showCorrectness && cell === playAnswers[r][c] && cell !== '';
                    const isWrong = showCorrectness && cell !== '' && cell !== playAnswers[r][c];
                    const clueNumber = getNumberForCell(r, c, playClues);
                    const clueObj = clueNumber ? (playClues.across.find(cl => cl.number === clueNumber) || playClues.down.find(cl => cl.number === clueNumber)) : null;
                    const isSlotFilled = (slot) => {
                      if (!slot) return false;
                      for (let i = 0; i < slot.length; i++) {
                        const rr = slot.direction === 'across' ? slot.row : slot.row + i;
                        const cc = slot.direction === 'across' ? slot.col + i : slot.col;
                        const ch = playGrid[rr]?.[cc];
                        if (!ch || ch === '#') return false;
                      }
                      return true;
                    };
                    const missingClue = clueObj && isSlotFilled(clueObj) && !clueObj.clue;

                    const fill = cell === '#'
                      ? 'xw-cell--block'
                      : isSelected
                        ? 'bg-highlight ring-2 ring-inset ring-accent'
                        : isInWord
                          ? 'bg-highlight/40'
                          : missingClue && cell
                            ? 'bg-gold/20'
                            : '';
                    const letterColor = isSelected
                      ? 'text-ink'
                      : isRevealed ? 'text-inkblue' : isWrong ? 'text-accent' : isCorrect ? 'text-grass' : 'text-ink';

                    return (
                      <div
                        key={c}
                        onClick={() => handlePlayCellClick(r, c)}
                        className={`xw-cell w-10 h-10 md:w-12 md:h-12 text-lg ${cell === '#' ? '' : 'cursor-pointer'} ${fill}`}
                      >
                        {cell !== '#' && clueNumber && (
                          <span className="xw-num">{clueNumber}</span>
                        )}
                        {cell !== '#' && cell && (
                          <span className={`xw-letter ${letterColor}`}>{cell}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="text-ink-faint text-xs mt-4">Click a cell to select · click again to flip Across/Down · type to fill · arrow keys to move.</p>
        </div>
      </div>

      {/* ---- clue list ---- */}
      <div className="panel panel-pad max-h-[720px] overflow-y-auto" ref={cluesContainerRef}>
        <div className="eyebrow">Solve</div>
        <h2 className="font-display text-2xl font-semibold text-ink mb-4">Clues</h2>
        <div className="mb-6">
          <h3 className="eyebrow text-ink flex items-center gap-1.5 border-b border-ink/15 pb-1.5 mb-3">
            <ChevronRight size={13} />Across
          </h3>
          {playClues.across.map(clue => {
            const isActive = playDirection === 'across' && activeSlot?.row === clue.row && activeSlot?.col === clue.col;
            return (
              <div
                key={`across-${clue.number}`}
                ref={node => { if (node) clueRefs.current[`across-${clue.number}`] = node; }}
                onClick={() => { setPlaySelectedCell({ row: clue.row, col: clue.col }); setPlayDirection('across'); }}
                className={`mb-1.5 text-sm pl-3 border-l-2 py-1 cursor-pointer transition leading-snug
                  ${isActive ? 'border-accent bg-accent/8 text-ink' : 'border-ink/15 text-ink-soft hover:bg-ink/[0.04]'}`}
              >
                <span className="font-mono font-semibold text-accent mr-1.5">{clue.number}</span>{clue.clue}
              </div>
            );
          })}
        </div>
        <div>
          <h3 className="eyebrow text-ink flex items-center gap-1.5 border-b border-ink/15 pb-1.5 mb-3">
            <ChevronDown size={13} />Down
          </h3>
          {playClues.down.map(clue => {
            const isActive = playDirection === 'down' && activeSlot?.row === clue.row && activeSlot?.col === clue.col;
            return (
              <div
                key={`down-${clue.number}`}
                ref={node => { if (node) clueRefs.current[`down-${clue.number}`] = node; }}
                onClick={() => { setPlaySelectedCell({ row: clue.row, col: clue.col }); setPlayDirection('down'); }}
                className={`mb-1.5 text-sm pl-3 border-l-2 py-1 cursor-pointer transition leading-snug
                  ${isActive ? 'border-accent bg-accent/8 text-ink' : 'border-ink/15 text-ink-soft hover:bg-ink/[0.04]'}`}
              >
                <span className="font-mono font-semibold text-accent mr-1.5">{clue.number}</span>{clue.clue}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayView;
