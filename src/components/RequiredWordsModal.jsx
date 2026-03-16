import React, { useState, useEffect } from 'react';
import { X, Check, Zap, Shuffle } from 'lucide-react';

const RequiredWordsModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialWords = [],
  stats = null,
  modeView = 'simple', // 'simple' | 'byLength'
  onModeChange = () => {},
  initialDifficulty = 'random'
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('anchor'); // 'anchor' (place-first) | 'opportunistic'
  const [lengthInputs, setLengthInputs] = useState({});
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState('random');

  useEffect(() => {
    if (isOpen) {
      setInput(initialWords.join(', '));
      setMode('anchor');
      setLengthInputs({});
      setError('');
      setDifficulty(initialDifficulty || 'random');
    }
  }, [isOpen, initialWords, initialDifficulty]);

  if (!isOpen) return null;

  const validLengths = stats?.lengthCounts ? Object.keys(stats.lengthCounts).map(l => Number(l)) : [];

  const parseWords = () =>
    input
      .split(',')
      .map(w => w.trim().toUpperCase().replace(/[^A-Z]/g, ''))
      .filter(Boolean);

  const handleModeViewChange = (view) => {
    setError('');
    onModeChange(view);
  };

  const handleConfirm = () => {
    setError('');
    if (modeView === 'simple') {
      const words = parseWords();
      const invalid = words.filter(w => validLengths.length > 0 && !validLengths.includes(w.length));
      if (invalid.length > 0) {
        setError(`Invalid lengths for: ${invalid.join(', ')}. Allowed lengths: ${validLengths.join(', ')}.`);
        return;
      }
      onConfirm(words, mode, difficulty);
      return;
    }

    const words = [];
    const invalid = [];
    Object.entries(lengthInputs).forEach(([lenStr, text]) => {
      const len = Number(lenStr);
      if (!text) return;
      text.split(',').forEach(raw => {
        const w = raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (!w) return;
        if (w.length !== len) invalid.push(w);
        else words.push(w);
      });
    });
    if (invalid.length > 0) {
      setError(`These words do not match their length bucket: ${invalid.join(', ')}`);
      return;
    }
    onConfirm(words, mode, difficulty);
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-purple-500/30">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-purple-300/70">Generate</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">Specific Words</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition">
            <X size={22} className="text-purple-200" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {stats && (
            <div className="text-sm text-purple-200 bg-white/5 rounded-xl p-3 border border-purple-500/20">
              <div className="font-semibold text-amber-200">Current Layout: {stats.rows}x{stats.cols}</div>
              <div className="text-purple-200/80 mt-1">Max words: {stats.slots}</div>
              <div className="text-purple-200/80 mt-1">
                Lengths: {Object.keys(stats.lengthCounts || {}).sort((a,b)=>a-b).map(len => `${len}(${stats.lengthCounts[len]})`).join(', ')}
              </div>
              <div className="mt-2">
                <div className="font-semibold text-amber-200">Difficulty</div>
                
                <div className="flex flex-wrap gap-2">
                  {['random','easy','fair','moderate','hard','difficult','nyt-monday'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setDifficulty(opt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                        difficulty === opt ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200 hover:bg-white/5'
                      }`}
                    >
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-2 text-xs">
                <button onClick={() => handleModeViewChange('simple')} className={`px-3 py-1 rounded-lg border ${modeView === 'simple' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200'}`}>Simple</button>
                <button onClick={() => handleModeViewChange('byLength')} className={`px-3 py-1 rounded-lg border ${modeView === 'byLength' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-200'}`}>By Length</button>
              </div>
            </div>
          )}

          {modeView === 'simple' && (
            <div>
              <label className="block text-sm text-purple-200 mb-2">Words (comma separated)</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="E.g. APPLE, ORANGE, BANANA"
                rows={3}
                className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-3 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          )}

          {modeView === 'byLength' && (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {Object.keys(stats?.lengthCounts || {}).sort((a,b)=>a-b).map(len => (
                <div key={len} className="bg-white/5 border border-purple-500/20 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm text-purple-200 mb-2">
                    <span>Length {len}</span>
                    <span className="text-purple-300/70">Max: {stats.lengthCounts[len]}</span>
                  </div>
                  <textarea
                    value={lengthInputs[len] || ''}
                    onChange={(e) => setLengthInputs(prev => ({ ...prev, [len]: e.target.value }))}
                    placeholder={`Words of length ${len}, comma separated`}
                    rows={2}
                    className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-3 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              ))}
              {(!stats || Object.keys(stats.lengthCounts || {}).length === 0) && (
                <div className="text-purple-300/70 text-sm">No length data available for this layout.</div>
              )}
            </div>
          )}

          {error && <div className="text-rose-300 text-sm">{error}</div>}

          <div>
            <label className="block text-sm text-purple-200 mb-2">Placement mode</label>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setMode('anchor')}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition ${mode === 'anchor' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-100 hover:bg-white/5'}`}
              >
                <Zap size={18} /> Place first (anchor the board on these words)
              </button>
              <button
                onClick={() => setMode('opportunistic')}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition ${mode === 'opportunistic' ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-purple-500/30 text-purple-100 hover:bg-white/5'}`}
              >
                <Shuffle size={18} /> Fill flexibly (fit these words anywhere)
              </button>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-purple-500/30 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-purple-200 hover:bg-white/20 transition">Cancel</button>
          <button onClick={handleConfirm} className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-semibold hover:from-amber-400 hover:to-yellow-400 transition flex items-center gap-2">
            <Check size={18} /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequiredWordsModal;
