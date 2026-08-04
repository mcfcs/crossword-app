import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Trophy } from './Icons';
import MobileSolveDock from './MobileSolveDock';

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
  difficultyInfo,
  onVirtualKey = () => {},
  goToAdjacentClue = () => {},
  canControl = true
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

  // Compute the active slot/clue once per render (getPlayCurrentSlot rebuilds
  // the layout + re-derives slots, so calling it per cell was O(cells × findSlots)).
  const activeSlot = getPlayCurrentSlot();
  const activeClue = activeSlot
    ? (activeSlot.direction === 'across' ? playClues.across : playClues.down).find(c => c.row === activeSlot.row && c.col === activeSlot.col)
    : null;
  const activeClueId = activeClue ? `${activeSlot.direction}-${activeClue.number}` : null;

  // Scroll the active clue into view ONLY when it changes and is off-screen —
  // never on every render (e.g. the 1s timer tick), so manual scrolling of the
  // clue list is never hijacked back to the current clue.
  useEffect(() => {
    if (!activeClueId) return;
    const el = clueRefs.current[activeClueId];
    const container = cluesContainerRef.current;
    if (!el || !container) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = Math.max(0, top - 12);
    }
  }, [activeClueId]);

  if (!playGrid) return null;

  const inActiveWord = (r, c) => {
    if (!activeSlot) return false;
    if (activeSlot.direction === 'across') return r === activeSlot.row && c >= activeSlot.col && c < activeSlot.col + activeSlot.length;
    return c === activeSlot.col && r >= activeSlot.row && r < activeSlot.row + activeSlot.length;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-rise-in pb-72 lg:pb-0">
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
              {canControl && (
                <>
                  <button onClick={() => setPlayAutoCheck(prev => !prev)} className={`btn btn-sm ${playAutoCheck ? 'btn-ink' : 'btn-ghost'}`}>
                    Auto-check {playAutoCheck ? 'On' : 'Off'}
                  </button>
                  <button onClick={revealCell} className="btn btn-sm">Reveal Cell</button>
                  <button onClick={revealWord} className="btn btn-sm">Reveal Word</button>
                  <button onClick={revealAll} className="btn btn-sm btn-accent">Reveal All</button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---- the grid ---- */}
        <div className="panel panel-pad">
          <div className="overflow-x-auto pb-2">
            <div className="xw-grid xw-grid--play" style={{ '--cols': playGrid[0]?.length || 15 }}>
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
                        ? 'bg-select ring-1 ring-inset ring-ink/30'
                        : isInWord
                          ? 'bg-word'
                          : missingClue && cell
                            ? 'bg-gold/15'
                            : '';
                    const letterColor = isRevealed
                      ? 'text-revealed'
                      : isWrong ? 'text-wrong' : isCorrect ? 'text-correct' : 'text-ink';

                    return (
                      <div
                        key={c}
                        onClick={() => handlePlayCellClick(r, c)}
                        className={`xw-cell ${cell === '#' ? '' : 'cursor-pointer'} ${fill}`}
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
      <div className="panel max-h-[560px] lg:max-h-[720px] overflow-y-auto" ref={cluesContainerRef}>
        {[
          { dir: 'across', label: 'Across', list: playClues.across },
          { dir: 'down', label: 'Down', list: playClues.down },
        ].map(({ dir, label, list }) => (
          <div key={dir}>
            <h3 className="sticky top-0 z-10 bg-paper-raised/95 backdrop-blur eyebrow text-ink flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              {dir === 'across' ? <ChevronRight size={13} /> : <ChevronDown size={13} />}{label}
              <span className="ml-auto font-mono text-[0.6rem] text-ink-faint normal-case tracking-normal">{list.length}</span>
            </h3>
            <div className="px-2 py-1.5">
              {list.map((clue) => {
                const isActive = playDirection === dir && activeSlot?.row === clue.row && activeSlot?.col === clue.col;
                return (
                  <button
                    key={`${dir}-${clue.number}`}
                    ref={(node) => { if (node) clueRefs.current[`${dir}-${clue.number}`] = node; }}
                    onClick={() => { setPlaySelectedCell({ row: clue.row, col: clue.col }); setPlayDirection(dir); }}
                    className={`w-full flex gap-3 text-left rounded-lg px-2.5 py-2 transition leading-snug
                      ${isActive ? 'bg-accent text-white' : 'text-ink-soft hover:bg-ink/[0.05]'}`}
                  >
                    <span className={`font-mono font-bold tabular-nums w-6 shrink-0 text-right text-sm ${isActive ? 'text-white' : 'text-accent'}`}>{clue.number}</span>
                    <span className="flex-1 text-[0.92rem]">{clue.clue || <span className="italic opacity-60">—</span>}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <MobileSolveDock
        clueNumber={activeClue?.number}
        clueDirection={playDirection}
        clueText={activeClue?.clue}
        onPrev={() => goToAdjacentClue(-1)}
        onNext={() => goToAdjacentClue(1)}
        onToggleDir={() => setPlayDirection(playDirection === 'across' ? 'down' : 'across')}
        onKey={(ch) => onVirtualKey(ch)}
        onBackspace={() => onVirtualKey('Backspace')}
      />
    </div>
  );
};

export default PlayView;
