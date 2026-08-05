import React, { useState } from 'react';
import CrosswordGrid from './CrosswordGrid';
import { ChevronDown, ChevronLeft, ChevronRight, Delete, X, Trophy, List, MoreHorizontal } from './Icons';
import { renderRich } from '../utils/richText';

const ROW1 = 'QWERTYUIOP'.split('');
const ROW2 = 'ASDFGHJKL'.split('');
const ROW3 = 'ZXCVBNM'.split('');

// Immersive, NYT-Games-style solving layout: minimal top bar, full-bleed grid,
// bottom clue bar + on-screen keyboard, with a ⋯ menu (auto-check/check/reveal)
// and a slide-up clue-list drawer. Reuses the shared CrosswordGrid.
const GameView = (props) => {
  const {
    playGrid, playAnswers, playClues, playSelectedCell, playDirection, playComplete, playTimer,
    playAutoCheck, revealedCells, checkedCells, circles, shades,
    getNumberForCell, getPlayCurrentSlot, handlePlayCellClick, setPlaySelectedCell, setPlayDirection,
    onVirtualKey, goToAdjacentClue, formatTime,
    setPlayAutoCheck, revealCell, revealWord, revealAll, onCheckSquare, onCheckWord, onCheckPuzzle, onClearWord,
    paused, onTogglePause, rebusOn, onToggleRebus, onExit,
  } = props;

  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeSlot = getPlayCurrentSlot();
  const activeClue = activeSlot
    ? (activeSlot.direction === 'across' ? playClues.across : playClues.down).find(c => c.row === activeSlot.row && c.col === activeSlot.col)
    : null;

  const press = (fn) => (e) => { e.preventDefault(); fn(); };
  const toggleDir = () => setPlayDirection(playDirection === 'across' ? 'down' : 'across');
  const run = (fn) => () => { setMenuOpen(false); fn?.(); };

  const menuItem = (label, onClick, right = null) => (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-md hover:bg-ink/5 text-sm flex items-center justify-between gap-4">
      <span>{label}</span>{right && <span className="text-ink-faint text-xs">{right}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 bg-paper flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* top bar */}
      <div className="flex items-center gap-0.5 px-1.5 h-12 shrink-0 border-b border-line">
        <button onClick={onExit} className="w-10 h-10 flex items-center justify-center text-ink-soft" title="Exit game view" aria-label="Exit game view"><ChevronDown size={22} /></button>
        <div className="flex-1 text-center font-mono text-lg font-medium tabular-nums text-ink">{formatTime(playTimer)}</div>
        {onTogglePause && !playComplete && (
          <button onClick={onTogglePause} className="px-2.5 h-9 rounded-lg text-sm font-semibold text-ink-soft active:bg-ink/5">{paused ? 'Resume' : 'Pause'}</button>
        )}
        {onToggleRebus && !playComplete && (
          <button onClick={onToggleRebus} className={`px-2.5 h-9 rounded-lg text-sm font-semibold ${rebusOn ? 'bg-accent text-white' : 'text-ink-soft active:bg-ink/5'}`}>Rebus</button>
        )}
        <button onClick={() => setDrawerOpen(true)} className="w-10 h-10 flex items-center justify-center text-ink-soft" title="Clue list" aria-label="Clue list"><List size={20} /></button>
        <button onClick={() => setMenuOpen((o) => !o)} className="w-10 h-10 flex items-center justify-center text-ink-soft" title="More" aria-label="More"><MoreHorizontal size={22} /></button>
      </div>

      {/* grid */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-3 relative">
        {paused && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-paper/95 backdrop-blur">
            <div className="font-display text-3xl font-semibold text-ink">Paused</div>
            <button onClick={onTogglePause} className="btn btn-accent">Resume solving</button>
          </div>
        )}
        {playComplete && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 text-correct font-display font-semibold"><Trophy size={18} />Solved</div>
        )}
        <CrosswordGrid
          gridClassName="xw-grid xw-grid--game"
          playGrid={playGrid}
          playAnswers={playAnswers}
          playClues={playClues}
          playSelectedCell={playSelectedCell}
          activeSlot={activeSlot}
          revealedCells={revealedCells}
          playAutoCheck={playAutoCheck}
          playComplete={playComplete}
          checkedCells={checkedCells}
          circles={circles}
          shades={shades}
          getNumberForCell={getNumberForCell}
          onCellClick={handlePlayCellClick}
        />
      </div>

      {/* clue bar + keyboard */}
      <div className="shrink-0 border-t border-line bg-paper/95">
        <div className="flex items-stretch gap-2 px-2 pt-2">
          <button onPointerDown={press(() => goToAdjacentClue(-1))} className="w-11 shrink-0 flex items-center justify-center rounded-lg bg-paper-raised border border-line active:bg-word/60" aria-label="Previous clue"><ChevronLeft size={20} /></button>
          <button onPointerDown={press(toggleDir)} className="flex-1 min-w-0 text-left rounded-lg bg-paper-sunken border border-line px-3 py-1.5 active:bg-word/60">
            <div className="eyebrow text-[0.58rem] leading-none mb-0.5">{activeClue ? `${activeClue.number} ${playDirection === 'across' ? 'Across' : 'Down'}` : 'Tap a cell'}</div>
            <div className="text-sm text-ink leading-snug break-words line-clamp-2">{activeClue?.clue ? renderRich(activeClue.clue) : '—'}</div>
          </button>
          <button onPointerDown={press(() => goToAdjacentClue(1))} className="w-11 shrink-0 flex items-center justify-center rounded-lg bg-paper-raised border border-line active:bg-word/60" aria-label="Next clue"><ChevronRight size={20} /></button>
        </div>
        {/* on-screen keyboard (touch screens) */}
        <div className="px-1.5 pt-2 pb-2 space-y-1.5 select-none lg:hidden">
          <div className="flex gap-1">{ROW1.map((k) => <button key={k} onPointerDown={press(() => onVirtualKey(k))} className="kbd-key flex-1">{k}</button>)}</div>
          <div className="flex gap-1 px-3">{ROW2.map((k) => <button key={k} onPointerDown={press(() => onVirtualKey(k))} className="kbd-key flex-1">{k}</button>)}</div>
          <div className="flex gap-1">
            <button onPointerDown={press(toggleDir)} className="kbd-key kbd-key--wide" aria-label="Toggle direction">⇄</button>
            {ROW3.map((k) => <button key={k} onPointerDown={press(() => onVirtualKey(k))} className="kbd-key flex-1">{k}</button>)}
            <button onPointerDown={press(() => onVirtualKey('Backspace'))} className="kbd-key kbd-key--wide" aria-label="Delete"><Delete size={20} /></button>
          </div>
        </div>
      </div>

      {/* ⋯ menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-ink/25" />
          <div className="absolute right-2 top-12 panel p-1.5 w-56 animate-rise-in" onClick={(e) => e.stopPropagation()}>
            {setPlayAutoCheck && menuItem('Auto-check', run(() => setPlayAutoCheck((p) => !p)), playAutoCheck ? 'On' : 'Off')}
            <div className="rule-hair my-1" />
            {onCheckSquare && menuItem('Check cell', run(onCheckSquare))}
            {onCheckWord && menuItem('Check word', run(onCheckWord))}
            {onCheckPuzzle && menuItem('Check puzzle', run(onCheckPuzzle))}
            <div className="rule-hair my-1" />
            {revealCell && menuItem('Reveal cell', run(revealCell))}
            {revealWord && menuItem('Reveal word', run(revealWord))}
            {revealAll && menuItem('Reveal puzzle', run(revealAll))}
            {onClearWord && <><div className="rule-hair my-1" />{menuItem('Clear word', run(onClearWord))}</>}
          </div>
        </div>
      )}

      {/* clue-list drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-ink/30" />
          <div className="absolute inset-x-0 bottom-0 max-h-[72vh] bg-paper-raised rounded-t-2xl overflow-y-auto animate-rise-in" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-paper-raised flex items-center justify-between px-4 py-3 border-b border-line">
              <h3 className="font-display text-lg font-semibold text-ink">Clues</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-ink-faint hover:text-ink"><X size={18} /></button>
            </div>
            {['across', 'down'].map((dir) => (
              <div key={dir}>
                <h4 className="eyebrow text-ink bg-paper-sunken px-4 py-1.5 border-b border-line">{dir}</h4>
                <div className="py-1">
                  {playClues[dir].map((clue) => {
                    const isActive = playDirection === dir && activeSlot?.row === clue.row && activeSlot?.col === clue.col;
                    return (
                      <button
                        key={clue.number}
                        onClick={() => { setPlaySelectedCell({ row: clue.row, col: clue.col }); setPlayDirection(dir); setDrawerOpen(false); }}
                        className={`w-full flex gap-3 text-left px-4 py-2 transition ${isActive ? 'bg-accent text-white' : 'text-ink-soft hover:bg-ink/5'}`}
                      >
                        <span className={`font-mono font-bold tabular-nums w-6 shrink-0 text-right text-sm ${isActive ? 'text-white' : 'text-accent'}`}>{clue.number}</span>
                        <span className="flex-1 text-sm">{clue.clue ? renderRich(clue.clue) : '—'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameView;
