import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Upload, Download, RefreshCw, Bug, Puzzle, PenTool, X, Check, ChevronRight, ChevronDown, Save, FolderOpen, Grid3X3, Play, BookOpen, Languages } from './components/Icons';
import DictionaryModal from './components/DictionaryModal';
import LayoutEditorModal from './components/LayoutEditorModal';
import LayoutSelector from './components/LayoutSelector';
import ManualEditor from './components/ManualEditor';
import PlayView from './components/PlayView';
import RequiredWordsModal from './components/RequiredWordsModal';
import { DEFAULT_LAYOUTS } from './data/layouts';
import { parseCSV, findSlots, assignNumbers, getWordFromGrid, getLayoutStats } from './utils/crosswordUtils';

const CrosswordGenerator = () => {
  const [activeTab, setActiveTab] = useState('auto');
  const [words, setWords] = useState([]);
  const [grid, setGrid] = useState(null);
  const [clues, setClues] = useState({ across: [], down: [] });
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [tagalogMode, setTagalogMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState(0);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [layoutEditorMode, setLayoutEditorMode] = useState('create');
  const [editingLayoutIndex, setEditingLayoutIndex] = useState(null);
  const cancelRef = useRef(false);
  const previousWordsRef = useRef(null);

  const [manualGrid, setManualGrid] = useState(null);
  const [manualClues, setManualClues] = useState({ across: [], down: [] });
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState('across');
  const [editingClue, setEditingClue] = useState(null);
  const [clueInput, setClueInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);
  const [requiredWords, setRequiredWords] = useState([]);
  const [requiredMode, setRequiredMode] = useState('anchor'); // 'anchor' | 'opportunistic'
  const [showRequiredModal, setShowRequiredModal] = useState(false);
  const [requiredAction, setRequiredAction] = useState('auto'); // 'auto' | 'play'
  const [manualRequiredInput, setManualRequiredInput] = useState('');
  const [manualRequiredMode, setManualRequiredMode] = useState('opportunistic');
  const [requiredViewMode, setRequiredViewMode] = useState('simple'); // 'simple' | 'byLength'
  const [puzzleDateInfo, setPuzzleDateInfo] = useState(new Map());
  const [failedWord, setFailedWord] = useState(null);
  const [latestGrid, setLatestGrid] = useState(null);
  const [latestClues, setLatestClues] = useState(null);
  const [requiredHighlights, setRequiredHighlights] = useState(new Set());
  const [showRequiredHighlights, setShowRequiredHighlights] = useState(false);
  const [highlightMissingRequired, setHighlightMissingRequired] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [difficultyInfo, setDifficultyInfo] = useState({ score: null, label: '' });
  const [difficultyChoice, setDifficultyChoice] = useState('random'); // random | easy | fair | moderate | hard | difficult | nyt-monday
  
  // Play mode state
  const [playGrid, setPlayGrid] = useState(null);
  const [playClues, setPlayClues] = useState({ across: [], down: [] });
  const [playSelectedCell, setPlaySelectedCell] = useState(null);
  const [playDirection, setPlayDirection] = useState('across');
  const [playAnswers, setPlayAnswers] = useState(null); // The correct answers
  const [playComplete, setPlayComplete] = useState(false);
  const [playTimer, setPlayTimer] = useState(0);
  const [playTimerActive, setPlayTimerActive] = useState(false);
  const [playAutoCheck, setPlayAutoCheck] = useState(true);
  const [revealedCells, setRevealedCells] = useState(new Set());
  
  // Dictionary state
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictionarySearch, setDictionarySearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newClue, setNewClue] = useState('');
  const [editingWordIndex, setEditingWordIndex] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editClue, setEditClue] = useState('');
  
  const autoGridRef = useRef(null);
  const manualGridRef = useRef(null);
  const puzzleFileInputRef = useRef(null);
  const playTimerRef = useRef(null);

  // =========== LOGGING ============
  // Helper to log debug messages
  // Only logs if debugMode is enabled
  const log = (message) => {
    if (debugMode) {
      setDebugLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    }
  };

  // ========= DATE INFO (for Create tab) =========
  const rebuildPuzzleDateInfo = useCallback((list) => {
    const map = new Map();
    list.forEach(item => {
      if (!item?.word) return;
      const key = item.word.toUpperCase();
      const date = item.date || '';
      const day = item.day || '';
      const difficulty = item.difficulty || '';
      const formatted = date ? (day ? `${date} (${day})` : date) : '';
      const entry = { clue: item.clue || '', date, day, formatted, difficulty };
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    });
    setPuzzleDateInfo(map);
  }, []);

  useEffect(() => {
    rebuildPuzzleDateInfo(words);
  }, [words, rebuildPuzzleDateInfo]);

  const getDateInfoForWord = useCallback((word) => {
    if (!word) return null;
    const list = puzzleDateInfo.get(word.toUpperCase());
    return list && list.length > 0 ? list[0] : null;
  }, [puzzleDateInfo]);

  const getDateInfoForWordClue = useCallback((word, clue) => {
    if (!word) return null;
    const list = puzzleDateInfo.get(word.toUpperCase());
    if (!list || list.length === 0) return null;
    if (clue) {
      const match = list.find(entry => entry.clue === clue);
      if (match) return match;
    }
    return list[0];
  }, [puzzleDateInfo]);

  const hasWordInGrid = useCallback((gridData, layoutIdx, word) => {
    if (!gridData || !word) return false;
    const layout = layouts[layoutIdx]?.grid;
    if (!layout) return false;
    const slots = findSlots(layout);
    const target = word.toUpperCase();
    for (const slot of slots) {
      const w = getWordFromGrid(gridData, slot.row, slot.col, slot.length, slot.direction);
      if (w && w.length === slot.length && w.toUpperCase() === target) {
        return true;
      }
    }
    return false;
  }, [layouts]);

  const computePlacedRequired = useCallback((gridData, layoutIdx, requiredList = []) => {
    const placed = [];
    requiredList.forEach(w => {
      if (hasWordInGrid(gridData, layoutIdx, w)) placed.push(w.toUpperCase());
    });
    return placed;
  }, [hasWordInGrid]);

  const difficultyValueFromText = (difficulty = '') => {
    const d = difficulty.toUpperCase();
    if (d === 'EASY') return 0.0;
    if (d === 'FAIR') return 0.3;
    if (d === 'MODERATE') return 0.5;
    if (d === 'HARD') return 0.7;
    if (d === 'DIFFICULT') return 1.0;
    return 0.5;
  };

  const difficultyLabelFromScore = (score) => {
    const pct = score * 100;
    if (pct < 20) return 'Easy';
    if (pct < 40) return 'Fair';
    if (pct < 60) return 'Moderate';
    if (pct < 80) return 'Hard';
    return 'Difficult';
  };

  const difficultyRanges = {
    easy: { min: 0, max: 20, label: 'Easy' },
    fair: { min: 20, max: 40, label: 'Fair' },
    moderate: { min: 40, max: 60, label: 'Moderate' },
    hard: { min: 60, max: 80, label: 'Hard' },
    difficult: { min: 80, max: 100, label: 'Difficult' }
  };

  const allowedDifficulties = (choice) => {
    if (!choice || choice === 'random') return null;
    const map = {
      easy: ['EASY', 'FAIR'],
      fair: ['EASY', 'FAIR', 'MODERATE'],
      moderate: ['FAIR', 'MODERATE', 'HARD'],
      hard: ['MODERATE', 'HARD', 'DIFFICULT'],
      difficult: ['HARD', 'DIFFICULT']
    };
    return new Set(map[choice] || []);
  };

  const filterWordsByDifficulty = (list, choice) => {
    if (!choice || choice === 'random') return list;
    const allowedSet = allowedDifficulties(choice);
    const filtered = list.filter(item => {
      const diff = (item.difficulty || 'MODERATE').toUpperCase();
      if (allowedSet && !allowedSet.has(diff)) return false;
      return true;
    });
    return filtered;
  };

  const difficultyColorClass = (label = '') => {
    const d = label.toUpperCase();
    if (d === 'EASY') return 'text-sky-200';
    if (d === 'FAIR') return 'text-emerald-200';
    if (d === 'MODERATE') return 'text-amber-200';
    if (d === 'HARD') return 'text-orange-200';
    if (d === 'DIFFICULT') return 'text-rose-200';
    return 'text-purple-200';
  };

  const computePuzzleDifficulty = useCallback((gridData, clueSet) => {
    if (!gridData || !clueSet) return { score: null, label: '' };
    const allClues = [...(clueSet.across || []), ...(clueSet.down || [])];
    let total = 0;
    let count = 0;
    for (const clue of allClues) {
      const word = clue.word || getWordFromGrid(gridData, clue.row, clue.col, clue.length, clue.direction || clue.slot?.direction || 'across');
      if (!word) continue;
      if (word.includes('_') || word.includes(null)) continue;
      const info = getDateInfoForWordClue(word.toUpperCase(), clue.clue) || getDateInfoForWord(word.toUpperCase());
      const val = difficultyValueFromText(info?.difficulty || clue.difficulty || '');
      total += val;
      count += 1;
    }
    if (count === 0) return { score: null, label: '' };
    const avg = total / count;
    return { score: avg * 100, label: difficultyLabelFromScore(avg) };
  }, [getDateInfoForWord, getDateInfoForWordClue]);

  useEffect(() => {
    let info = { score: null, label: '' };
    if (activeTab === 'play' && playAnswers && playClues) {
      info = computePuzzleDifficulty(playAnswers, playClues);
    } else if (activeTab === 'create' && manualGrid && manualClues) {
      info = computePuzzleDifficulty(manualGrid, manualClues);
    } else if (grid && clues) {
      info = computePuzzleDifficulty(grid, clues);
    }
    setDifficultyInfo(info);
  }, [activeTab, playAnswers, playClues, manualGrid, manualClues, grid, clues, computePuzzleDifficulty]);

  // Clear failed highlight if the word is no longer present in the current grid
  useEffect(() => {
    if (!failedWord) return;
    const currentGrid = activeTab === 'auto' ? grid : manualGrid;
    const layoutIdx = activeTab === 'auto' ? selectedLayoutIndex : currentLayoutIndex;
    if (!hasWordInGrid(currentGrid, layoutIdx, failedWord)) {
      setFailedWord(null);
    }
  }, [failedWord, grid, manualGrid, activeTab, selectedLayoutIndex, currentLayoutIndex, hasWordInGrid]);

  const handleRequiredConfirm = (wordsList, mode, difficulty) => {
    const chosenMode = mode || 'anchor';
    if (difficulty) setDifficultyChoice(difficulty);
    setRequiredWords(wordsList);
    setRequiredMode(chosenMode);
    setShowRequiredModal(false);
    if (requiredAction === 'play') {
      handleAutoGeneratePlayInternal(wordsList, chosenMode);
    } else {
      handleAutoGenerateInternal(wordsList, chosenMode);
    }
  };

  const generateManualFill = async (wordList = words, requiredWordsList = [], requiredModeInput = 'opportunistic') => {
    if (!manualGrid) { setError('Create a grid first'); return; }
    if (wordList.length === 0) { setError('Please upload a CSV file first'); return; }
    if (!layouts[currentLayoutIndex]) { setError('Please select a valid layout'); return; }
    
    cancelRef.current = false;
    setIsGenerating(true);
    setFailedWord(null);
    setProgress('Filling remaining slots...');
    setError('');
    
    const layout = layouts[currentLayoutIndex].grid;
    const presetGrid = manualGrid.map(row => row.map(cell => {
      if (cell === '#') return '#';
      if (!cell) return null;
      return cell.toUpperCase();
    }));
    
    const presetClues = {};
    manualClues.across.forEach(c => {
      presetClues[`across-${c.row}-${c.col}`] = c.clue || '';
    });
    manualClues.down.forEach(c => {
      presetClues[`down-${c.row}-${c.col}`] = c.clue || '';
    });
    const requiredMerged = requiredWordsList.map(w => w.toUpperCase());
    const allowedSet = allowedDifficulties(difficultyChoice);
    const workingWords = filterWordsByDifficulty(wordList, difficultyChoice);
    if (workingWords.length === 0) {
      setError('No words match the selected difficulty/filter.');
      setIsGenerating(false);
      return;
    }
    requiredMerged.forEach(w => {
      if (!workingWords.some(item => item.word === w)) {
        workingWords.push({ word: w, clue: '', difficulty: 'MODERATE' });
      }
    });
    
    // Add fully filled manual words (even if not in dictionary) as valid options with empty clue
    const slots = findSlots(layout);
    for (const slot of slots) {
      let word = '';
      let complete = true;
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === 'across' ? slot.row : slot.row + i;
        const c = slot.direction === 'across' ? slot.col + i : slot.col;
        const ch = presetGrid[r][c];
        if (!ch || ch === '#') { complete = false; break; }
        word += ch;
      }
      if (complete) {
        const existing = workingWords.find(w => w.word === word);
        const diff = 'MODERATE';
        if (!allowedSet || allowedSet.has(diff)) {
          if (!existing) {
            const clueEntry = presetClues[`${slot.direction}-${slot.row}-${slot.col}`] || '';
            workingWords.push({ word, clue: clueEntry, difficulty: diff });
          }
        }
      }
    }
    
    const timeoutMs = 120000;
    const startTime = Date.now();
    const maxDifficultyRuns = difficultyChoice !== 'random' ? 3 : 1;
    const range = difficultyChoice !== 'random' ? difficultyRanges[difficultyChoice] : null;
    let bestRun = null;
    let bestGap = Infinity;
    let lastResult = null;

    for (let attemptRun = 1; attemptRun <= maxDifficultyRuns; attemptRun++) {
      const result = await generateCrossword(
        workingWords,
        layout,
        setProgress,
        () => cancelRef.current || (Date.now() - startTime > timeoutMs),
        presetGrid,
        requiredMerged,
        requiredModeInput,
        presetClues
      );
      lastResult = result;
      if (!result?.grid) continue;
      const numberedTmp = assignNumbers(result.placements || []);
      const tmpClues = {
        across: numberedTmp.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number),
        down: numberedTmp.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number)
      };
      const diffInfo = computePuzzleDifficulty(result.grid, tmpClues);
      const gap = range && diffInfo.score !== null ? Math.max(range.min - diffInfo.score, diffInfo.score - range.max, 0) : 0;
      if (range && gap <= 0) {
        bestRun = { ...result, cluesObj: tmpClues, difficultyMeta: diffInfo };
        break;
      }
      if (gap < bestGap) {
        bestGap = gap;
        bestRun = { ...result, cluesObj: tmpClues, difficultyMeta: diffInfo };
      }
    }

    const picked = bestRun || lastResult;
    const newGrid = picked?.grid || presetGrid;
    const placements = picked?.placements || [];
    const complete = picked?.complete || false;
    const solveFailedWord = picked?.failedWord || null;
    const generatedClues = picked?.cluesObj || (() => {
      const numbered = assignNumbers(placements || []);
      return {
        across: numbered.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number),
        down: numbered.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number)
      };
    })();
    
    if (cancelRef.current) {
      setIsGenerating(false);
      setProgress('Stopped. Best partial grid shown.');
    }

    const finalGrid = newGrid || presetGrid;
    setManualGrid(finalGrid);
    
    const placementMap = new Map();
    (placements || []).forEach(p => {
      placementMap.set(`${p.slot.direction}-${p.slot.row}-${p.slot.col}`, p);
    });
    
    const updateClueList = (list, direction) => list.map(clue => {
      const word = getWordFromGrid(finalGrid, clue.row, clue.col, clue.length, direction);
      const placement = placementMap.get(`${direction}-${clue.row}-${clue.col}`);
      return { 
        ...clue, 
        word, 
        clue: clue.clue || placement?.clue || clue.clue || '' 
      };
    });
    
    const newManualClues = generatedClues?.across ? generatedClues : {
      across: updateClueList(manualClues.across, 'across'),
      down: updateClueList(manualClues.down, 'down')
    };
    setManualClues(newManualClues);
    setLatestGrid(finalGrid);
    setLatestClues(newManualClues);
    const placedReq = computePlacedRequired(finalGrid, currentLayoutIndex, requiredMerged);
    setRequiredHighlights(new Set(placedReq));
    setShowRequiredHighlights(placedReq.length > 0);
    setHighlightMissingRequired(true);
    
    if (complete) {
      setProgress('Filled all remaining slots!');
      setTimeout(() => setProgress(''), 3000);
      setFailedWord(null);
    } else {
      const slots = findSlots(layout);
      const filled = placements ? placements.length : 0;
      setProgress(`Stopped with best result: ${filled}/${slots.length} slots filled. You can keep editing and run again.`);
      if (filled === 0) setError('Could not place additional words with the current letters.');
      const lastPlaced = placements?.length ? placements[placements.length - 1]?.word : null;
      setFailedWord(lastPlaced || solveFailedWord || null);
    }
    
    setIsGenerating(false);
  };
  
  const handleManualGenerate = () => {
    const manualRequired = parseWordListInput(manualRequiredInput);
    generateManualFill(words, manualRequired, manualRequiredMode || 'opportunistic');
  };

  const normalizeLayoutGrid = (gridData) => gridData.map(row => Array.isArray(row) ? row.join('') : row);

  const handleSaveLayout = (name, gridData) => {
    const normalizedGrid = normalizeLayoutGrid(gridData);
    let updatedLayouts = layouts;

    if (layoutEditorMode === 'edit' && editingLayoutIndex !== null) {
      updatedLayouts = layouts.map((layout, idx) => idx === editingLayoutIndex ? { ...layout, name, grid: normalizedGrid } : layout);
      setLayouts(updatedLayouts);
      setSelectedLayoutIndex(editingLayoutIndex);
      setCurrentLayoutIndex(editingLayoutIndex);
      if (activeTab === 'create') initializeManualGrid(editingLayoutIndex, updatedLayouts);
    } else {
      updatedLayouts = [...layouts, { name, grid: normalizedGrid }];
      const newIndex = updatedLayouts.length - 1;
      setLayouts(updatedLayouts);
      setSelectedLayoutIndex(newIndex);
      setCurrentLayoutIndex(newIndex);
      if (activeTab === 'create') initializeManualGrid(newIndex, updatedLayouts);
    }

    return true;
  };

  const openCreateLayoutModal = () => {
    setLayoutEditorMode('create');
    setEditingLayoutIndex(null);
    setShowLayoutModal(true);
  };

  const openEditLayoutModal = () => {
    setLayoutEditorMode('edit');
    setEditingLayoutIndex(layoutIndexForTab);
    setShowLayoutModal(true);
  };

  const handleSelectLayout = (layoutIdx, tab = activeTab) => {
    if (!layouts[layoutIdx]) return;
    if (tab === 'create') {
      initializeManualGrid(layoutIdx);
    } else {
      setSelectedLayoutIndex(layoutIdx);
    }
    setShowLayoutSelector(false);
  };

  const canPlaceWord = (grid, slot, word) => {
    if (word.length !== slot.length) return false;
    for (let i = 0; i < word.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      if (grid[r][c] !== null && grid[r][c] !== word[i]) return false;
    }
    return true;
  };

  const placeWord = (grid, slot, word) => {
    const newGrid = grid.map(row => [...row]);
    for (let i = 0; i < word.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      newGrid[r][c] = word[i];
    }
    return newGrid;
  };

  const getIntersections = (slot, slots) => {
    const intersections = [];
    for (const other of slots) {
      if (slot.id === other.id) continue;
      if (slot.direction === 'across' && other.direction === 'down') {
        if (other.col >= slot.col && other.col < slot.col + slot.length && slot.row >= other.row && slot.row < other.row + other.length) {
          intersections.push({ slot: other, myIndex: other.col - slot.col, theirIndex: slot.row - other.row });
        }
      } else if (slot.direction === 'down' && other.direction === 'across') {
        if (slot.col >= other.col && slot.col < other.col + other.length && other.row >= slot.row && other.row < slot.row + slot.length) {
          intersections.push({ slot: other, myIndex: other.row - slot.row, theirIndex: slot.col - other.col });
        }
      }
    }
    return intersections;
  };

  // ============ WAVE FUNCTION COLLAPSE - CROSSWYRD STYLE (OPTIMIZED) ============
  // With frequent yields to prevent "Page Unresponsive" popup
  // Uses backtracking with state saving/restoring
  // Returns { grid, placements, attempts, complete }
  // - grid: 2D array of characters (null for empty, '#' for black)
  // - placements: array of { slot, word, clue }
  // - attempts: number of WFC attempts made
  //  - complete: boolean indicating if puzzle is fully filled
  // - onProgress: callback(progressString)
  // - shouldCancel: function that returns true if generation should be cancelled
  // - wordList: array of { word, clue }
  // - layout: 2D array of characters ('#' for black, '.' for white)
  // - Uses Maps and Sets for performance
  // - Highly optimized for performance and responsiveness
  // - Implements advanced constraint propagation and backtracking
  // - Randomizes word selection to improve variety
  // - Yields frequently to keep UI responsive
  
  const generateCrossword = async (wordList, layout, onProgress, shouldCancel, presetGrid = null, requiredWordsList = [], requiredModeArg = 'anchor', presetClues = {}) => {
    const slots = findSlots(layout);
    const rows = layout.length;
    const cols = layout[0].length;
    const requiredSet = new Set(requiredWordsList.map(w => w.toUpperCase()));
    const requiredModeLocal = requiredModeArg || 'anchor';
    
    if (slots.length === 0) {
      return { grid: null, placements: [], attempts: 0, complete: false };
    }
    
    const emptyGrid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        if (layout[r][c] === '#') row.push('#');
        else if (presetGrid && presetGrid[r] && presetGrid[r][c] && presetGrid[r][c] !== '#') row.push(presetGrid[r][c].toUpperCase());
        else row.push(null);
      }
      emptyGrid.push(row);
    }
    
    // Build word dictionary by length
    const wordsByLength = {};
    for (const item of wordList) {
      const len = item.word.length;
      if (!wordsByLength[len]) wordsByLength[len] = [];
      wordsByLength[len].push(item);
    }
    
    // Pre-compute: for each slot, which cells does it cover?
    const slotCells = new Map();
    for (const slot of slots) {
      const cells = [];
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === 'across' ? slot.row : slot.row + i;
        const c = slot.direction === 'across' ? slot.col + i : slot.col;
        cells.push({ r, c, index: i });
      }
      slotCells.set(slot.id, cells);
    }
    
    // Pre-compute: for each cell, which slots use it?
    const cellToSlots = {};
    for (const slot of slots) {
      const cells = slotCells.get(slot.id);
      for (const cell of cells) {
        const key = `${cell.r},${cell.c}`;
        if (!cellToSlots[key]) cellToSlots[key] = [];
        cellToSlots[key].push({ slot, index: cell.index });
      }
    }

    
    // Shuffle array helper
    const shuffleArray = (arr) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    // ============ WFC SOLVER ============
    const wfcSolve = async (startTime, attemptNum) => {
      let lastPlacedWord = null;
      let lastConflictWord = null;
      const getLastPlacedInGrid = () => (placements.length ? placements[placements.length - 1].word : lastPlacedWord);
      const getActiveConflictWord = () => lastConflictWord || (stateStack.length ? stateStack[stateStack.length - 1]?.triedWord : null) || getLastPlacedInGrid() || null;
      // Initialize grid
      const grid = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          if (layout[r][c] === '#') {
            row.push('#');
          } else if (presetGrid && presetGrid[r] && presetGrid[r][c] && presetGrid[r][c] !== '#') {
            row.push(presetGrid[r][c].toUpperCase());
          } else {
            row.push(null);
          }
        }
        grid.push(row);
      }
      
      // Cell-level possibilities
      const cellPossibilities = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (layout[r][c] !== '#') {
            const preset = presetGrid && presetGrid[r] && presetGrid[r][c] && presetGrid[r][c] !== '#' ? presetGrid[r][c].toUpperCase() : null;
            cellPossibilities[`${r},${c}`] = preset ? new Set([preset]) : new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
          }
        }
      }

      // Slot-level possibilities
      const slotPossibilities = new Map();
      for (const slot of slots) {
        const candidates = wordsByLength[slot.length] || [];
        slotPossibilities.set(slot.id, new Set(shuffleArray(candidates.map(c => c.word))));
      }
      
      const usedWords = new Set();
      const usedRequired = new Set();
      const placements = [];
      const placedSlotIds = new Set();
      
      // Get possible letters at a position for a slot
      const getPossibleLettersAtPosition = (slotId, position) => {
        const words = slotPossibilities.get(slotId);
        const letters = new Set();
        for (const word of words) {
          if (position < word.length) {
            letters.add(word[position]);
          }
        }
        return letters;
      };
      
      // Update cell possibilities
      const updateCellPossibilities = (r, c) => {
        const key = `${r},${c}`;
        const slotsUsingCell = cellToSlots[key] || [];
        
        if (slotsUsingCell.length === 0) return true;
        
        let newPossibilities = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
        
        for (const { slot, index } of slotsUsingCell) {
          if (placedSlotIds.has(slot.id)) continue;
          
          const slotLetters = getPossibleLettersAtPosition(slot.id, index);
          newPossibilities = new Set([...newPossibilities].filter(l => slotLetters.has(l)));
        }
        
        if (grid[r][c] !== null) {
          newPossibilities = new Set([grid[r][c]]);
        }
        
        cellPossibilities[key] = newPossibilities;
        return newPossibilities.size > 0;
      };
      
      // Filter slot words based on cell constraints
      const filterSlotWords = (slot) => {
        const cells = slotCells.get(slot.id);
        const currentWords = slotPossibilities.get(slot.id);
        const newWords = new Set();
        
        for (const word of currentWords) {
          if (usedWords.has(word)) continue;
          
          let valid = true;
          for (const cell of cells) {
            const key = `${cell.r},${cell.c}`;
            const letter = word[cell.index];
            
            if (grid[cell.r][cell.c] !== null) {
              if (grid[cell.r][cell.c] !== letter) {
                valid = false;
                break;
              }
            } else {
              if (!cellPossibilities[key].has(letter)) {
                valid = false;
                break;
              }
            }
          }
          
          if (valid) {
            newWords.add(word);
          }
        }
        
        slotPossibilities.set(slot.id, newWords);
        return newWords.size > 0;
      };
      
      // Propagate constraints (with yield for responsiveness)
      const propagate = async () => {
        let changed = true;
        let iterations = 0;
        const maxIterations = 500;
        let yieldCounter = 0;
        
        while (changed && iterations < maxIterations) {
          changed = false;
          iterations++;
          yieldCounter++;
          
          // Yield every 20 iterations to keep UI responsive
          if (yieldCounter >= 20) {
            yieldCounter = 0;
            await new Promise(resolve => setTimeout(resolve, 0));
            if (shouldCancel()) {
              lastConflictWord = getActiveConflictWord();
              return snapshot(); // Return current best on cancel
            }
          }
          
          // Update cell possibilities
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (layout[r][c] === '#') continue;
              
              const key = `${r},${c}`;
              const oldSize = cellPossibilities[key].size;
              
              if (!updateCellPossibilities(r, c)) {
                return false;
              }
              
              if (cellPossibilities[key].size < oldSize) {
                changed = true;
              }
            }
          }
          
          // Filter words for unfilled slots
          for (const slot of slots) {
            if (placedSlotIds.has(slot.id)) continue;
            
            const oldSize = slotPossibilities.get(slot.id).size;
            
            if (!filterSlotWords(slot)) {
              return false;
            }
            
            if (slotPossibilities.get(slot.id).size < oldSize) {
              changed = true;
            }
          }
        }
        
        return true;
      };
      
      // Calculate slot entropy
      const getSlotEntropy = (slot) => {
        const cells = slotCells.get(slot.id);
        let totalEntropy = 0;
        
        for (const cell of cells) {
          const key = `${cell.r},${cell.c}`;
          totalEntropy += cellPossibilities[key].size;
        }
        
        return totalEntropy / cells.length;
      };
      
      // Find lowest entropy slot
      const findLowestEntropySlot = () => {
        let minEntropy = Infinity;
        let minSlot = null;
        
        for (const slot of slots) {
          if (placedSlotIds.has(slot.id)) continue;
          
          const words = slotPossibilities.get(slot.id);
          if (words.size === 0) continue;
          
          const entropy = getSlotEntropy(slot);
          const hasRequiredCandidate = [...words].some(w => requiredSet.has(w) && !usedRequired.has(w));
          
          let adjustedEntropy = entropy + Math.random() * 0.001;
          if (requiredModeLocal === 'anchor' && hasRequiredCandidate) adjustedEntropy -= 1000;
          if (requiredModeLocal === 'opportunistic' && hasRequiredCandidate) adjustedEntropy -= 200;
          
          if (adjustedEntropy < minEntropy) {
            minEntropy = adjustedEntropy;
            minSlot = slot;
          }
        }
        
        return minSlot;
      };
      
      // Place word
      const placeWord = (slot, word, clueOverride = '') => {
        const cells = slotCells.get(slot.id);
        for (const cell of cells) {
          const existing = grid[cell.r][cell.c];
          if (existing && existing !== word[cell.index] && existing !== '#') {
            return false; // conflict, do not place
          }
        }
        for (const cell of cells) {
          grid[cell.r][cell.c] = word[cell.index];
          cellPossibilities[`${cell.r},${cell.c}`] = new Set([word[cell.index]]);
        }
        usedWords.add(word);
        if (requiredSet.has(word)) usedRequired.add(word);
        placedSlotIds.add(slot.id);
        lastPlacedWord = word;
        
        const presetKey = `${slot.direction}-${slot.row}-${slot.col}`;
        const wordItem = wordList.find(w => w.word === word) || { word, clue: '' };
        const finalClue = clueOverride || presetClues[presetKey] || wordItem.clue || '';
        placements.push({ slot, word, clue: finalClue });
        return true;
      };

      const snapshot = (backtracksCount = backtracks) => ({
        grid: grid.map(row => [...row]),
        placements: [...placements],
        complete: placements.length === slots.length && usedRequired.size === requiredSet.size,
        backtracks: backtracksCount,
        requiredPlaced: usedRequired.size,
        failedWord: getActiveConflictWord()
      });
      
      // Save state
      const saveState = () => {
        return {
          grid: grid.map(row => [...row]),
          cellPossibilities: Object.fromEntries(
            Object.entries(cellPossibilities).map(([k, v]) => [k, new Set(v)])
          ),
          slotPossibilities: new Map(
            [...slotPossibilities.entries()].map(([k, v]) => [k, new Set(v)])
          ),
          usedWords: new Set(usedWords),
          usedRequired: new Set(usedRequired),
          placedSlotIds: new Set(placedSlotIds),
          placements: [...placements]
        };
      };
      
      // Restore state
      const restoreState = (state) => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            grid[r][c] = state.grid[r][c];
          }
        }
        for (const [k, v] of Object.entries(state.cellPossibilities)) {
          cellPossibilities[k] = new Set(v);
        }
        for (const [k, v] of state.slotPossibilities) {
          slotPossibilities.set(k, new Set(v));
        }
        usedWords.clear();
        for (const w of state.usedWords) usedWords.add(w);
        usedRequired.clear();
        for (const w of state.usedRequired) usedRequired.add(w);
        placedSlotIds.clear();
        for (const id of state.placedSlotIds) placedSlotIds.add(id);
        placements.length = 0;
        placements.push(...state.placements);
      };
      
      // Initial propagation
      const initResult = await propagate();
      if (initResult === null) return snapshot(); // Cancelled
      if (initResult === false) {
        return { grid, placements, complete: false, backtracks: 0, requiredPlaced: usedRequired.size };
      }

      // Pre-place required words (anchor mode) if they fit current constraints
      if (requiredModeLocal === 'anchor' && requiredSet.size > 0) {
        const requiredList = shuffleArray([...requiredSet]);
        for (const reqWord of requiredList) {
          if (usedRequired.has(reqWord)) continue;
          const candidateSlots = shuffleArray(slots.filter(s => s.length === reqWord.length && !placedSlotIds.has(s.id)));
          for (const slot of candidateSlots) {
            let fits = true;
            for (let i = 0; i < slot.length; i++) {
              const r = slot.direction === 'across' ? slot.row : slot.row + i;
              const c = slot.direction === 'across' ? slot.col + i : slot.col;
              const existing = grid[r][c];
              if (existing && existing !== reqWord[i]) { fits = false; break; }
            }
            if (fits) {
              placeWord(slot, reqWord);
              break;
            }
          }
        }
      }

      // Pre-place fully filled slots from preset grid even if not in dictionary
      for (const slot of slots) {
        if (placedSlotIds.has(slot.id)) continue;
        const cells = slotCells.get(slot.id);
        const letters = cells.map(cell => grid[cell.r][cell.c]);
        if (letters.every(l => l && l !== '#')) {
          const wordStr = letters.join('');
          placeWord(slot, wordStr, presetClues[`${slot.direction}-${slot.row}-${slot.col}`] || '');
        }
      }
      
      // Backtracking stack
      const stateStack = [];
      let iterations = 0;
      let backtracks = 0;
      let lastYield = Date.now();
      
      // Main WFC loop
      while (placements.length < slots.length) {
        if (shouldCancel()) {
          lastConflictWord = getActiveConflictWord();
          return snapshot();
        }
        
        iterations++;
        
        // Yield frequently to prevent page unresponsive
        const now = Date.now();
        if (now - lastYield > 50) { // Yield every 50ms
          lastYield = now;
          const elapsed = ((now - startTime) / 1000).toFixed(1);
          onProgress(`Attempt ${attemptNum} (${elapsed}s): WFC ${placements.length}/${slots.length} slots, ${backtracks} backtracks...`);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // Find slot with lowest entropy
        const slot = findLowestEntropySlot();
        
        if (!slot) {
          if (stateStack.length === 0) {
            lastConflictWord = lastPlacedWord;
            return { grid, placements, complete: false, backtracks, requiredPlaced: usedRequired.size, failedWord: lastConflictWord || lastPlacedWord || null };
          }
          
          backtracks++;
          const prevState = stateStack.pop();
          lastConflictWord = prevState.triedWord || lastPlacedWord || getActiveConflictWord();
          restoreState(prevState.state);
          slotPossibilities.get(prevState.slot.id).delete(prevState.triedWord);
          continue;
        }
        
        const possibilities = [...slotPossibilities.get(slot.id)];
        
        if (possibilities.length === 0) {
          if (stateStack.length === 0) {
            lastConflictWord = lastPlacedWord;
            return { grid, placements, complete: false, backtracks, requiredPlaced: usedRequired.size, failedWord: lastConflictWord || lastPlacedWord || null };
          }
          
          backtracks++;
          const prevState = stateStack.pop();
          lastConflictWord = prevState.triedWord || lastPlacedWord || getActiveConflictWord();
          restoreState(prevState.state);
          slotPossibilities.get(prevState.slot.id).delete(prevState.triedWord);
          continue;
        }
        
        // Save state
        const savedState = saveState();
        const requiredOption = possibilities.find(w => requiredSet.has(w) && !usedRequired.has(w));
        const chosenWord = requiredOption || possibilities[0];
        
        stateStack.push({
          slot,
          triedWord: chosenWord,
          state: savedState
        });
        
        // Place word
        const placed = placeWord(slot, chosenWord);
        if (!placed) {
          slotPossibilities.get(slot.id).delete(chosenWord);
          stateStack.pop();
          continue;
        }
        
        // Propagate
        const propResult = await propagate();
        
        if (propResult === null) return snapshot(); // Cancelled
        
        if (propResult === false) {
          backtracks++;
          lastConflictWord = chosenWord || getActiveConflictWord();
          restoreState(savedState);
          slotPossibilities.get(slot.id).delete(chosenWord);
          stateStack.pop();
        }
      }
      
      const requiredPlaced = usedRequired.size;
      const complete = placements.length === slots.length && requiredPlaced === requiredSet.size;
      return { grid, placements, complete, backtracks, requiredPlaced, failedWord: getActiveConflictWord() };
    };
    
    // Run attempts
    const startTime = Date.now();
    let attempts = 0;
    let bestResult = { grid: emptyGrid, placements: [], backtracks: 0, requiredPlaced: 0, failedWord: null };
    let bestScore = 0;
    let bestRequired = 0;
    let lastResult = null;
    
    while (!shouldCancel()) {
      attempts++;
      
      const result = await wfcSolve(startTime, attempts);
      lastResult = result;
      
      if (result === null) break;
      
      if (result.complete) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        onProgress(`Complete! WFC solved in ${elapsed}s (attempt ${attempts}, ${result.backtracks} backtracks)`);
        return { ...result, attempts, complete: true, failedWord: null };
      }
      
      if (result.requiredPlaced > bestRequired || (result.requiredPlaced === bestRequired && result.placements.length > bestScore)) {
        bestRequired = result.requiredPlaced;
        bestScore = result.placements.length;
        const fallbackFailed = result.placements.length ? result.placements[result.placements.length - 1].word : result.failedWord || bestResult.failedWord || null;
        bestResult = {
          grid: result.grid.map(row => [...row]),
          placements: [...result.placements],
          backtracks: result.backtracks,
          requiredPlaced: result.requiredPlaced,
          failedWord: fallbackFailed
        };
      }
      
      // Yield between attempts
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return {
      grid: bestResult?.grid || lastResult?.grid,
      placements: bestResult?.placements?.length ? bestResult.placements : (lastResult?.placements || []),
      requiredPlaced: bestResult?.requiredPlaced || lastResult?.requiredPlaced || 0,
      attempts,
      failedWord: bestResult?.failedWord || lastResult?.failedWord || (lastResult?.placements?.length ? lastResult.placements[lastResult.placements.length - 1].word : null) || null,
      complete: false
    };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvLoading(true);
    setProgress('Loading CSV...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCSV(event.target.result);
        if (parsed.length === 0) { setError('No valid words found in CSV'); return; }
        setWords(parsed);
        setError('');
        if (activeTab === 'auto') generatePuzzle(parsed);
      } catch (err) { setError('Error parsing CSV: ' + err.message); }
      setCsvLoading(false);
      setProgress('');
    };
    reader.onerror = () => {
      setCsvLoading(false);
      setProgress('');
      setError('Error reading CSV file');
    };
    reader.readAsText(file);
  };

  const generatePuzzle = async (wordList = words, layoutIdx = selectedLayoutIndex, autoStartPlay = false, requiredWordsList = requiredWords, requiredModeInput = requiredMode, targetDifficulty = difficultyChoice) => {
    if (wordList.length === 0) { setError('Please upload a CSV file first'); return; }
    const filteredWords = filterWordsByDifficulty(wordList, targetDifficulty);
    if (filteredWords.length === 0) { setError('No words match the selected difficulty/filter.'); return; }
    
    // Reset cancellation state
    cancelRef.current = false;
    setIsGenerating(true);
    setFailedWord(null);
    setProgress('Initializing...');
    setError('');
    setGrid(null); // Clear previous grid while generating
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!layouts[layoutIdx]) {
      setError('Please select a valid layout');
      setIsGenerating(false);
      return;
    }
    
    const layout = layouts[layoutIdx].grid;
    const slots = findSlots(layout);
    
    // Merge required words into working list (ensure presence)
    const requiredMerged = requiredWordsList.map(w => w.toUpperCase());
    const workingWords = filterWordsByDifficulty(wordList, targetDifficulty);
    requiredMerged.forEach(w => {
      if (!workingWords.some(item => item.word === w)) {
        workingWords.push({ word: w, clue: '', difficulty: 'MODERATE' });
      }
    });
    
    log(`Starting generation with ${wordList.length} words for ${slots.length} slots`);
    setProgress(`Searching for complete ${layout.length}x${layout[0].length} puzzle...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const timeoutMs = 120000;
    const startTime = Date.now();
    const maxDifficultyRuns = targetDifficulty && targetDifficulty !== 'random' ? 3 : 1;
    const range = targetDifficulty !== 'random' ? difficultyRanges[targetDifficulty] : null;
    let bestRun = null;
    let bestGap = Infinity;
    let lastResult = null;

    for (let attemptRun = 1; attemptRun <= maxDifficultyRuns; attemptRun++) {
      const result = await generateCrossword(
        workingWords, 
        layout, 
        setProgress,
        () => cancelRef.current || (Date.now() - startTime > timeoutMs),
        null,
        requiredMerged,
        requiredModeInput,
        {}
      );
      lastResult = result;
      if (!result?.grid) continue;
      
      const numberedTmp = assignNumbers(result.placements);
      const tmpClues = { 
        across: numberedTmp.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number), 
        down: numberedTmp.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number) 
      };
      const diffInfo = computePuzzleDifficulty(result.grid, tmpClues);
      const gap = range && diffInfo.score !== null ? Math.max(range.min - diffInfo.score, diffInfo.score - range.max, 0) : 0;
      
      if (range && gap <= 0) {
        bestRun = { ...result, cluesObj: tmpClues, difficultyMeta: diffInfo };
        break;
      }
      
      if (gap < bestGap) {
        bestGap = gap;
        bestRun = { ...result, cluesObj: tmpClues, difficultyMeta: diffInfo };
      }
    }

    const picked = bestRun || lastResult;
    const newGrid = picked?.grid;
    const placements = picked?.placements || [];
    const attempts = picked?.attempts || 1;
    const complete = picked?.complete || false;
    const solveFailedWord = picked?.failedWord || null;
    const difficultyMeta = picked?.difficultyMeta || computePuzzleDifficulty(newGrid, clues);
    
    if (cancelRef.current) {
      setIsGenerating(false);
      setProgress('Stopped. Showing best partial grid.');
    }

    if (complete) {
      const generatedClues = picked?.cluesObj || (() => {
        const numbered = assignNumbers(placements);
        return {
          across: numbered.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number), 
          down: numbered.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number) 
        };
      })();
      setGrid(newGrid);
      setClues(generatedClues);
      setLatestGrid(newGrid);
      setLatestClues(generatedClues);
      setDifficultyInfo(difficultyMeta || computePuzzleDifficulty(newGrid, generatedClues));
      const placedReq = computePlacedRequired(newGrid, layoutIdx, requiredMerged);
      setRequiredHighlights(new Set(placedReq));
      setShowRequiredHighlights(placedReq.length > 0);
      setHighlightMissingRequired(true);
      syncManualFromAuto(newGrid, generatedClues, layoutIdx);
      if (autoStartPlay) {
        startPlayMode(newGrid, generatedClues);
      }
      setProgress(`Success! All ${slots.length} slots filled.`);
      setTimeout(() => setProgress(''), 5000);
      setFailedWord(null);
    } else if (newGrid) {
      // Stopped early - show best result
      const generatedClues = picked?.cluesObj || (() => {
        const numbered = assignNumbers(placements);
        return {
          across: numbered.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number), 
          down: numbered.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number) 
        };
      })();
      setGrid(newGrid);
      setClues(generatedClues);
      setLatestGrid(newGrid);
      setLatestClues(generatedClues);
      setDifficultyInfo(difficultyMeta || computePuzzleDifficulty(newGrid, generatedClues));
      const placedReq = computePlacedRequired(newGrid, layoutIdx, requiredMerged);
      setRequiredHighlights(new Set(placedReq));
      setShowRequiredHighlights(placedReq.length > 0);
      setHighlightMissingRequired(true);
      syncManualFromAuto(newGrid, generatedClues, layoutIdx);
      setActiveTab('create');
      setError(`Stopped: Best result was ${placements.length}/${slots.length} slots filled. You can edit it in Create.`);
      const lastPlaced = placements?.length ? placements[placements.length - 1]?.word : null;
      setFailedWord(lastPlaced || solveFailedWord || null);
    } else {
      setError('Could not place any words. Check that your CSV has words of the right lengths.');
    }
    
    setIsGenerating(false);
  };

  const handleAutoGenerateInternal = (reqWords, mode) => {
    generatePuzzle(words, selectedLayoutIndex, false, reqWords, mode, difficultyChoice);
  };
  
  const handleAutoGeneratePlayInternal = (reqWords, mode) => {
    generatePuzzle(words, selectedLayoutIndex, true, reqWords, mode, difficultyChoice);
  };

  const syncManualFromAuto = (newGrid, generatedClues, layoutIdx) => {
    if (!newGrid || !generatedClues) return;
    const layout = layouts[layoutIdx]?.grid || layouts[0]?.grid;
    if (!layout) return;
    setCurrentLayoutIndex(layoutIdx);
    setManualGrid(newGrid.map(row => row.map(cell => cell === null ? '' : cell)));
    const slots = findSlots(layout);
    const numbered = [];
    const numberMap = new Map();
    let currentNumber = 1;
    const sortedSlots = [...slots].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    for (const slot of sortedSlots) {
      const key = `${slot.row},${slot.col}`;
      if (!numberMap.has(key)) numberMap.set(key, currentNumber++);
      const word = getWordFromGrid(newGrid, slot.row, slot.col, slot.length, slot.direction);
      const clueSource = (slot.direction === 'across' ? generatedClues.across : generatedClues.down).find(c => c.row === slot.row && c.col === slot.col);
      numbered.push({ number: numberMap.get(key), direction: slot.direction, word, clue: clueSource?.clue || '', row: slot.row, col: slot.col, length: slot.length });
    }
    setManualClues({ 
      across: numbered.filter(n => n.direction === 'across'), 
      down: numbered.filter(n => n.direction === 'down') 
    });
    setSelectedCell(null);
  };
  
  const cancelGeneration = () => {
    cancelRef.current = true;
  };

  const exportPuzzle = () => {
    const currentGrid = activeTab === 'auto' ? grid : manualGrid;
    const currentClues = activeTab === 'auto' ? clues : manualClues;
    const layoutIdx = activeTab === 'auto' ? selectedLayoutIndex : currentLayoutIndex;
    if (!currentGrid) return;
    if (!layouts[layoutIdx]) return;
    const puzzleData = {
      version: "1.0",
      layoutIndex: layoutIdx,
      layoutName: layouts[layoutIdx].name,
      layout: layouts[layoutIdx].grid,
      grid: currentGrid,
      clues: {
        across: currentClues.across.map(c => ({ number: c.number, row: c.row, col: c.col, length: c.length || c.word?.length, word: c.word || getWordFromGrid(currentGrid, c.row, c.col, c.length, 'across'), clue: c.clue })),
        down: currentClues.down.map(c => ({ number: c.number, row: c.row, col: c.col, length: c.length || c.word?.length, word: c.word || getWordFromGrid(currentGrid, c.row, c.col, c.length, 'down'), clue: c.clue }))
      },
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(puzzleData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crossword-puzzle.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPuzzle = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const puzzleData = JSON.parse(event.target.result);
        if (!puzzleData.grid || !puzzleData.clues) { setError('Invalid puzzle file'); return; }
        
        // Find matching layout by comparing grid patterns, or use the embedded layout
        let layoutIdx = 0;
        if (puzzleData.layout) {
          // Try to find a matching layout in our layouts array
          const importedLayoutStr = JSON.stringify(puzzleData.layout);
          const matchingIdx = layouts.findIndex(l => JSON.stringify(l.grid) === importedLayoutStr);
          if (matchingIdx !== -1) {
            layoutIdx = matchingIdx;
          } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < layouts.length) {
            // Fall back to layoutIndex if the layout pattern doesn't match but index is valid
            layoutIdx = puzzleData.layoutIndex;
          } else {
            const newLayout = { name: puzzleData.layoutName || 'Imported Layout', grid: normalizeLayoutGrid(puzzleData.layout) };
            const newIndex = layouts.length;
            setLayouts(prev => [...prev, newLayout]);
            layoutIdx = newIndex;
          }
          // If no match found, we'll use index 0 but the grid will still work since we use the actual grid data
        } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < layouts.length) {
          layoutIdx = puzzleData.layoutIndex;
        }
        
        // Store in auto tab for reference
        const importedClues = { across: puzzleData.clues.across, down: puzzleData.clues.down };
        setGrid(puzzleData.grid);
        setClues(importedClues);
        setLatestGrid(puzzleData.grid);
        setLatestClues(importedClues);
        setSelectedLayoutIndex(layoutIdx);
        
        // // Also set up play mode
        // startPlayMode(puzzleData.grid, { across: puzzleData.clues.across, down: puzzleData.clues.down });
        
        setError('');
        // setProgress(`Puzzle loaded! Click Play to start.`);
        setTimeout(() => setProgress(''), 3000);
      } catch (err) { setError('Error loading puzzle: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const importPuzzlePlay = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const puzzleData = JSON.parse(event.target.result);
        if (!puzzleData.grid || !puzzleData.clues) { setError('Invalid puzzle file'); return; }
        
        // Find matching layout by comparing grid patterns, or use the embedded layout
        let layoutIdx = 0;
        if (puzzleData.layout) {
          // Try to find a matching layout in our layouts array
          const importedLayoutStr = JSON.stringify(puzzleData.layout);
          const matchingIdx = layouts.findIndex(l => JSON.stringify(l.grid) === importedLayoutStr);
          if (matchingIdx !== -1) {
            layoutIdx = matchingIdx;
          } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < layouts.length) {
            // Fall back to layoutIndex if the layout pattern doesn't match but index is valid
            layoutIdx = puzzleData.layoutIndex;
          } else {
            const newLayout = { name: puzzleData.layoutName || 'Imported Layout', grid: normalizeLayoutGrid(puzzleData.layout) };
            const newIndex = layouts.length;
            setLayouts(prev => [...prev, newLayout]);
            layoutIdx = newIndex;
          }
          // If no match found, we'll use index 0 but the grid will still work since we use the actual grid data
        } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < layouts.length) {
          layoutIdx = puzzleData.layoutIndex;
        }
        
        // Store in auto tab for reference
        const importedClues = { across: puzzleData.clues.across, down: puzzleData.clues.down };
        setGrid(puzzleData.grid);
        setClues(importedClues);
        setLatestGrid(puzzleData.grid);
        setLatestClues(importedClues);
        setSelectedLayoutIndex(layoutIdx);
        
        // // Also set up play mode
        startPlayMode(puzzleData.grid, importedClues);
        
        setError('');
        setProgress(`Puzzle loaded! Click Play to start.`);
        setTimeout(() => setProgress(''), 3000);
      } catch (err) { setError('Error loading puzzle: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadPuzzle = async () => {
    const currentGrid = activeTab === 'auto' ? grid : manualGrid;
    const currentClues = activeTab === 'auto' ? clues : manualClues;
    if (!currentGrid) return;
    
    const cellSize = 36;
    const rows = currentGrid.length;
    const cols = currentGrid[0].length;
    const gridPadding = 40;
    const cluesPadding = 40;
    const lineHeight = 18;
    const clueColumnWidth = 300;
    const titleHeight = 60;
    const clueGap = 6;
    const gridWidth = cols * cellSize;
    const gridHeight = rows * cellSize;
    
    const acrossCluesText = currentClues.across.map(c => `${c.number}. ${c.clue || '(No clue)'}`);
    const downCluesText = currentClues.down.map(c => `${c.number}. ${c.clue || '(No clue)'}`);
    
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '13px Arial';
    
    const calculateWrappedHeight = (textArray, maxWidth, ctx) => {
      let totalHeight = 0;
      for (const text of textArray) {
        const words = text.split(' ');
        let line = '', lines = 1;
        for (const word of words) {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > maxWidth - 20) { lines++; line = word + ' '; }
          else line = testLine;
        }
        totalHeight += (lines * lineHeight) + clueGap;
      }
      return totalHeight;
    };
    
    const acrossHeight = calculateWrappedHeight(acrossCluesText, clueColumnWidth, tempCtx) + 35;
    const downHeight = calculateWrappedHeight(downCluesText, clueColumnWidth, tempCtx) + 35;
    const cluesContentHeight = Math.max(acrossHeight, downHeight);
    const totalContentHeight = Math.max(gridHeight, cluesContentHeight);
    const totalWidth = gridPadding + gridWidth + cluesPadding + clueColumnWidth + cluesPadding + clueColumnWidth + gridPadding;
    const totalHeight = titleHeight + totalContentHeight + gridPadding + 20;
    
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CROSSWORD PUZZLE', totalWidth / 2, titleHeight / 2 + 10);
    
    const gridStartX = gridPadding;
    const gridStartY = titleHeight;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gridStartX + c * cellSize;
        const y = gridStartY + r * cellSize;
        const cell = currentGrid[r][c];
        if (cell === '#') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellSize, cellSize);
          const num = getNumberForCell(r, c, currentClues);
          if (num) {
            ctx.fillStyle = '#334155';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(num.toString(), x + 3, y + 2);
          }
        }
      }
    }
    
    const drawWrappedText = (text, x, startY, maxWidth) => {
      const words = text.split(' ');
      let line = '', currentY = startY;
      ctx.font = '13px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), x, currentY);
          line = words[i] + ' ';
          currentY += lineHeight;
        } else line = testLine;
      }
      ctx.fillText(line.trim(), x, currentY);
      return currentY + lineHeight;
    };
    
    const acrossStartX = gridStartX + gridWidth + cluesPadding;
    let acrossY = gridStartY;
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('ACROSS', acrossStartX, acrossY);
    acrossY += 28;
    ctx.fillStyle = '#334155';
    for (const clue of acrossCluesText) { acrossY = drawWrappedText(clue, acrossStartX, acrossY, clueColumnWidth - 10); acrossY += clueGap; }
    
    const downStartX = acrossStartX + clueColumnWidth + cluesPadding;
    let downY = gridStartY;
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textBaseline = 'top';
    ctx.fillText('DOWN', downStartX, downY);
    downY += 28;
    ctx.fillStyle = '#334155';
    for (const clue of downCluesText) { downY = drawWrappedText(clue, downStartX, downY, clueColumnWidth - 10); downY += clueGap; }
    
    const imageUrl = canvas.toDataURL('image/png');
    const imageLink = document.createElement('a');
    imageLink.href = imageUrl;
    imageLink.download = 'crossword-puzzle.png';
    imageLink.click();
    
    setTimeout(() => {
      let answerText = 'CROSSWORD ANSWER KEY\n' + '='.repeat(30) + '\n\nACROSS\n';
      currentClues.across.forEach(c => {
        const len = c.length || c.word?.length || 0;
        let word = '';
        for (let i = 0; i < len; i++) { const row = c.row, col = c.col + i; if (currentGrid[row] && currentGrid[row][col] && currentGrid[row][col] !== '#') word += currentGrid[row][col] || '_'; }
        if (!word && c.word) word = c.word;
        answerText += `${c.number}. ${word}\n`;
      });
      answerText += '\nDOWN\n';
      currentClues.down.forEach(c => {
        const len = c.length || c.word?.length || 0;
        let word = '';
        for (let i = 0; i < len; i++) { const row = c.row + i, col = c.col; if (currentGrid[row] && currentGrid[row][col] && currentGrid[row][col] !== '#') word += currentGrid[row][col] || '_'; }
        if (!word && c.word) word = c.word;
        answerText += `${c.number}. ${word}\n`;
      });
      const blob = new Blob([answerText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crossword-answers.txt';
      a.click();
      URL.revokeObjectURL(url);
    }, 500);
  };

  const getNumberForCell = (r, c, clueSet = clues) => {
    const across = clueSet.across.find(cl => cl.row === r && cl.col === c);
    const down = clueSet.down.find(cl => cl.row === r && cl.col === c);
    return across?.number || down?.number || null;
  };

  const initializeManualGrid = useCallback((layoutIdx = currentLayoutIndex, layoutList = layouts) => {
    if (!layoutList[layoutIdx]) return;
    const layout = layoutList[layoutIdx].grid;
    const rows = layout.length;
    const cols = layout[0].length;
    const newGrid = Array(rows).fill(null).map((_, r) => Array(cols).fill(null).map((_, c) => layout[r][c] === '#' ? '#' : ''));
    setManualGrid(newGrid);
    setCurrentLayoutIndex(layoutIdx);
    const slots = findSlots(layout);
    const numbered = [];
    const numberMap = new Map();
    let currentNumber = 1;
    const sortedSlots = [...slots].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    for (const slot of sortedSlots) {
      const key = `${slot.row},${slot.col}`;
      if (!numberMap.has(key)) numberMap.set(key, currentNumber++);
      numbered.push({ number: numberMap.get(key), direction: slot.direction, word: '', clue: '', row: slot.row, col: slot.col, length: slot.length });
    }
    setManualClues({ across: numbered.filter(n => n.direction === 'across'), down: numbered.filter(n => n.direction === 'down') });
    setSelectedCell(null);
  }, [currentLayoutIndex, layouts]);

  const handleCellClick = (r, c) => {
    if (manualGrid[r][c] === '#') return;
    const layout = layouts[currentLayoutIndex]?.grid;
    if (!layout) return;
    const slots = findSlots(layout);
    const acrossSlot = slots.find(s => s.direction === 'across' && s.row === r && c >= s.col && c < s.col + s.length);
    const downSlot = slots.find(s => s.direction === 'down' && s.col === c && r >= s.row && r < s.row + s.length);
    if (selectedCell?.row === r && selectedCell?.col === c) {
      if (selectedDirection === 'across' && downSlot) setSelectedDirection('down');
      else if (selectedDirection === 'down' && acrossSlot) setSelectedDirection('across');
    } else {
      setSelectedCell({ row: r, col: c });
      if (acrossSlot) setSelectedDirection('across');
      else if (downSlot) setSelectedDirection('down');
    }
  };

  const isFormElement = (el) => {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return ['input', 'textarea', 'select', 'button'].includes(tag) || el.isContentEditable;
  };

  const parseWordListInput = (inputText) => inputText
    .split(',')
    .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
    .filter(Boolean);

  const handleKeyDown = (e) => {
    if (showDictionary || showRequiredModal || showLayoutModal) return;
    if (isFormElement(e.target)) return;
    if (editingClue) return;
    if (!selectedCell || !manualGrid) return;
    const { row, col } = selectedCell;
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newGrid = manualGrid.map(r => [...r]);
      newGrid[row][col] = '';
      setManualGrid(newGrid);
      if (selectedDirection === 'across' && col > 0 && manualGrid[row][col - 1] !== '#') setSelectedCell({ row, col: col - 1 });
      else if (selectedDirection === 'down' && row > 0 && manualGrid[row - 1][col] !== '#') setSelectedCell({ row: row - 1, col });
      return;
    }
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const newGrid = manualGrid.map(r => [...r]);
      newGrid[row][col] = e.key.toUpperCase();
      setManualGrid(newGrid);
      if (selectedDirection === 'across' && col < manualGrid[0].length - 1 && manualGrid[row][col + 1] !== '#') setSelectedCell({ row, col: col + 1 });
      else if (selectedDirection === 'down' && row < manualGrid.length - 1 && manualGrid[row + 1][col] !== '#') setSelectedCell({ row: row + 1, col });
    }
    if (e.key === 'ArrowRight' && col < manualGrid[0].length - 1 && manualGrid[row][col + 1] !== '#') { setSelectedCell({ row, col: col + 1 }); setSelectedDirection('across'); }
    else if (e.key === 'ArrowLeft' && col > 0 && manualGrid[row][col - 1] !== '#') { setSelectedCell({ row, col: col - 1 }); setSelectedDirection('across'); }
    else if (e.key === 'ArrowDown' && row < manualGrid.length - 1 && manualGrid[row + 1][col] !== '#') { setSelectedCell({ row: row + 1, col }); setSelectedDirection('down'); }
    else if (e.key === 'ArrowUp' && row > 0 && manualGrid[row - 1][col] !== '#') { setSelectedCell({ row: row - 1, col }); setSelectedDirection('down'); }
  };

  const getCurrentWord = () => {
    if (!selectedCell || !manualGrid) return { word: '', slot: null };
    const layout = layouts[currentLayoutIndex]?.grid;
    if (!layout) return { word: '', slot: null };
    const slots = findSlots(layout);
    const slot = slots.find(s => {
      if (s.direction !== selectedDirection) return false;
      if (s.direction === 'across') return s.row === selectedCell.row && selectedCell.col >= s.col && selectedCell.col < s.col + s.length;
      return s.col === selectedCell.col && selectedCell.row >= s.row && selectedCell.row < s.row + s.length;
    });
    if (!slot) return { word: '', slot: null };
    let word = '';
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      word += manualGrid[r][c] || '_';
    }
    return { word, slot };
  };

  const getClueForCurrentSlot = () => {
    const { slot } = getCurrentWord();
    if (!slot) return null;
    const clueList = slot.direction === 'across' ? manualClues.across : manualClues.down;
    return clueList.find(c => c.row === slot.row && c.col === slot.col);
  };

  const updateClue = (clueText) => {
    const { slot } = getCurrentWord();
    if (!slot) return;
    const direction = slot.direction;
    const clueList = direction === 'across' ? [...manualClues.across] : [...manualClues.down];
    const clueIndex = clueList.findIndex(c => c.row === slot.row && c.col === slot.col);
    if (clueIndex !== -1) {
      clueList[clueIndex] = { ...clueList[clueIndex], clue: clueText };
      setManualClues({ ...manualClues, [direction]: clueList });
    }
    setEditingClue(null);
    setClueInput('');
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const findSuggestionsForSlot = () => {
    const { word, slot } = getCurrentWord();
    if (!slot || words.length === 0) return [];

    const pattern = word.replace(/_/g, '.');
    const regex = new RegExp(`^${pattern}$`, 'i');

    // Step 1: find all matches
    const matches = words.filter(
      w => w.word.length === slot.length && regex.test(w.word)
    );

    if (matches.length === 0) return [];

    // 🔀 Randomize matches first
    const shuffledMatches = shuffle(matches);

    // Step 2: group by Word (already randomized)
    const byWord = shuffledMatches.reduce((acc, item) => {
      if (!acc[item.word]) acc[item.word] = [];
      acc[item.word].push(item);
      return acc;
    }, {});

    const uniqueWords = Object.keys(byWord);

    // Step 3: decision logic
    if (uniqueWords.length === 1) {
      // One word → show all clues (already randomized)
      return shuffle(byWord[uniqueWords[0]]);
    }

    // Multiple words → one random clue per word
    return shuffle(
      uniqueWords.map(word => {
        const clues = byWord[word];
        return clues[Math.floor(Math.random() * clues.length)];
      })
    ).slice(0, 10);

  };


  const applySuggestion = (suggestion) => {
    const { slot } = getCurrentWord();
    if (!slot) return;
    const newGrid = manualGrid.map(r => [...r]);
    for (let i = 0; i < suggestion.word.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      newGrid[r][c] = suggestion.word[i];
    }
    setManualGrid(newGrid);
    const direction = slot.direction;
    const clueList = direction === 'across' ? [...manualClues.across] : [...manualClues.down];
    const clueIndex = clueList.findIndex(c => c.row === slot.row && c.col === slot.col);
    if (clueIndex !== -1) {
      clueList[clueIndex] = { ...clueList[clueIndex], clue: suggestion.clue, word: suggestion.word };
      setManualClues({ ...manualClues, [direction]: clueList });
    }
    setShowSuggestions(false);
  };

  const isInCurrentWord = (r, c) => {
    if (!selectedCell) return false;
    const { slot } = getCurrentWord();
    if (!slot) return false;
    if (slot.direction === 'across') return r === slot.row && c >= slot.col && c < slot.col + slot.length;
    return c === slot.col && r >= slot.row && r < slot.row + slot.length;
  };

  // ============ PLAY MODE FUNCTIONS ============
  
  const startPlayMode = (sourceGrid, sourceClues) => {
    if (!sourceGrid || !sourceClues) return;
    
    // Create empty play grid (keep structure, clear letters)
    const emptyGrid = sourceGrid.map(row => 
      row.map(cell => cell === '#' ? '#' : '')
    );
    
    // Store the answers
    setPlayAnswers(sourceGrid);
    setPlayGrid(emptyGrid);
    setPlayClues(sourceClues);
    setPlaySelectedCell(null);
    setPlayDirection('across');
    setPlayComplete(false);
    setRevealedCells(new Set());
    setPlayTimer(0);
    setPlayTimerActive(true);
    setActiveTab('play');
  };
  
  const handlePlayCellClick = (r, c) => {
    if (!playGrid || playGrid[r][c] === '#') return;
    
    if (playSelectedCell?.row === r && playSelectedCell?.col === c) {
      setPlayDirection(prev => prev === 'across' ? 'down' : 'across');
    } else {
      setPlaySelectedCell({ row: r, col: c });
    }
  };
  
  const getPlayCurrentSlot = () => {
    if (!playSelectedCell || !playGrid) return null;
    const { row, col } = playSelectedCell;
    
    // Find the slot containing this cell
    const layout = playGrid.map(r => r.map(c => c === '#' ? '#' : '.'));
    const slots = findSlots(layout);
    
    return slots.find(s => {
      if (s.direction !== playDirection) return false;
      if (s.direction === 'across') {
        return s.row === row && col >= s.col && col < s.col + s.length;
      }
      return s.col === col && row >= s.row && row < s.row + s.length;
    });
  };
  
  const isInPlayCurrentWord = (r, c) => {
    const slot = getPlayCurrentSlot();
    if (!slot) return false;
    if (slot.direction === 'across') {
      return r === slot.row && c >= slot.col && c < slot.col + slot.length;
    }
    return c === slot.col && r >= slot.row && r < slot.row + slot.length;
  };
  
  const handlePlayKeyDown = (e) => {
    if (showDictionary || showRequiredModal || showLayoutModal) return;
    if (isFormElement(e.target)) return;
    if (activeTab !== 'play' || !playSelectedCell || !playGrid) return;
    
    const { row, col } = playSelectedCell;
    
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newGrid = playGrid.map(r => [...r]);
      newGrid[row][col] = '';
      setPlayGrid(newGrid);
      
      // Move to previous cell
      if (playDirection === 'across' && col > 0 && playGrid[row][col - 1] !== '#') {
        setPlaySelectedCell({ row, col: col - 1 });
      } else if (playDirection === 'down' && row > 0 && playGrid[row - 1][col] !== '#') {
        setPlaySelectedCell({ row: row - 1, col });
      }
      return;
    }
    
    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const newGrid = playGrid.map(r => [...r]);
      newGrid[row][col] = e.key.toUpperCase();
      setPlayGrid(newGrid);
      
      // Move to next cell
      if (playDirection === 'across' && col < playGrid[0].length - 1 && playGrid[row][col + 1] !== '#') {
        setPlaySelectedCell({ row, col: col + 1 });
      } else if (playDirection === 'down' && row < playGrid.length - 1 && playGrid[row + 1][col] !== '#') {
        setPlaySelectedCell({ row: row + 1, col });
      }
      
      // Check if puzzle is complete (even if auto check is off, to stop timer when finished)
      checkPlayComplete(newGrid);
    }
    
    // Arrow key navigation
    if (e.key === 'ArrowRight' && col < playGrid[0].length - 1 && playGrid[row][col + 1] !== '#') {
      setPlaySelectedCell({ row, col: col + 1 });
      setPlayDirection('across');
    } else if (e.key === 'ArrowLeft' && col > 0 && playGrid[row][col - 1] !== '#') {
      setPlaySelectedCell({ row, col: col - 1 });
      setPlayDirection('across');
    } else if (e.key === 'ArrowDown' && row < playGrid.length - 1 && playGrid[row + 1][col] !== '#') {
      setPlaySelectedCell({ row: row + 1, col });
      setPlayDirection('down');
    } else if (e.key === 'ArrowUp' && row > 0 && playGrid[row - 1][col] !== '#') {
      setPlaySelectedCell({ row: row - 1, col });
      setPlayDirection('down');
    }
  };
  
  const checkPlayComplete = (currentGrid) => {
    if (!playAnswers) return;
    
    for (let r = 0; r < currentGrid.length; r++) {
      for (let c = 0; c < currentGrid[r].length; c++) {
        if (currentGrid[r][c] !== '#' && currentGrid[r][c] !== playAnswers[r][c]) {
          return;
        }
      }
    }
    
    setPlayComplete(true);
    setPlayTimerActive(false);
  };
  
  const revealCell = () => {
    if (!playSelectedCell || !playAnswers) return;
    const { row, col } = playSelectedCell;
    
    const newGrid = playGrid.map(r => [...r]);
    newGrid[row][col] = playAnswers[row][col];
    setPlayGrid(newGrid);
    
    setRevealedCells(prev => new Set([...prev, `${row},${col}`]));
    checkPlayComplete(newGrid);
  };
  
  const revealWord = () => {
    const slot = getPlayCurrentSlot();
    if (!slot || !playAnswers) return;
    
    const newGrid = playGrid.map(r => [...r]);
    const newRevealed = new Set(revealedCells);
    
    for (let i = 0; i < slot.length; i++) {
      const r = slot.direction === 'across' ? slot.row : slot.row + i;
      const c = slot.direction === 'across' ? slot.col + i : slot.col;
      newGrid[r][c] = playAnswers[r][c];
      newRevealed.add(`${r},${c}`);
    }
    
    setPlayGrid(newGrid);
    setRevealedCells(newRevealed);
    checkPlayComplete(newGrid);
  };
  
  const revealAll = () => {
    if (!playAnswers) return;
    setPlayGrid(playAnswers.map(r => [...r]));
    setPlayComplete(true);
    setPlayTimerActive(false);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // ============ DICTIONARY FUNCTIONS ============
  
  const addWordToDictionary = () => {
    if (!newWord.trim() || !newClue.trim()) return;
    
    const word = newWord.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const clue = newClue.trim();
    
    if (!word) return;
    
    // Check if word already exists
    const exists = words.some(w => w.word === word);
    if (exists) {
      setError('Word already exists in dictionary');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setWords(prev => [...prev, { date: new Date().toISOString().split('T')[0], word, clue }]);
    setNewWord('');
    setNewClue('');
    setProgress('Word added to dictionary!');
    setTimeout(() => setProgress(''), 3000);
  };
  
  const deleteWordFromDictionary = (index) => {
    setWords(prev => prev.filter((_, i) => i !== index));
  };
  
  const startEditWord = (index) => {
    setEditingWordIndex(index);
    setEditWord(words[index].word);
    setEditClue(words[index].clue);
  };
  
  const saveEditWord = () => {
    if (editingWordIndex === null) return;
    
    const word = editWord.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const clue = editClue.trim();
    
    if (!word || !clue) return;
    
    setWords(prev => prev.map((w, i) => 
      i === editingWordIndex ? { ...w, word, clue } : w
    ));
    
    setEditingWordIndex(null);
    setEditWord('');
    setEditClue('');
  };
  
  const exportDictionary = () => {
    let csv = 'Date,Word,Clue\n';
    words.forEach(w => {
      const clue = w.clue.includes(',') ? `"${w.clue}"` : w.clue;
      csv += `${w.date || ''},${w.word},${clue}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crossword-dictionary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const getFilteredWords = () => {
    if (!dictionarySearch.trim()) return words;
    const search = dictionarySearch.toLowerCase();
    return words.filter(w => 
      w.word.toLowerCase().includes(search) || 
      w.clue.toLowerCase().includes(search)
    );
  };

  // Timer effect
  React.useEffect(() => {
    if (playTimerActive) {
      playTimerRef.current = setInterval(() => {
        setPlayTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(playTimerRef.current);
    }
    return () => clearInterval(playTimerRef.current);
  }, [playTimerActive]);

  React.useEffect(() => {
    let cancelled = false;
    const loadDefaultCSV = async () => {
      setCsvLoading(true);
      setProgress('Loading CSV...');
      try {
        const response = await fetch('/crosswords.csv');
        if (response.ok) {
          const text = await response.text();
          const parsed = parseCSV(text);
          if (!cancelled && !tagalogMode && parsed.length > 0) setWords(parsed);
        }
      } catch (err) { console.log('No default crosswords.csv found'); }
      if (!cancelled) {
        setCsvLoading(false);
        setProgress('');
      }
    };
    if (!tagalogMode && words.length === 0) loadDefaultCSV();
    return () => { cancelled = true; };
  }, [tagalogMode, words.length]);

  React.useEffect(() => {
    let cancelled = false;

    const loadTagalogList = async () => {
      setCsvLoading(true);
      setProgress('Loading Tagalog word list...');
      try {
        const response = await fetch('/tagalogcrosswordfinal_test.csv');
        if (!response.ok) throw new Error('Tagalog crossword CSV not found');
        const text = await response.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) throw new Error('No Tagalog entries found');
        if (cancelled) return;
        setWords(parsed);
        setError('');
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setTagalogMode(false);
          setError('Unable to load Tagalog crossword list.');
          if (previousWordsRef.current) {
            setWords(previousWordsRef.current);
            previousWordsRef.current = null;
          }
        }
      } finally {
        if (!cancelled) {
          setCsvLoading(false);
          setProgress('');
        }
      }
    };

    if (tagalogMode) {
      previousWordsRef.current = words;
      loadTagalogList();
    } else if (previousWordsRef.current) {
      setWords(previousWordsRef.current);
      previousWordsRef.current = null;
    }

    return () => { cancelled = true; };
  }, [tagalogMode]);

  React.useEffect(() => {
    if (activeTab === 'create' && !manualGrid) initializeManualGrid();
  }, [activeTab, manualGrid, initializeManualGrid]);

  React.useEffect(() => {
    if (showSuggestions && words.length > 0) setSuggestions(findSuggestionsForSlot());
  }, [selectedCell, selectedDirection, manualGrid, showSuggestions]);

  const layoutIndexForTab = Math.min(activeTab === 'create' ? currentLayoutIndex : selectedLayoutIndex, Math.max(layouts.length - 1, 0));

  return (
    <div className={`min-h-screen p-4 md:p-8 ${tagalogMode ? 'bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 tagalog-theme' : 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'}`} onKeyDown={activeTab === 'play' ? handlePlayKeyDown : handleKeyDown} tabIndex={0}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 mb-2 tracking-tight">Crossword Studio</h1>
          <p className={`${tagalogMode ? 'text-red-300/70' : 'text-purple-300/70'} text-sm tracking-widest uppercase`}>Generate • Create • Play</p>
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={() => setTagalogMode(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 border shadow-lg ${tagalogMode ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white border-red-500 shadow-red-500/30' : 'bg-white/10 text-purple-200 border-purple-500/30 hover:bg-white/20'}`}
          >
            <Languages size={18} />
            Tagalog Mode {tagalogMode ? 'On' : 'Off'}
          </button>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className={`bg-black/30 backdrop-blur-sm rounded-2xl p-1.5 border ${tagalogMode ? 'border-red-500/20' : 'border-purple-500/20'} flex gap-1 flex-wrap justify-center`}>
            <button onClick={() => setActiveTab('auto')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'auto' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30' : 'text-purple-300 hover:text-white hover:bg-white/10'}`}>
              <Puzzle size={18} />Generate
            </button>
            <button onClick={() => setActiveTab('create')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'create' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30' : 'text-purple-300 hover:text-white hover:bg-white/10'}`}>
              <PenTool size={18} />Create
            </button>
            <button onClick={() => setActiveTab('play')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 ${activeTab === 'play' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/30' : 'text-purple-300 hover:text-white hover:bg-white/10'}`}>
              <Play size={18} />Play
            </button>
            <button onClick={() => setShowDictionary(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 text-purple-300 hover:text-white hover:bg-white/10">
              <BookOpen size={18} />Dictionary
            </button>
          </div>
        </div>
        
        {activeTab !== 'play' ? (
        <div className={`bg-black/40 backdrop-blur-md rounded-2xl border ${tagalogMode ? 'border-red-500/20' : 'border-purple-500/20'} p-6 mb-6 overflow-visible`}>
          {csvLoading && (
            <div className="mb-4">
              <div className="text-emerald-200 text-sm font-semibold">Loading CSV...</div>
              <div className="mt-2 w-full bg-white/10 rounded-lg overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 animate-pulse" />
              </div>
            </div>
          )}
          <div className="flex gap-3 flex-wrap items-center relative">
            <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl cursor-pointer hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/20 font-medium">
              <Upload size={18} />Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            
            <div className="relative">
              <button onClick={() => setShowLayoutSelector(!showLayoutSelector)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 font-medium">
                <Grid3X3 size={18} />{layouts[layoutIndexForTab]?.name}
              </button>
            </div>

            {activeTab === 'play' && (
            <div className="flex items-center gap-2 text-sm text-purple-100 bg-white/5 border border-purple-500/30 px-3 py-2 rounded-xl">
              <span className="text-xs uppercase tracking-wide text-purple-300/80">Difficulty</span>
              <div className="flex flex-wrap gap-1">
                  {['random','easy','fair','moderate','hard','difficult'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setDifficultyChoice(opt)}
                      className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition ${
                        difficultyChoice === opt ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200 hover:bg-white/10'
                      }`}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

          
            
            {activeTab === 'auto' && !isGenerating && (
              <button onClick={() => { setRequiredAction('auto'); setShowRequiredModal(true); }} disabled={words.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 font-medium">
                <RefreshCw size={18} />Generate
              </button>
            )}
            
            {activeTab === 'auto' && isGenerating && (
              <button onClick={cancelGeneration} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl hover:from-rose-500 hover:to-red-500 transition-all duration-300 shadow-lg shadow-rose-500/20 font-medium">
                <X size={18} />Stop
              </button>
            )}
            
            {activeTab === 'create' && (
              <button onClick={() => initializeManualGrid(currentLayoutIndex)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl hover:from-rose-500 hover:to-pink-500 transition-all duration-300 shadow-lg shadow-rose-500/20 font-medium">
                <RefreshCw size={18} />Clear Grid
              </button>
            )}
            
            {activeTab === 'create' && !isGenerating && (
              <button onClick={handleManualGenerate} disabled={words.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 font-medium">
                <RefreshCw size={18} />Generate Remaining
              </button>
            )}
            
            {activeTab === 'create' && isGenerating && (
              <button onClick={cancelGeneration} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl hover:from-rose-500 hover:to-red-500 transition-all duration-300 shadow-lg shadow-rose-500/20 font-medium">
                <X size={18} />Stop
              </button>
            )}
            
            {activeTab === 'auto' && grid && (
              <button onClick={() => startPlayMode(grid, clues)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/20 font-medium">
                <Play size={18} />Play This Puzzle
              </button>
            )}
            
            {activeTab === 'create' && (
              <div className="w-full flex flex-col gap-2 md:max-w-3xl">
                <div className="text-sm text-purple-200 font-semibold">Specific words for Create</div>
                <div className="text-xs text-purple-300/80">
                  Current Layout: {layouts[currentLayoutIndex]?.grid.length}x{layouts[currentLayoutIndex]?.grid[0]?.length} · Max words: {findSlots(layouts[currentLayoutIndex]?.grid || []).length} · Lengths: {Object.entries(getLayoutStats(layouts[currentLayoutIndex]?.grid || []).lengthCounts || {}).sort((a,b)=>a[0]-b[0]).map(([len,count]) => `${len}(${count})`).join(', ')}
                </div>
                <div className="flex flex-wrap gap-1 items-center text-[11px] text-purple-200">
                  Difficulty:
                  <div className="flex flex-wrap gap-1">
                  {['random','easy','fair','moderate','hard','difficult'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setDifficultyChoice(opt)}
                      className={`px-2 py-1 rounded-md border text-[11px] font-semibold transition ${
                        difficultyChoice === opt ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200 hover:bg-white/5'
                        }`}
                      >
                        {opt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={manualRequiredInput}
                  onChange={(e) => setManualRequiredInput(e.target.value)}
                  placeholder="Comma-separated words to force into the puzzle (optional)"
                  className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-3 py-2 text-white placeholder-purple-300/60 focus:outline-none focus:border-amber-500/50"
                  rows={2}
                />
                <div className="flex gap-3 items-center flex-wrap">
                  <span className="text-xs text-purple-300/70">Placement mode:</span>
                  <label className={`px-3 py-1.5 rounded-lg border cursor-pointer text-sm ${manualRequiredMode === 'anchor' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200 hover:bg-white/10'}`}>
                    <input type="radio" className="hidden" checked={manualRequiredMode === 'anchor'} onChange={() => setManualRequiredMode('anchor')} />
                    Place first
                  </label>
                  <label className={`px-3 py-1.5 rounded-lg border cursor-pointer text-sm ${manualRequiredMode === 'opportunistic' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200 hover:bg-white/10'}`}>
                    <input type="radio" className="hidden" checked={manualRequiredMode === 'opportunistic'} onChange={() => setManualRequiredMode('opportunistic')} />
                    Fill flexibly
                  </label>
                  <span className="text-xs text-purple-400">(leave empty to generate normally)</span>
                </div>
              </div>
            )}
            
            <button onClick={downloadPuzzle} disabled={activeTab === 'auto' ? !grid : !manualGrid} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20 font-medium">
              <Download size={18} />Download
            </button>
            
            <button onClick={exportPuzzle} disabled={activeTab === 'auto' ? !grid : !manualGrid} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 font-medium">
              <Save size={18} />Export
            </button>
            
            <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl cursor-pointer hover:from-teal-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-teal-500/20 font-medium">
              <FolderOpen size={18} />Import
              <input type="file" accept=".json" onChange={(e) => { importPuzzle(e); }} ref={puzzleFileInputRef} className="hidden" />
            </label>
            
            <button onClick={() => setDebugMode(!debugMode)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${debugMode ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white/10 text-purple-300 hover:bg-white/20'}`}>
              <Bug size={18} />Debug
            </button>
          </div>
          
          
          <div className="mt-4 text-purple-300/60 text-sm">CSV Format: Date,Word,Clue • Place <code className="bg-white/10 px-1 rounded">crosswords.csv</code> in public folder for auto-load</div>
          
          {isGenerating && <div className="mt-4 bg-purple-500/20 border border-purple-500/30 text-purple-200 px-4 py-3 rounded-xl flex items-center gap-3"><div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-300 border-t-transparent"></div>{progress}</div>}
          {!isGenerating && error && <div className="mt-4 bg-rose-500/20 border border-rose-500/30 text-rose-200 px-4 py-3 rounded-xl">{error}</div>}
          {!isGenerating && progress && <div className="mt-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl">{progress}</div>}
          {words.length > 0 && !isGenerating && <div className="mt-4 text-purple-300/80 text-sm flex items-center gap-2"><Check size={16} className="text-emerald-400" />Loaded {words.length} words from CSV</div>}
        </div>
        ) : (
        <div className={`bg-black/40 backdrop-blur-md rounded-2xl border ${tagalogMode ? 'border-red-500/20' : 'border-purple-500/20'} p-6 mb-6 overflow-visible`}>
          <div className="flex gap-3 flex-wrap items-center relative">
            <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl cursor-pointer hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/20 font-medium">
              <Upload size={18} />Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            
            <div className="relative">
              <button onClick={() => setShowLayoutSelector(!showLayoutSelector)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 font-medium">
                <Grid3X3 size={18} />{layouts[layoutIndexForTab]?.name}
              </button>
            </div>
            
            {!isGenerating && (
              <button
                onClick={() => {
                  if (activeTab === 'play') {
                    generatePuzzle(words, selectedLayoutIndex, true, requiredWords, requiredMode);
                  } else {
                    setRequiredAction('play');
                    setShowRequiredModal(true);
                  }
                }}
                disabled={words.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 font-medium"
              >
                <RefreshCw size={18} />Generate &amp; Play
              </button>
            )}
            
            {isGenerating && (
              <button onClick={cancelGeneration} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl hover:from-rose-500 hover:to-red-500 transition-all duration-300 shadow-lg shadow-rose-500/20 font-medium">
                <X size={18} />Stop
              </button>
            )}
            
            {latestGrid && latestClues && !isGenerating && (
              <button onClick={() => startPlayMode(latestGrid, latestClues)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/20 font-medium">
                <Play size={18} />Play Latest Puzzle
              </button>
            )}
            
            <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl cursor-pointer hover:from-teal-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-teal-500/20 font-medium">
              <FolderOpen size={18} />Import to Play
              <input type="file" accept=".json" onChange={(e) => { importPuzzlePlay(e); }} ref={puzzleFileInputRef} className="hidden" />
            </label>
            
            <button onClick={() => setDebugMode(!debugMode)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${debugMode ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white/10 text-purple-300 hover:bg-white/20'}`}>
              <Bug size={18} />Debug
            </button>
          </div>
          
          <div className="mt-4 text-purple-300/60 text-sm">Stay in Play mode: upload a CSV, pick a layout, then generate to jump straight into playing, or import a saved puzzle JSON.</div>
          
          {isGenerating && <div className="mt-4 bg-purple-500/20 border border-purple-500/30 text-purple-200 px-4 py-3 rounded-xl flex items-center gap-3"><div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-300 border-t-transparent"></div>{progress}</div>}
          {!isGenerating && error && <div className="mt-4 bg-rose-500/20 border border-rose-500/30 text-rose-200 px-4 py-3 rounded-xl">{error}</div>}
          {!isGenerating && progress && <div className="mt-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-4 py-3 rounded-xl">{progress}</div>}
          {words.length > 0 && !isGenerating && <div className="mt-4 text-purple-300/80 text-sm flex items-center gap-2"><Check size={16} className="text-emerald-400" />Loaded {words.length} words from CSV</div>}
        </div>
        )}
        
        {debugMode && debugLog.length > 0 && (
          <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-purple-500/20 p-4 mb-6 font-mono text-xs max-h-64 overflow-y-auto">
            <div className="flex justify-between items-center mb-3"><h2 className="text-amber-400 font-bold">Debug Log</h2><button onClick={() => setDebugLog([])} className="px-3 py-1 bg-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/50 transition">Clear</button></div>
            {debugLog.map((line, i) => <div key={i} className="text-emerald-400/80 mb-1">{line}</div>)}
          </div>
        )}
        
        {activeTab === 'auto' && grid && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-amber-300 flex items-center gap-2"><Puzzle size={20} />Puzzle Grid</h2>
                {difficultyInfo?.label && (
                  <span className="px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 font-semibold text-base text-purple-100">
                    Difficulty: <span className={`${difficultyColorClass(difficultyInfo.label)} font-bold`}>{difficultyInfo.label}</span>{difficultyInfo.score !== null ? ` (${Math.round(difficultyInfo.score)})` : ''}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto"><div className="inline-block">
                {grid.map((row, r) => <div key={r} className="flex">{row.map((cell, c) => <div key={c} className={`w-9 h-9 md:w-10 md:h-10 border border-purple-500/30 flex items-center justify-center text-sm font-bold relative transition-colors ${cell === '#' ? 'bg-slate-800' : 'bg-white/95'}`}>{cell !== '#' && getNumberForCell(r, c) && <span className="absolute top-0.5 left-1 text-[10px] text-slate-500 font-medium">{getNumberForCell(r, c)}</span>}{cell !== '#' && cell !== null && <span className="text-slate-800">{cell}</span>}</div>)}</div>)}
              </div></div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6 max-h-[600px] overflow-y-auto">
              <h2 className="text-xl font-bold text-amber-300 mb-4">Clues</h2>
              <div className="mb-6"><h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2"><ChevronRight size={16} />Across</h3>{clues.across.map(clue => <div key={`across-${clue.number}`} className="mb-2 text-sm text-purple-100/80 pl-4 border-l-2 border-purple-500/30"><span className="font-semibold text-amber-300">{clue.number}.</span> {clue.clue}</div>)}</div>
              <div><h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2"><ChevronDown size={16} />Down</h3>{clues.down.map(clue => <div key={`down-${clue.number}`} className="mb-2 text-sm text-purple-100/80 pl-4 border-l-2 border-purple-500/30"><span className="font-semibold text-amber-300">{clue.number}.</span> {clue.clue}</div>)}</div>
            </div>
          </div>
        )}
        
        {activeTab === 'create' && manualGrid && (
          <ManualEditor
            manualGrid={manualGrid}
            manualClues={manualClues}
            selectedCell={selectedCell}
            selectedDirection={selectedDirection}
            handleCellClick={handleCellClick}
            getNumberForCell={getNumberForCell}
            isInCurrentWord={isInCurrentWord}
            getCurrentWord={getCurrentWord}
            getClueForCurrentSlot={getClueForCurrentSlot}
            setSelectedCell={setSelectedCell}
            setSelectedDirection={setSelectedDirection}
            editingClue={editingClue}
            clueInput={clueInput}
            setClueInput={setClueInput}
            updateClue={updateClue}
            setEditingClue={setEditingClue}
            words={words}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            findSuggestionsForSlot={findSuggestionsForSlot}
            applySuggestion={applySuggestion}
            tagalogMode={tagalogMode}
            puzzleDateInfo={puzzleDateInfo}
            getDateInfoForWord={getDateInfoForWord}
            getDateInfoForWordClue={getDateInfoForWordClue}
            failedWord={failedWord}
            highlightedWords={requiredHighlights}
            showRequiredHighlights={showRequiredHighlights}
            setShowRequiredHighlights={setShowRequiredHighlights}
            highlightMissingRequired={highlightMissingRequired}
            setHighlightMissingRequired={setHighlightMissingRequired}
            difficultyInfo={difficultyInfo}
          />
        )}
        
        {activeTab === 'auto' && !grid && !isGenerating && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-12 text-center">
            <Puzzle size={64} className="mx-auto text-purple-500/50 mb-4" />
            <h3 className="text-xl font-bold text-purple-300 mb-2">No Puzzle Yet</h3>
            <p className="text-purple-300/60">Upload a CSV file to generate your crossword puzzle, or import a saved puzzle</p>
          </div>
        )}
        
        {/* PLAY MODE */}
        {activeTab === 'play' && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-purple-100">
            <span className="text-xs uppercase tracking-wide text-purple-300/80">Difficulty</span>
            <div className="flex flex-wrap gap-1">
              {['random','easy','fair','moderate','hard','difficult'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setDifficultyChoice(opt)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition ${
                    difficultyChoice === opt ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200 hover:bg-white/5'
                  }`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="text-xs text-purple-300/70">(applies when you Generate & Play)</span>
          </div>
        )}

        {activeTab === 'play' && playGrid && (
          <PlayView
            playGrid={playGrid}
            playClues={playClues}
            playDirection={playDirection}
            playSelectedCell={playSelectedCell}
            playAnswers={playAnswers}
            playComplete={playComplete}
            playTimer={playTimer}
            playAutoCheck={playAutoCheck}
            revealedCells={revealedCells}
            setPlayAutoCheck={setPlayAutoCheck}
            revealCell={revealCell}
            revealWord={revealWord}
            revealAll={revealAll}
            handlePlayCellClick={handlePlayCellClick}
            isInPlayCurrentWord={isInPlayCurrentWord}
            getNumberForCell={getNumberForCell}
            getPlayCurrentSlot={getPlayCurrentSlot}
            setPlaySelectedCell={setPlaySelectedCell}
            setPlayDirection={setPlayDirection}
            formatTime={formatTime}
            difficultyInfo={difficultyInfo}
          />
        )}
        
        {activeTab === 'play' && !playGrid && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-12 text-center">
            <Play size={64} className="mx-auto text-purple-500/50 mb-4" />
            <h3 className="text-xl font-bold text-purple-300 mb-2">No Puzzle to Play</h3>
            <p className="text-purple-300/70 mb-6">Use the controls above to generate a puzzle in Play mode or import a saved crossword to start immediately.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => generatePuzzle(words, selectedLayoutIndex, true)} disabled={words.length === 0 || isGenerating} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-teal-500 transition disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                Generate &amp; Play
              </button>
              <button onClick={() => puzzleFileInputRef.current?.click()} className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-teal-500 hover:to-cyan-500 transition">
                Import Puzzle
              </button>
            </div>
            <p className="text-purple-300/50 text-sm mt-4">Tip: upload a CSV word list first so we can build a grid for you.</p>
          </div>
        )}
      </div>
      
      <LayoutSelector
        isOpen={showLayoutSelector}
        layouts={layouts}
        activeTab={activeTab}
        layoutIndexForTab={layoutIndexForTab}
        onSelect={handleSelectLayout}
        onClose={() => setShowLayoutSelector(false)}
        onCreateLayout={() => { setShowLayoutSelector(false); openCreateLayoutModal(); }}
        onEditLayout={() => { setShowLayoutSelector(false); openEditLayoutModal(); }}
      />

      <LayoutEditorModal
        isOpen={showLayoutModal}
        onClose={() => { setShowLayoutModal(false); setEditingLayoutIndex(null); }}
        onSave={handleSaveLayout}
        editingLayout={editingLayoutIndex !== null ? layouts[editingLayoutIndex] : null}
        mode={layoutEditorMode}
      />
      
      <RequiredWordsModal
        isOpen={showRequiredModal}
        onClose={() => setShowRequiredModal(false)}
        onConfirm={(words, mode, difficulty) => handleRequiredConfirm(words, mode, difficulty)}
        initialWords={requiredWords}
        stats={{
          rows: layouts[selectedLayoutIndex]?.grid.length || 0,
          cols: layouts[selectedLayoutIndex]?.grid[0]?.length || 0,
          slots: getLayoutStats(layouts[selectedLayoutIndex]?.grid || []).slots || findSlots(layouts[selectedLayoutIndex]?.grid || []).length,
          lengthCounts: getLayoutStats(layouts[selectedLayoutIndex]?.grid || []).lengthCounts || {}
        }}
        modeView={requiredViewMode}
        onModeChange={setRequiredViewMode}
        initialDifficulty={difficultyChoice}
      />
      
      <DictionaryModal
        isOpen={showDictionary}
        onClose={() => setShowDictionary(false)}
        words={words}
        dictionarySearch={dictionarySearch}
        setDictionarySearch={setDictionarySearch}
        newWord={newWord}
        setNewWord={setNewWord}
        newClue={newClue}
        setNewClue={setNewClue}
        addWordToDictionary={addWordToDictionary}
        exportDictionary={exportDictionary}
        getFilteredWords={getFilteredWords}
        editingWordIndex={editingWordIndex}
        setEditingWordIndex={setEditingWordIndex}
        editWord={editWord}
        setEditWord={setEditWord}
        editClue={editClue}
        setEditClue={setEditClue}
        saveEditWord={saveEditWord}
        startEditWord={startEditWord}
        deleteWordFromDictionary={deleteWordFromDictionary}
      />
    </div>
  );
};

export default CrosswordGenerator;
