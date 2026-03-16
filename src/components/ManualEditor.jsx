import React, { useEffect, useRef } from 'react';
import { PenTool, Sparkles, X, Check, ChevronRight, ChevronDown } from 'lucide-react';

const ManualEditor = ({
  manualGrid,
  manualClues,
  selectedCell,
  selectedDirection,
  handleCellClick,
  getNumberForCell,
  isInCurrentWord,
  getCurrentWord,
  getClueForCurrentSlot,
  setSelectedCell,
  setSelectedDirection,
  editingClue,
  clueInput,
  setClueInput,
  updateClue,
  setEditingClue,
  words,
  showSuggestions,
  setShowSuggestions,
  suggestions,
  setSuggestions,
  findSuggestionsForSlot,
  applySuggestion,
  highlightedWords = new Set(),
  highlightMissingRequired = false,
  showRequiredHighlights = false,
  setShowRequiredHighlights = () => {},
  setHighlightMissingRequired = () => {},
  tagalogMode = false,
  puzzleDateInfo = new Map(),
  getDateInfoForWord = () => null,
  getDateInfoForWordClue = () => null,
  failedWord = null,
  difficultyInfo = { score: null, label: '' }
}) => {
  if (!manualGrid) return null;

  const getDifficultyClass = (difficulty) => {
    const d = (difficulty || '').toUpperCase();
    if (d === 'EASY') return 'text-sky-300';
    if (d === 'FAIR') return 'text-emerald-300';
    if (d === 'MODERATE') return 'text-amber-300';
    if (d === 'HARD') return 'text-orange-300';
    if (d === 'DIFFICULT') return 'text-rose-300';
    return 'text-purple-200';
  };

  const currentWord = getCurrentWord();
  const cluesContainerRef = useRef(null);
  const clueRefs = useRef({});

  useEffect(() => {
    if (!currentWord?.slot) return;
    const direction = currentWord.slot.direction;
    const clueList = direction === 'across' ? manualClues.across : manualClues.down;
    const clue = clueList.find(c => c.row === currentWord.slot.row && c.col === currentWord.slot.col);
    if (!clue) return;
    const id = `${direction}-${clue.number}`;
    const el = clueRefs.current[id];
    const container = cluesContainerRef.current;
    if (el && container) {
      const targetTop = el.offsetTop - 8;
      container.scrollTop = Math.max(0, targetTop);
    }
  }, [currentWord, manualClues]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-amber-300 flex items-center gap-2"><PenTool size={20} />Create Your Puzzle</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {difficultyInfo?.label && (
                <span className="px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 font-semibold text-base text-purple-100">
                  Difficulty: <span className={`${getDifficultyClass(difficultyInfo.label)} font-bold`}>{difficultyInfo.label}</span>{difficultyInfo.score !== null ? ` (${Math.round(difficultyInfo.score)})` : ''}
                </span>
              )}
              {highlightedWords.size > 0 && (
                <button
                  onClick={() => setShowRequiredHighlights(prev => {
                    const next = !prev;
                    if (next) setHighlightMissingRequired(false);
                    return next;
                  })}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition ${showRequiredHighlights ? 'bg-emerald-600/80 border-emerald-400 text-white hover:bg-emerald-500/90' : 'bg-white/10 border-purple-500/40 text-purple-200 hover:bg-white/20'}`}
                >
                  {showRequiredHighlights ? 'Hide required highlights' : 'Show required highlights'}
                </button>
              )}
            </div>
          </div>
          <p className="text-purple-300/60 text-sm mb-4">Click a cell to select it. Click again to toggle Across/Down. Type letters to fill in.</p>
          <div className="overflow-x-auto"><div className="inline-block">
            {manualGrid.map((row, r) => <div key={r} className="flex">{row.map((cell, c) => {
              const isSelected = selectedCell?.row === r && selectedCell?.col === c;
              const isInWord = isInCurrentWord(r, c);
              const clueNumber = getNumberForCell(r, c, manualClues);
              const across = manualClues.across.find(cl => cl.row === r && c >= cl.col && c < cl.col + cl.length);
              const down = manualClues.down.find(cl => cl.col === c && r >= cl.row && r < cl.row + cl.length);
              const isSlotFilled = (slot) => {
                if (!slot) return false;
                for (let i = 0; i < slot.length; i++) {
                  const rr = slot.direction === 'across' ? slot.row : slot.row + i;
                  const cc = slot.direction === 'across' ? slot.col + i : slot.col;
                  const ch = manualGrid[rr]?.[cc];
                  if (!ch || ch === '#') return false;
                }
                return true;
              };
              const acrossWord = across ? Array.from({ length: across.length }, (_, i) => manualGrid[across.row][across.col + i] || '').join('').toUpperCase() : '';
              const downWord = down ? Array.from({ length: down.length }, (_, i) => manualGrid[down.row + i][down.col] || '').join('').toUpperCase() : '';
              const missingClueAcross = across && isSlotFilled(across) && !across.clue;
              const missingClueDown = down && isSlotFilled(down) && !down.clue;
              const missingClue = (missingClueAcross || missingClueDown) && cell;
              const inHighlightedWord = showRequiredHighlights && highlightedWords && highlightedWords.size > 0 && cell
                ? highlightedWords.has(acrossWord) || highlightedWords.has(downWord)
                : false;
              const inFailedWord = failedWord && cell
                ? ((across && isSlotFilled(across) && failedWord.toUpperCase() === acrossWord) ||
                   (down && isSlotFilled(down) && failedWord.toUpperCase() === downWord))
                : false;
              const shouldShowRequiredMissing = inHighlightedWord && missingClue && highlightMissingRequired && !showRequiredHighlights;
              const cellClass = cell === '#'
                ? 'bg-slate-800 border-slate-700 cursor-default'
                : inFailedWord
                  ? 'bg-blue-200/80 border-blue-500'
                  : isSelected
                    ? 'bg-amber-400 border-amber-500 ring-2 ring-amber-300'
                    : isInWord
                      ? 'bg-amber-200/80 border-amber-300'
                      : shouldShowRequiredMissing && cell
                        ? 'bg-rose-200/70 border-rose-400'
                        : inHighlightedWord
                          ? 'bg-emerald-200/70 border-emerald-400'
                          : missingClue && cell
                            ? 'bg-rose-200/70 border-rose-400'
                            : 'bg-white/95 border-purple-500/30 hover:bg-purple-100';
              return <div key={c} onClick={() => handleCellClick(r, c)} className={`w-9 h-9 md:w-10 md:h-10 border flex items-center justify-center text-sm font-bold relative transition-all cursor-pointer ${cellClass}`}>{cell !== '#' && clueNumber && <span className="absolute top-0.5 left-1 text-[10px] text-slate-500 font-medium">{clueNumber}</span>}{cell !== '#' && cell && <span className="text-slate-800">{cell}</span>}</div>;
            })}</div>)}
          </div></div>
        </div>
        
        {selectedCell && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-purple-300/60 text-sm uppercase tracking-wider">Current Selection</span>
                <div className="text-2xl font-bold text-amber-300 tracking-widest mt-1">{currentWord.word || '-----'}</div>
                <div className="text-purple-300/80 text-sm mt-1">Direction: <span className="text-amber-300 capitalize font-semibold">{selectedDirection}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setClueInput(getClueForCurrentSlot()?.clue || ''); setEditingClue(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition font-medium"><PenTool size={16} />Edit Clue</button>
                {words.length > 0 && <button onClick={() => { setShowSuggestions(!showSuggestions); setSuggestions(findSuggestionsForSlot()); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-xl hover:from-amber-400 hover:to-yellow-400 transition font-medium"><Sparkles size={16} />Auto-fill</button>}
              </div>
            </div>
            
            {getClueForCurrentSlot() && (
          <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20 space-y-1.5">
            <div className="text-purple-300/60 text-xs uppercase tracking-wider">Current Clue</div>
            <div className="text-purple-100">{getClueForCurrentSlot()?.clue || <span className="text-purple-300/40 italic">No clue set</span>}</div>
            {!tagalogMode && getClueForCurrentSlot()?.clue && (() => {
              const slot = getCurrentWord()?.slot;
              let filledWord = '';
              if (slot) {
                for (let i = 0; i < slot.length; i++) {
                  const rr = slot.direction === 'across' ? slot.row : slot.row + i;
                  const cc = slot.direction === 'across' ? slot.col + i : slot.col;
                  filledWord += manualGrid[rr]?.[cc] || '';
                }
              }
              if (!filledWord || filledWord.includes('_')) return null;
              const dateInfo = getDateInfoForWordClue(filledWord.toUpperCase(), getClueForCurrentSlot()?.clue) || getDateInfoForWord(filledWord.toUpperCase());
              return dateInfo ? (
                <div className="flex flex-col gap-0.5 text-xs text-purple-200/80">
                  <div>Date Appeared: <span className="text-amber-200 font-semibold">{dateInfo.formatted}</span></div>
                  {dateInfo.difficulty && (
                    <div>Difficulty: <span className={`font-semibold ${getDifficultyClass(dateInfo.difficulty)}`}>{dateInfo.difficulty}</span></div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        )}
            
            {editingClue && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-amber-300 mb-4">Edit Clue</h3>
                  <div className="text-purple-300/60 text-sm mb-2">For: <span className="text-amber-300 font-mono">{currentWord.word}</span></div>
                  <textarea value={clueInput} onChange={(e) => setClueInput(e.target.value)} placeholder="Enter your clue..." className="w-full bg-white/10 border border-purple-500/30 rounded-xl p-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-amber-500/50 resize-none" rows={3} autoFocus />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => updateClue(clueInput)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition font-medium"><Check size={18} />Save</button>
                    <button onClick={() => { setEditingClue(null); setClueInput(''); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 text-purple-300 rounded-xl hover:bg-white/20 transition font-medium"><X size={18} />Cancel</button>
                  </div>
                </div>
              </div>
            )}
            
            {showSuggestions && (
              <div className="mt-4 bg-white/5 rounded-xl border border-purple-500/20 overflow-hidden">
                <div className="bg-purple-500/20 px-4 py-2 flex items-center justify-between"><span className="text-purple-200 font-semibold text-sm">Suggestions from CSV</span><button onClick={() => setShowSuggestions(false)} className="text-purple-300 hover:text-white"><X size={16} /></button></div>
                <div className="max-h-48 overflow-y-auto">
                  {suggestions.length === 0 ? <div className="p-4 text-purple-300/60 text-center">No matching words found</div> : suggestions.map((s, i) => (
                    <button key={i} onClick={() => applySuggestion(s)} className="w-full px-4 py-3 text-left hover:bg-white/10 transition border-b border-purple-500/10 last:border-0">
                      <div className="font-mono text-amber-300 font-bold">{s.word}</div>
                      <div className="text-purple-300/70 text-sm truncate">{s.clue}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6 max-h-[700px] overflow-y-auto" ref={cluesContainerRef}>
        <h2 className="text-xl font-bold text-amber-300 mb-4">Clues</h2>
        <div className="mb-6">
          <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2"><ChevronRight size={16} />Across</h3>
          {manualClues.across.map(clue => {
            let word = '';
            for (let i = 0; i < clue.length; i++) word += manualGrid[clue.row][clue.col + i] || '_';
            const normalized = !word.includes('_') ? word.toUpperCase() : null;
            const dateInfo = !tagalogMode && clue.clue && normalized ? getDateInfoForWordClue(normalized, clue.clue) : null;
            const clueId = `across-${clue.number}`;
            return <div key={`across-${clue.number}`} ref={node => { if (node) clueRefs.current[clueId] = node; }} className={`mb-3 text-sm pl-4 border-l-2 transition-colors cursor-pointer hover:bg-white/5 rounded-r-lg py-1 ${selectedCell && selectedDirection === 'across' && clue.row === currentWord.slot?.row && clue.col === currentWord.slot?.col ? 'border-amber-400 bg-amber-500/10' : 'border-purple-500/30'}`} onClick={() => { setSelectedCell({ row: clue.row, col: clue.col }); setSelectedDirection('across'); }}>
              <div className="flex items-center gap-2"><span className="font-semibold text-amber-300">{clue.number}.</span><span className="font-mono text-purple-300/60 text-xs">{word}</span></div>
              <div className="text-purple-100/80 mt-0.5">{clue.clue || <span className="text-purple-300/40 italic">Click to add clue</span>}</div>
              {dateInfo && (
                <div className="text-[11px] text-purple-200/70 mt-0.5 space-y-0.5">
                  <div>Date: <span className="text-amber-200">{dateInfo.formatted}</span></div>
                  {dateInfo.difficulty && <div>Difficulty: <span className={getDifficultyClass(dateInfo.difficulty)}>{dateInfo.difficulty}</span></div>}
                </div>
              )}
            </div>;
          })}
        </div>
        <div>
          <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2"><ChevronDown size={16} />Down</h3>
          {manualClues.down.map(clue => {
            let word = '';
            for (let i = 0; i < clue.length; i++) word += manualGrid[clue.row + i][clue.col] || '_';
            const normalized = !word.includes('_') ? word.toUpperCase() : null;
            const dateInfo = !tagalogMode && clue.clue && normalized ? getDateInfoForWordClue(normalized, clue.clue) : null;
            const clueId = `down-${clue.number}`;
            return <div key={`down-${clue.number}`} ref={node => { if (node) clueRefs.current[clueId] = node; }} className={`mb-3 text-sm pl-4 border-l-2 transition-colors cursor-pointer hover:bg-white/5 rounded-r-lg py-1 ${selectedCell && selectedDirection === 'down' && clue.row === currentWord.slot?.row && clue.col === currentWord.slot?.col ? 'border-amber-400 bg-amber-500/10' : 'border-purple-500/30'}`} onClick={() => { setSelectedCell({ row: clue.row, col: clue.col }); setSelectedDirection('down'); }}>
              <div className="flex items-center gap-2"><span className="font-semibold text-amber-300">{clue.number}.</span><span className="font-mono text-purple-300/60 text-xs">{word}</span></div>
              <div className="text-purple-100/80 mt-0.5">{clue.clue || <span className="text-purple-300/40 italic">Click to add clue</span>}</div>
              {dateInfo && (
                <div className="text-[11px] text-purple-200/70 mt-0.5 space-y-0.5">
                  <div>Date: <span className="text-amber-200">{dateInfo.formatted}</span></div>
                  {dateInfo.difficulty && <div>Difficulty: <span className={getDifficultyClass(dateInfo.difficulty)}>{dateInfo.difficulty}</span></div>}
                </div>
              )}
            </div>;
          })}
        </div>
      </div>
    </div>
  );
};

export default ManualEditor;
