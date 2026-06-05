import React, { useState, useEffect } from 'react';
import { X, Check, Zap, Shuffle } from './Icons';

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

  const pill = (active) =>
    `px-3 py-1.5 rounded-sm border text-xs font-bold uppercase tracking-wide transition ${active ? 'border-ink bg-ink text-paper-raised' : 'border-ink/25 text-ink-soft hover:bg-ink/5'}`;

  return (
    <div className="fixed inset-0 z-[1100] bg-ink/45 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="panel w-full max-w-lg max-h-[92vh] flex flex-col animate-rise-in">
        <div className="flex items-start justify-between panel-pad pb-4 border-b border-ink/12">
          <div>
            <div className="eyebrow">Generate</div>
            <div className="font-display text-3xl font-semibold text-ink leading-tight mt-0.5">Specific Words</div>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 text-ink-faint hover:text-ink transition">
            <X size={22} />
          </button>
        </div>

        <div className="panel-pad space-y-4 overflow-y-auto">
          {stats && (
            <div className="text-sm bg-paper-sunken rounded-sm p-3.5 border border-ink/12">
              <div className="font-mono text-ink"><span className="text-ink-faint">Layout</span> {stats.rows}×{stats.cols} · <span className="text-ink-faint">Max</span> {stats.slots} words</div>
              <div className="text-ink-soft mt-1 text-xs font-mono">
                Lengths: {Object.keys(stats.lengthCounts || {}).sort((a,b)=>a-b).map(len => `${len}(${stats.lengthCounts[len]})`).join(', ')}
              </div>
              <div className="mt-3">
                <div className="eyebrow mb-1.5">Difficulty</div>
                <div className="flex flex-wrap gap-1.5">
                  {['random','easy','fair','moderate','hard','difficult','nyt-monday'].map(opt => (
                    <button key={opt} onClick={() => setDifficulty(opt)} className={pill(difficulty === opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => handleModeViewChange('simple')} className={pill(modeView === 'simple')}>Simple</button>
                <button onClick={() => handleModeViewChange('byLength')} className={pill(modeView === 'byLength')}>By Length</button>
              </div>
            </div>
          )}

          {modeView === 'simple' && (
            <div>
              <label className="eyebrow block mb-2">Words (comma separated)</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. APPLE, ORANGE, BANANA"
                rows={3}
                className="field font-mono"
              />
            </div>
          )}

          {modeView === 'byLength' && (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {Object.keys(stats?.lengthCounts || {}).sort((a,b)=>a-b).map(len => (
                <div key={len} className="bg-paper-sunken border border-ink/12 rounded-sm p-3">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="eyebrow">Length {len}</span>
                    <span className="text-ink-faint text-xs font-mono">Max {stats.lengthCounts[len]}</span>
                  </div>
                  <textarea
                    value={lengthInputs[len] || ''}
                    onChange={(e) => setLengthInputs(prev => ({ ...prev, [len]: e.target.value }))}
                    placeholder={`Words of length ${len}, comma separated`}
                    rows={2}
                    className="field font-mono"
                  />
                </div>
              ))}
              {(!stats || Object.keys(stats.lengthCounts || {}).length === 0) && (
                <div className="text-ink-faint text-sm italic">No length data available for this layout.</div>
              )}
            </div>
          )}

          {error && <div className="border-l-2 border-accent bg-accent/8 px-3 py-2 text-accent-deep text-sm">{error}</div>}

          <div>
            <label className="eyebrow block mb-2">Placement Mode</label>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => setMode('anchor')}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-sm border text-left text-sm transition ${mode === 'anchor' ? 'border-ink bg-ink text-paper-raised' : 'border-ink/25 text-ink-soft hover:bg-ink/5'}`}
              >
                <Zap size={17} /> Place first — anchor the board on these words
              </button>
              <button
                onClick={() => setMode('opportunistic')}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-sm border text-left text-sm transition ${mode === 'opportunistic' ? 'border-ink bg-ink text-paper-raised' : 'border-ink/25 text-ink-soft hover:bg-ink/5'}`}
              >
                <Shuffle size={17} /> Fill flexibly — fit these words anywhere
              </button>
            </div>
          </div>
        </div>

        <div className="panel-pad pt-4 border-t border-ink/12 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleConfirm} className="btn btn-accent">
            <Check size={16} /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequiredWordsModal;
