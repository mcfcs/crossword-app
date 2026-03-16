import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Trophy } from 'lucide-react';

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
  isInPlayCurrentWord,
  getNumberForCell,
  getPlayCurrentSlot,
  setPlaySelectedCell,
  setPlayDirection,
  formatTime,
  difficultyInfo
}) => {
  if (!playGrid) return null;

  const cluesContainerRef = useRef(null);
  const clueRefs = useRef({});

  const difficultyColorClass = (label = '') => {
    const d = label.toUpperCase();
    if (d === 'EASY') return 'text-sky-200';
    if (d === 'FAIR') return 'text-emerald-200';
    if (d === 'MODERATE') return 'text-amber-200';
    if (d === 'HARD') return 'text-orange-200';
    if (d === 'DIFFICULT') return 'text-rose-200';
    return 'text-purple-200';
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono font-bold text-amber-300">
                {formatTime(playTimer)}
              </div>
              {playComplete && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Trophy size={24} />
                  <span className="font-bold">Complete!</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              {difficultyInfo?.label && (
                <span className="px-4 py-2 rounded-full text-base font-semibold bg-white/5 border border-purple-500/30 text-purple-100">
                  Difficulty: <span className={`${difficultyColorClass(difficultyInfo.label)} font-bold`}>{difficultyInfo.label}</span>{difficultyInfo.score !== null ? ` (${Math.round(difficultyInfo.score)})` : ''}
                </span>
              )}
              <button
                onClick={() => setPlayAutoCheck(prev => !prev)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  playAutoCheck
                    ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                    : 'bg-white/10 text-purple-200 border-purple-500/30 hover:bg-white/20'
                }`}
              >
                Auto Check {playAutoCheck ? 'On' : 'Off'}
              </button>
              <button onClick={revealCell} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition text-sm font-medium">
                Reveal Cell
              </button>
              <button onClick={revealWord} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition text-sm font-medium">
                Reveal Word
              </button>
              <button onClick={revealAll} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition text-sm font-medium">
                Reveal All
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6">
          <div className="overflow-x-auto">
            <div className="inline-block">
              {playGrid.map((row, r) => (
                <div key={r} className="flex">
                  {row.map((cell, c) => {
                    const isSelected = playSelectedCell?.row === r && playSelectedCell?.col === c;
                    const isInWord = isInPlayCurrentWord(r, c);
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
                    
                    return (
                      <div
                        key={c}
                        onClick={() => handlePlayCellClick(r, c)}
                        className={`w-10 h-10 md:w-12 md:h-12 border flex items-center justify-center text-lg font-bold relative transition-all cursor-pointer
                          ${cell === '#' ? 'bg-slate-800 border-slate-700 cursor-default' : 
                            isSelected ? 'bg-amber-400 border-amber-500 ring-2 ring-amber-300' : 
                            isInWord ? 'bg-amber-200/80 border-amber-300' : 
                            missingClue && cell ? 'bg-rose-200/70 border-rose-400' :
                            'bg-white/95 border-purple-500/30 hover:bg-purple-100'}`}
                      >
                        {cell !== '#' && clueNumber && (
                          <span className="absolute top-0.5 left-1 text-[10px] text-slate-500 font-medium">
                            {clueNumber}
                          </span>
                        )}
                        {cell !== '#' && cell && (
                          <span className={`${isRevealed ? 'text-purple-600' : isWrong ? 'text-rose-600' : isCorrect ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {cell}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="text-purple-300/60 text-sm mt-4">Click a cell to select it. Type to fill in letters. Arrow keys to navigate.</p>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6 max-h-[700px] overflow-y-auto" ref={cluesContainerRef}>
        <h2 className="text-xl font-bold text-amber-300 mb-4">Clues</h2>
        <div className="mb-6">
          <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
            <ChevronRight size={16} />Across
          </h3>
          {playClues.across.map(clue => {
            const isActive = playDirection === 'across' && getPlayCurrentSlot()?.row === clue.row && getPlayCurrentSlot()?.col === clue.col;
            return (
              <div
                key={`across-${clue.number}`}
                ref={node => { if (node) clueRefs.current[`across-${clue.number}`] = node; }}
                onClick={() => {
                  setPlaySelectedCell({ row: clue.row, col: clue.col });
                  setPlayDirection('across');
                }}
                className={`mb-2 text-sm pl-4 border-l-2 py-1 cursor-pointer transition rounded-r
                  ${isActive ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-purple-500/30 text-purple-100/80 hover:bg-white/5'}`}
              >
                <span className="font-semibold text-amber-300">{clue.number}.</span> {clue.clue}
              </div>
            );
          })}
        </div>
        <div>
          <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
            <ChevronDown size={16} />Down
          </h3>
          {playClues.down.map(clue => {
            const isActive = playDirection === 'down' && getPlayCurrentSlot()?.row === clue.row && getPlayCurrentSlot()?.col === clue.col;
            return (
              <div
                key={`down-${clue.number}`}
                ref={node => { if (node) clueRefs.current[`down-${clue.number}`] = node; }}
                onClick={() => {
                  setPlaySelectedCell({ row: clue.row, col: clue.col });
                  setPlayDirection('down');
                }}
                className={`mb-2 text-sm pl-4 border-l-2 py-1 cursor-pointer transition rounded-r
                  ${isActive ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-purple-500/30 text-purple-100/80 hover:bg-white/5'}`}
              >
                <span className="font-semibold text-amber-300">{clue.number}.</span> {clue.clue}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayView;
