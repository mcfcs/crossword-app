import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, RefreshCw, Bug, Puzzle, PenTool, Sparkles, X, Check, ChevronRight, ChevronDown, Save, FolderOpen, Grid3X3, Play, BookOpen, Plus, Trash2, Search, Edit3, Trophy, Languages } from './components/Icons';

const LAYOUTS = [
  {
    name: "Classic 15x15",
    grid: [
      "#....#....#....",
      ".....#....#....",
      ".....#....#....",
      "....#....#.....",
      "......##....###",
      "###.....#......",
      "...#......#....", 
      ".....#...#.....",
      "....#......#...",
      "......#.....###",
      "###....##......",
      ".....#....#....",
      "....#....#.....",
      "....#....#.....",
      "....#....#....#"
    ]
  },
  {
    name: "Standard 15x15",
    grid: [
      ".....#....#....",
      ".....#....#....",
      "..........#....",
      "##......##.....",
      "....#..........",
      "......##....###",
      ".....#....#....",
      "...#.......#...",
      "....#....#.....",
      "###....##......",
      "..........#....",
      ".....##......##",
      "....#..........",
      "....#....#.....",
      "....#....#....."
    ]
  },
  {
    name: "Open 15x15",
    grid: [
      "....#.....#....",
      "..........#....",
      "..........#....",
      "...#.....#....#",
      ".....#.....#...",
      "###....#.......",
      "#.....#........",
      "...............",
      "........#.....#",
      ".......#....###",
      "...#.....#.....",
      "#....#.....#...",
      "....#..........",
      "....#..........",
      "....#.....#...."
    ]
  },
  {
    name: "Symmetric 15x15",
    grid: [
      "....#......#...",
      "....#......#...",
      "...........#...",
      "......#...#....",
      ".....#.........",
      "###....##......",
      "....#....#.....",
      "...#.......#...",
      ".....#....#....",
      "......##....###",
      ".........#.....",
      "....#...#......",
      "...#...........",
      "...#......#....",
      "...#......#...."
    ]
  },
  {
    name: "Diamond 15x15",
    grid: [
      "....#.....#....",
      "....#.....#....",
      "....#..........",
      ".....##....#...",
      "##....##......#",
      "............###",
      "...#....##.....",
      "....#.....#....",
      ".....##....#...",
      "###............",
      "#......##....##",
      "...#....##.....",
      "..........#....",
      "....#.....#....",
      "....#.....#...."
    ]
  },
  {
    name: "Mini 5x5 - Corner",
    grid: [
      "#....",
      ".....",
      ".....",
      ".....",
      "....#"
    ]
  },
  {
    name: "Mini 5x5 - Open",
    grid: [
      ".....",
      ".....",
      ".....",
      ".....",
      "....."
    ]
  },
  {
    name: "Mini 5x5 - Cross",
    grid: [
      "#...#",
      ".....",
      ".....",
      ".....",
      "#...#"
    ]
  },
  {
    name: "Mini 5x5 - Steps",
    grid: [
      "##...",
      ".....",
      ".....",
      "...##",
      "...##"
    ]
  },
  {
    name: "Mini 5x5 - Diagonal",
    grid: [
      "#....",
      ".....",
      ".....",
      "....#",
      "...##"
    ]
  }
];

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
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState(0);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [generationCancelled, setGenerationCancelled] = useState(false);
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

  //  =========== CSV PARSING ============
  // Parses CSV text into array of { date, word, clue }
  const parseCSV = (text) => {
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
        const date = parts[0].replace(/"/g, '').trim();
        const word = parts[1].replace(/"/g, '').trim().toUpperCase().replace(/[^A-Z]/g, '');
        const clue = parts[2].replace(/"/g, '').trim();
        if (word && clue) {
          parsed.push({ date, word, clue });
        }
      }
    }
    return parsed.sort((a, b) => b.word.length - a.word.length);
  };

  // ========== CROSSWORD GENERATION ============
  // Finds slots in the layout
  // Returns array of { row, col, length, direction, id }
  // direction is 'across' or 'down'
  // id is a unique identifier for the slot
  // Used by the generator
  // Assumes layout is a 2D array of characters, where '#' is black cell and '.' is white cell
  const findSlots = (layout) => {
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
  
  const generateCrossword = async (wordList, layout, onProgress, shouldCancel) => {
    const slots = findSlots(layout);
    const rows = layout.length;
    const cols = layout[0].length;
    
    if (slots.length === 0) {
      return { grid: null, placements: [], attempts: 0, complete: false };
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
      // Initialize grid
      const grid = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          row.push(layout[r][c] === '#' ? '#' : null);
        }
        grid.push(row);
      }
      
      // Cell-level possibilities
      const cellPossibilities = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (layout[r][c] !== '#') {
            cellPossibilities[`${r},${c}`] = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
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
            if (shouldCancel()) return null; // Check cancellation during propagation
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
          const adjustedEntropy = entropy + Math.random() * 0.001;
          
          if (adjustedEntropy < minEntropy) {
            minEntropy = adjustedEntropy;
            minSlot = slot;
          }
        }
        
        return minSlot;
      };
      
      // Place word
      const placeWord = (slot, word) => {
        const cells = slotCells.get(slot.id);
        for (const cell of cells) {
          grid[cell.r][cell.c] = word[cell.index];
          cellPossibilities[`${cell.r},${cell.c}`] = new Set([word[cell.index]]);
        }
        usedWords.add(word);
        placedSlotIds.add(slot.id);
        
        const wordItem = wordList.find(w => w.word === word) || { word, clue: '' };
        placements.push({ slot, word, clue: wordItem.clue });
      };
      
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
        placedSlotIds.clear();
        for (const id of state.placedSlotIds) placedSlotIds.add(id);
        placements.length = 0;
        placements.push(...state.placements);
      };
      
      // Initial propagation
      const initResult = await propagate();
      if (initResult === null) return null; // Cancelled
      if (initResult === false) {
        return { grid, placements, complete: false, backtracks: 0 };
      }
      
      // Backtracking stack
      const stateStack = [];
      let iterations = 0;
      let backtracks = 0;
      let lastYield = Date.now();
      
      // Main WFC loop
      while (placements.length < slots.length) {
        if (shouldCancel()) return null;
        
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
            return { grid, placements, complete: false, backtracks };
          }
          
          backtracks++;
          const prevState = stateStack.pop();
          restoreState(prevState.state);
          slotPossibilities.get(prevState.slot.id).delete(prevState.triedWord);
          continue;
        }
        
        const possibilities = [...slotPossibilities.get(slot.id)];
        
        if (possibilities.length === 0) {
          if (stateStack.length === 0) {
            return { grid, placements, complete: false, backtracks };
          }
          
          backtracks++;
          const prevState = stateStack.pop();
          restoreState(prevState.state);
          slotPossibilities.get(prevState.slot.id).delete(prevState.triedWord);
          continue;
        }
        
        // Save state
        const savedState = saveState();
        const chosenWord = possibilities[0];
        
        stateStack.push({
          slot,
          triedWord: chosenWord,
          state: savedState
        });
        
        // Place word
        placeWord(slot, chosenWord);
        
        // Propagate
        const propResult = await propagate();
        
        if (propResult === null) return null; // Cancelled
        
        if (propResult === false) {
          backtracks++;
          restoreState(savedState);
          slotPossibilities.get(slot.id).delete(chosenWord);
          stateStack.pop();
        }
      }
      
      const complete = placements.length === slots.length;
      return { grid, placements, complete, backtracks };
    };
    
    // Run attempts
    const startTime = Date.now();
    let attempts = 0;
    let bestResult = null;
    let bestScore = 0;
    
    while (!shouldCancel()) {
      attempts++;
      
      const result = await wfcSolve(startTime, attempts);
      
      if (result === null) break;
      
      if (result.complete) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        onProgress(`Complete! WFC solved in ${elapsed}s (attempt ${attempts}, ${result.backtracks} backtracks)`);
        return { ...result, attempts, complete: true };
      }
      
      if (result.placements.length > bestScore) {
        bestScore = result.placements.length;
        bestResult = {
          grid: result.grid.map(row => [...row]),
          placements: [...result.placements],
          backtracks: result.backtracks
        };
      }
      
      // Yield between attempts
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return {
      grid: bestResult?.grid,
      placements: bestResult?.placements || [],
      attempts,
      complete: false
    };
  };

  const assignNumbers = (placements) => {
    const numbered = [];
    const numberMap = new Map();
    let currentNumber = 1;
    const positions = placements.map(p => ({ row: p.slot.row, col: p.slot.col, direction: p.slot.direction, word: p.word, clue: p.clue, length: p.slot.length })).sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    for (const pos of positions) {
      const key = `${pos.row},${pos.col}`;
      if (!numberMap.has(key)) numberMap.set(key, currentNumber++);
      numbered.push({ number: numberMap.get(key), direction: pos.direction, word: pos.word, clue: pos.clue, row: pos.row, col: pos.col, length: pos.length });
    }
    return numbered;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseCSV(event.target.result);
        if (parsed.length === 0) { setError('No valid words found in CSV'); return; }
        setWords(parsed);
        setError('');
        if (activeTab === 'auto') generatePuzzle(parsed);
      } catch (err) { setError('Error parsing CSV: ' + err.message); }
    };
    reader.readAsText(file);
  };

  const generatePuzzle = async (wordList = words, layoutIdx = selectedLayoutIndex, autoStartPlay = false) => {
    if (wordList.length === 0) { setError('Please upload a CSV file first'); return; }
    
    // Reset cancellation state
    cancelRef.current = false;
    setGenerationCancelled(false);
    setIsGenerating(true);
    setProgress('Initializing...');
    setError('');
    setGrid(null); // Clear previous grid while generating
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const layout = LAYOUTS[layoutIdx].grid;
    const slots = findSlots(layout);
    
    log(`Starting generation with ${wordList.length} words for ${slots.length} slots`);
    setProgress(`Searching for complete ${layout.length}×${layout[0].length} puzzle...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { grid: newGrid, placements, attempts, complete } = await generateCrossword(
      wordList, 
      layout, 
      setProgress,
      () => cancelRef.current
    );
    
    if (complete) {
      const numbered = assignNumbers(placements);
      const generatedClues = { 
        across: numbered.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number), 
        down: numbered.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number) 
      };
      setGrid(newGrid);
      setClues(generatedClues);
      if (autoStartPlay) {
        startPlayMode(newGrid, generatedClues);
      }
      setProgress(`Success! All ${slots.length} slots filled.`);
      setTimeout(() => setProgress(''), 5000);
    } else if (placements && placements.length > 0) {
      // Stopped early - show best result
      const numbered = assignNumbers(placements);
      setGrid(newGrid);
      setClues({ 
        across: numbered.filter(n => n.direction === 'across').sort((a, b) => a.number - b.number), 
        down: numbered.filter(n => n.direction === 'down').sort((a, b) => a.number - b.number) 
      });
      setError(`Stopped: Best result was ${placements.length}/${slots.length} slots filled.`);
    } else {
      setError('Could not place any words. Check that your CSV has words of the right lengths.');
    }
    
    setIsGenerating(false);
  };
  
  const cancelGeneration = () => {
    cancelRef.current = true;
    setGenerationCancelled(true);
  };

  const getWordFromGrid = (grid, row, col, length, direction) => {
    let word = '';
    for (let i = 0; i < length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      if (grid[r] && grid[r][c] && grid[r][c] !== '#') word += grid[r][c] || '_';
    }
    return word;
  };

  const exportPuzzle = () => {
    const currentGrid = activeTab === 'auto' ? grid : manualGrid;
    const currentClues = activeTab === 'auto' ? clues : manualClues;
    const layoutIdx = activeTab === 'auto' ? selectedLayoutIndex : currentLayoutIndex;
    if (!currentGrid) return;
    const puzzleData = {
      version: "1.0",
      layoutIndex: layoutIdx,
      layoutName: LAYOUTS[layoutIdx].name,
      layout: LAYOUTS[layoutIdx].grid,
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
          // Try to find a matching layout in our LAYOUTS array
          const importedLayoutStr = JSON.stringify(puzzleData.layout);
          const matchingIdx = LAYOUTS.findIndex(l => JSON.stringify(l.grid) === importedLayoutStr);
          if (matchingIdx !== -1) {
            layoutIdx = matchingIdx;
          } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < LAYOUTS.length) {
            // Fall back to layoutIndex if the layout pattern doesn't match but index is valid
            layoutIdx = puzzleData.layoutIndex;
          }
          // If no match found, we'll use index 0 but the grid will still work since we use the actual grid data
        } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < LAYOUTS.length) {
          layoutIdx = puzzleData.layoutIndex;
        }
        
        // Store in auto tab for reference
        setGrid(puzzleData.grid);
        setClues({ across: puzzleData.clues.across, down: puzzleData.clues.down });
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
          // Try to find a matching layout in our LAYOUTS array
          const importedLayoutStr = JSON.stringify(puzzleData.layout);
          const matchingIdx = LAYOUTS.findIndex(l => JSON.stringify(l.grid) === importedLayoutStr);
          if (matchingIdx !== -1) {
            layoutIdx = matchingIdx;
          } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < LAYOUTS.length) {
            // Fall back to layoutIndex if the layout pattern doesn't match but index is valid
            layoutIdx = puzzleData.layoutIndex;
          }
          // If no match found, we'll use index 0 but the grid will still work since we use the actual grid data
        } else if (puzzleData.layoutIndex !== undefined && puzzleData.layoutIndex < LAYOUTS.length) {
          layoutIdx = puzzleData.layoutIndex;
        }
        
        // Store in auto tab for reference
        setGrid(puzzleData.grid);
        setClues({ across: puzzleData.clues.across, down: puzzleData.clues.down });
        setSelectedLayoutIndex(layoutIdx);
        
        // // Also set up play mode
        startPlayMode(puzzleData.grid, { across: puzzleData.clues.across, down: puzzleData.clues.down });
        
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

  const initializeManualGrid = useCallback((layoutIdx = currentLayoutIndex) => {
    const layout = LAYOUTS[layoutIdx].grid;
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
  }, [currentLayoutIndex]);

  const handleCellClick = (r, c) => {
    if (manualGrid[r][c] === '#') return;
    const layout = LAYOUTS[currentLayoutIndex].grid;
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

  const handleKeyDown = (e) => {
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
    const layout = LAYOUTS[currentLayoutIndex].grid;
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
      try {
        const response = await fetch('/crosswords.csv');
        if (response.ok) {
          const text = await response.text();
          const parsed = parseCSV(text);
          if (!cancelled && !tagalogMode && parsed.length > 0) setWords(parsed);
        }
      } catch (err) { console.log('No default crosswords.csv found'); }
    };
    if (!tagalogMode && words.length === 0) loadDefaultCSV();
    return () => { cancelled = true; };
  }, [tagalogMode, words.length]);

  React.useEffect(() => {
    let cancelled = false;

    const loadTagalogList = async () => {
      try {
        const response = await fetch('/tagalogcrosswordfinal_test.csv');
        if (!response.ok) throw new Error('Tagalog crossword CSV not found');
        const text = await response.text();
        const parsed = parseCSV(text);
        if (parsed.length === 0) throw new Error('No Tagalog entries found');
        if (cancelled) return;
        setWords(parsed);
        setError('');
        if (activeTab === 'auto') generatePuzzle(parsed);
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

  const layoutIndexForTab = activeTab === 'create' ? currentLayoutIndex : selectedLayoutIndex;

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
          <div className="flex gap-3 flex-wrap items-center relative">
            <label className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl cursor-pointer hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-purple-500/20 font-medium">
              <Upload size={18} />Upload CSV
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            
            <div className="relative">
              <button onClick={() => setShowLayoutSelector(!showLayoutSelector)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/20 font-medium">
                <Grid3X3 size={18} />{LAYOUTS[layoutIndexForTab].name}
              </button>
            </div>
            
            {activeTab === 'auto' && !isGenerating && (
              <button onClick={() => generatePuzzle()} disabled={words.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 font-medium">
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
            
            {activeTab === 'auto' && grid && (
              <button onClick={() => startPlayMode(grid, clues)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/20 font-medium">
                <Play size={18} />Play This Puzzle
              </button>
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
                <Grid3X3 size={18} />{LAYOUTS[layoutIndexForTab].name}
              </button>
            </div>
            
            {!isGenerating && (
              <button onClick={() => generatePuzzle(words, selectedLayoutIndex, true)} disabled={words.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 font-medium">
                <RefreshCw size={18} />Generate &amp; Play
              </button>
            )}
            
            {isGenerating && (
              <button onClick={cancelGeneration} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-xl hover:from-rose-500 hover:to-red-500 transition-all duration-300 shadow-lg shadow-rose-500/20 font-medium">
                <X size={18} />Stop
              </button>
            )}
            
            {grid && !isGenerating && (
              <button onClick={() => startPlayMode(grid, clues)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/20 font-medium">
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
              <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2"><Puzzle size={20} />Puzzle Grid</h2>
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6">
                <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2"><PenTool size={20} />Create Your Puzzle</h2>
                <p className="text-purple-300/60 text-sm mb-4">Click a cell to select it. Click again to toggle Across/Down. Type letters to fill in.</p>
                <div className="overflow-x-auto"><div className="inline-block">
                  {manualGrid.map((row, r) => <div key={r} className="flex">{row.map((cell, c) => {
                    const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                    const isInWord = isInCurrentWord(r, c);
                    return <div key={c} onClick={() => handleCellClick(r, c)} className={`w-9 h-9 md:w-10 md:h-10 border flex items-center justify-center text-sm font-bold relative transition-all cursor-pointer ${cell === '#' ? 'bg-slate-800 border-slate-700 cursor-default' : isSelected ? 'bg-amber-400 border-amber-500 ring-2 ring-amber-300' : isInWord ? 'bg-amber-200/80 border-amber-300' : 'bg-white/95 border-purple-500/30 hover:bg-purple-100'}`}>{cell !== '#' && getNumberForCell(r, c, manualClues) && <span className="absolute top-0.5 left-1 text-[10px] text-slate-500 font-medium">{getNumberForCell(r, c, manualClues)}</span>}{cell !== '#' && cell && <span className="text-slate-800">{cell}</span>}</div>;
                  })}</div>)}
                </div></div>
              </div>
              
              {selectedCell && (
                <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-purple-300/60 text-sm uppercase tracking-wider">Current Selection</span>
                      <div className="text-2xl font-bold text-amber-300 tracking-widest mt-1">{getCurrentWord().word || '-----'}</div>
                      <div className="text-purple-300/80 text-sm mt-1">Direction: <span className="text-amber-300 capitalize font-semibold">{selectedDirection}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setClueInput(getClueForCurrentSlot()?.clue || ''); setEditingClue(true); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition font-medium"><PenTool size={16} />Edit Clue</button>
                      {words.length > 0 && <button onClick={() => { setShowSuggestions(!showSuggestions); setSuggestions(findSuggestionsForSlot()); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-xl hover:from-amber-400 hover:to-yellow-400 transition font-medium"><Sparkles size={16} />Auto-fill</button>}
                    </div>
                  </div>
                  
                  {getClueForCurrentSlot() && <div className="bg-white/5 rounded-xl p-4 border border-purple-500/20"><div className="text-purple-300/60 text-xs uppercase tracking-wider mb-1">Current Clue</div><div className="text-purple-100">{getClueForCurrentSlot()?.clue || <span className="text-purple-300/40 italic">No clue set</span>}</div></div>}
                  
                  {editingClue && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-amber-300 mb-4">Edit Clue</h3>
                        <div className="text-purple-300/60 text-sm mb-2">For: <span className="text-amber-300 font-mono">{getCurrentWord().word}</span></div>
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
                        {suggestions.length === 0 ? <div className="p-4 text-purple-300/60 text-center">No matching words found</div> : suggestions.map((s, i) => <button key={i} onClick={() => applySuggestion(s)} className="w-full px-4 py-3 text-left hover:bg-white/10 transition border-b border-purple-500/10 last:border-0"><div className="font-mono text-amber-300 font-bold">{s.word}</div><div className="text-purple-300/70 text-sm truncate">{s.clue}</div></button>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6 max-h-[700px] overflow-y-auto">
              <h2 className="text-xl font-bold text-amber-300 mb-4">Clues</h2>
              <div className="mb-6">
                <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2"><ChevronRight size={16} />Across</h3>
                {manualClues.across.map(clue => {
                  let word = '';
                  for (let i = 0; i < clue.length; i++) word += manualGrid[clue.row][clue.col + i] || '_';
                  return <div key={`across-${clue.number}`} className={`mb-3 text-sm pl-4 border-l-2 transition-colors cursor-pointer hover:bg-white/5 rounded-r-lg py-1 ${selectedCell && selectedDirection === 'across' && clue.row === getCurrentWord().slot?.row && clue.col === getCurrentWord().slot?.col ? 'border-amber-400 bg-amber-500/10' : 'border-purple-500/30'}`} onClick={() => { setSelectedCell({ row: clue.row, col: clue.col }); setSelectedDirection('across'); }}>
                    <div className="flex items-center gap-2"><span className="font-semibold text-amber-300">{clue.number}.</span><span className="font-mono text-purple-300/60 text-xs">{word}</span></div>
                    <div className="text-purple-100/80 mt-0.5">{clue.clue || <span className="text-purple-300/40 italic">Click to add clue</span>}</div>
                  </div>;
                })}
              </div>
              <div>
                <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2"><ChevronDown size={16} />Down</h3>
                {manualClues.down.map(clue => {
                  let word = '';
                  for (let i = 0; i < clue.length; i++) word += manualGrid[clue.row + i][clue.col] || '_';
                  return <div key={`down-${clue.number}`} className={`mb-3 text-sm pl-4 border-l-2 transition-colors cursor-pointer hover:bg-white/5 rounded-r-lg py-1 ${selectedCell && selectedDirection === 'down' && clue.row === getCurrentWord().slot?.row && clue.col === getCurrentWord().slot?.col ? 'border-amber-400 bg-amber-500/10' : 'border-purple-500/30'}`} onClick={() => { setSelectedCell({ row: clue.row, col: clue.col }); setSelectedDirection('down'); }}>
                    <div className="flex items-center gap-2"><span className="font-semibold text-amber-300">{clue.number}.</span><span className="font-mono text-purple-300/60 text-xs">{word}</span></div>
                    <div className="text-purple-100/80 mt-0.5">{clue.clue || <span className="text-purple-300/40 italic">Click to add clue</span>}</div>
                  </div>;
                })}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'auto' && !grid && !isGenerating && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-12 text-center">
            <Puzzle size={64} className="mx-auto text-purple-500/50 mb-4" />
            <h3 className="text-xl font-bold text-purple-300 mb-2">No Puzzle Yet</h3>
            <p className="text-purple-300/60">Upload a CSV file to generate your crossword puzzle, or import a saved puzzle</p>
          </div>
        )}
        
        {/* PLAY MODE */}
        {activeTab === 'play' && playGrid && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              {/* Play header with timer and controls */}
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
                  <div className="flex gap-2">
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
              
              {/* Play grid */}
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
                          
                          return (
                            <div
                              key={c}
                              onClick={() => handlePlayCellClick(r, c)}
                              className={`w-10 h-10 md:w-12 md:h-12 border flex items-center justify-center text-lg font-bold relative transition-all cursor-pointer
                                ${cell === '#' ? 'bg-slate-800 border-slate-700 cursor-default' : 
                                  isSelected ? 'bg-amber-400 border-amber-500 ring-2 ring-amber-300' : 
                                  isInWord ? 'bg-amber-200/80 border-amber-300' : 
                                  'bg-white/95 border-purple-500/30 hover:bg-purple-100'}`}
                            >
                              {cell !== '#' && getNumberForCell(r, c, playClues) && (
                                <span className="absolute top-0.5 left-1 text-[10px] text-slate-500 font-medium">
                                  {getNumberForCell(r, c, playClues)}
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
            
            {/* Play clues */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-purple-500/20 p-6 max-h-[700px] overflow-y-auto">
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
      
      {/* Layout Selector Dropdown - rendered as fixed overlay */}
      {showLayoutSelector && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setShowLayoutSelector(false)} />
          <div className="fixed z-[999] bg-slate-800 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden min-w-[220px]" style={{ top: '280px', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="bg-purple-500/20 px-4 py-2 border-b border-purple-500/30">
              <span className="text-purple-200 font-semibold text-sm">Select Layout</span>
            </div>
            {LAYOUTS.map((layout, idx) => (
              <button key={idx} onClick={() => { if (activeTab === 'create') initializeManualGrid(idx); else setSelectedLayoutIndex(idx); setShowLayoutSelector(false); }} className={`w-full px-4 py-3 text-left hover:bg-purple-500/20 transition flex items-center justify-between ${layoutIndexForTab === idx ? 'bg-purple-500/30 text-amber-300' : 'text-purple-100'}`}>
                <span>{layout.name}</span>
                <span className="text-purple-400 text-xs">{layout.grid.length}×{layout.grid[0].length}</span>
              </button>
            ))}
          </div>
        </>
      )}
      
      {/* Dictionary Modal */}
      {showDictionary && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
                  <BookOpen size={24} />Dictionary
                </h2>
                <button onClick={() => setShowDictionary(false)} className="p-2 hover:bg-white/10 rounded-lg transition">
                  <X size={24} className="text-purple-300" />
                </button>
              </div>
              
              {/* Add new word form */}
              <div className="flex gap-3 flex-wrap">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value.toUpperCase())}
                  placeholder="New word..."
                  className="flex-1 min-w-[120px] bg-white/10 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="text"
                  value={newClue}
                  onChange={(e) => setNewClue(e.target.value)}
                  placeholder="Clue for this word..."
                  className="flex-[2] min-w-[200px] bg-white/10 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={addWordToDictionary}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-500 hover:to-teal-500 transition font-medium flex items-center gap-2"
                >
                  <Plus size={18} />Add
                </button>
                <button
                  onClick={exportDictionary}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-500 hover:to-orange-500 transition font-medium flex items-center gap-2"
                >
                  <Download size={18} />Export CSV
                </button>
              </div>
              
              {/* Search */}
              <div className="mt-4 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/50" />
                <input
                  type="text"
                  value={dictionarySearch}
                  onChange={(e) => setDictionarySearch(e.target.value)}
                  placeholder="Search words or clues..."
                  className="w-full bg-white/10 border border-purple-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              
              <div className="mt-3 text-purple-300/60 text-sm">
                {words.length} words in dictionary
              </div>
            </div>
            
            {/* Word list */}
            <div className="flex-1 overflow-y-auto p-6">
              {getFilteredWords().length === 0 ? (
                <div className="text-center text-purple-300/60 py-8">
                  {words.length === 0 ? 'No words in dictionary. Add some or upload a CSV!' : 'No matching words found.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {getFilteredWords().slice(0, 200).map((item, idx) => {
                    const originalIndex = words.indexOf(item);
                    const isEditing = editingWordIndex === originalIndex;
                    
                    return (
                      <div key={originalIndex} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={editWord}
                              onChange={(e) => setEditWord(e.target.value.toUpperCase())}
                              className="w-32 bg-white/10 border border-purple-500/30 rounded px-2 py-1 text-amber-300 font-mono focus:outline-none focus:border-amber-500/50"
                            />
                            <input
                              type="text"
                              value={editClue}
                              onChange={(e) => setEditClue(e.target.value)}
                              className="flex-1 bg-white/10 border border-purple-500/30 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50"
                            />
                            <button onClick={saveEditWord} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded transition">
                              <Check size={18} />
                            </button>
                            <button onClick={() => setEditingWordIndex(null)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded transition">
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="w-32 font-mono text-amber-300 font-bold">{item.word}</span>
                            <span className="flex-1 text-purple-100/80 text-sm">{item.clue}</span>
                            <button onClick={() => startEditWord(originalIndex)} className="p-2 text-purple-300 hover:bg-purple-500/20 rounded transition">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => deleteWordFromDictionary(originalIndex)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded transition">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {getFilteredWords().length > 200 && (
                    <div className="text-center text-purple-300/60 py-4">
                      Showing first 200 of {getFilteredWords().length} results
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrosswordGenerator;
