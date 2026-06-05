// Web Worker host for the crossword solver. Running here keeps the main thread
// (and therefore the UI) free, and lets the solver run flat-out with no
// artificial setTimeout yields.

import { solveCrossword } from '../utils/solver.js';

let cancelled = false;

self.onmessage = (e) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    cancelled = true;
    return;
  }

  if (msg.type === 'start') {
    cancelled = false;
    const p = msg.payload || {};
    try {
      const result = solveCrossword({
        wordList: p.wordList,
        layout: p.layout,
        presetGrid: p.presetGrid,
        requiredWordsList: p.requiredWordsList,
        requiredModeArg: p.requiredModeArg,
        presetClues: p.presetClues,
        timeoutMs: p.timeoutMs,
        onProgress: (text) => self.postMessage({ type: 'progress', text }),
        onBest: (best) => self.postMessage({ type: 'best', result: best }),
        now: () => performance.now(),
        isCancelled: () => cancelled,
      });
      self.postMessage({ type: 'done', result });
    } catch (err) {
      self.postMessage({ type: 'error', message: String((err && err.message) || err) });
    }
  }
};
