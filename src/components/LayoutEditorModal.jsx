// src/components/LayoutEditorModal.jsx
// Layout creation and editing modal

import React, { useState, useEffect } from 'react';
import { Grid3X3, X, Save } from './Icons';
import { getLayoutStats } from '../utils/crosswordUtils';

const LayoutEditorModal = ({
  isOpen,
  onClose,
  onSave,
  editingLayout = null, // { name, grid } if editing, null if creating
  mode = 'create' // 'create' or 'edit'
}) => {
  const [layoutName, setLayoutName] = useState('');
  const [layoutSize, setLayoutSize] = useState(15);
  const [grid, setGrid] = useState(null);
  const [symmetryEnabled, setSymmetryEnabled] = useState(true);
  const [error, setError] = useState('');

  const createEmptyGrid = (size) => {
    const newGrid = Array(size).fill(null).map(() => Array(size).fill('.'));
    setGrid(newGrid);
  };

  // Initialize grid when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingLayout) {
        setLayoutName(editingLayout.name);
        setLayoutSize(editingLayout.grid.length);
        setGrid(editingLayout.grid.map(row => row.split('')));
      } else {
        setLayoutName('');
        setLayoutSize(15);
        createEmptyGrid(15);
      }
      setError('');
    }
  }, [isOpen, editingLayout]);

  const handleSizeChange = (newSize) => {
    setLayoutSize(newSize);
    createEmptyGrid(newSize);
  };

  const toggleCell = (r, c) => {
    if (!grid) return;

    const newGrid = grid.map(row => [...row]);
    const currentValue = newGrid[r][c];
    const newValue = currentValue === '#' ? '.' : '#';

    newGrid[r][c] = newValue;

    // Apply rotational symmetry if enabled
    if (symmetryEnabled) {
      const symR = layoutSize - 1 - r;
      const symC = layoutSize - 1 - c;
      newGrid[symR][symC] = newValue;
    }

    setGrid(newGrid);
  };

  const handleSave = () => {
    if (!layoutName.trim()) {
      setError('Please enter a layout name');
      return;
    }

    if (!grid) return;

    const success = onSave(layoutName.trim(), grid);
    if (success) {
      onClose();
    }
  };

  const stats = grid ? getLayoutStats(grid) : { slots: 0, blackCells: 0, acrossSlots: 0, downSlots: 0 };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-ink/45 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="panel w-full max-w-4xl max-h-[90vh] flex flex-col animate-rise-in">
        {/* Header */}
        <div className="panel-pad pb-5 border-b border-ink/12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="eyebrow flex items-center gap-1.5"><Grid3X3 size={13} />Plates</div>
              <h2 className="font-display text-3xl font-semibold text-ink leading-tight">
                {mode === 'edit' ? 'Edit Layout' : 'New Layout'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 -mr-1 text-ink-faint hover:text-ink transition">
              <X size={22} />
            </button>
          </div>

          {/* Layout name and size controls */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="eyebrow block mb-1.5">Layout Name</label>
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="My Custom Layout"
                className="field"
              />
            </div>
            <div className="w-32">
              <label className="eyebrow block mb-1.5">Size</label>
              <select
                value={layoutSize}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                disabled={mode === 'edit'}
                className="field disabled:opacity-50 cursor-pointer"
              >
                {Array.from({ length: 17 }, (_, i) => i + 5).map(size => (
                  <option key={size} value={size}>
                    {size} × {size}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setSymmetryEnabled(!symmetryEnabled)}
              className={`btn btn-sm ${symmetryEnabled ? 'btn-ink' : 'btn-ghost'}`}
            >
              Symmetry {symmetryEnabled ? 'On' : 'Off'}
            </button>
          </div>

          {error && (
            <div className="mt-3 text-accent-deep text-sm font-medium">{error}</div>
          )}
        </div>

        {/* Grid Editor */}
        <div className="flex-1 overflow-auto panel-pad">
          <p className="text-ink-faint text-sm mb-4">
            Click cells to toggle black / white.
            {symmetryEnabled && ' Rotational symmetry is on.'}
          </p>

          {grid && (
            <div className="flex justify-center">
              <div className="xw-grid">
                {grid.map((row, r) => (
                  <div key={r} className="flex">
                    {row.map((cell, c) => {
                      const cellSize = layoutSize > 15
                        ? 'w-6 h-6'
                        : layoutSize > 10
                          ? 'w-7 h-7'
                          : 'w-8 h-8';

                      return (
                        <div
                          key={c}
                          onClick={() => toggleCell(r, c)}
                          className={`xw-cell ${cellSize} cursor-pointer ${cell === '#' ? 'xw-cell--block' : 'hover:bg-accent/15'}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 flex justify-center flex-wrap gap-x-7 gap-y-2 text-sm">
            <span className="text-ink-soft"><span className="font-mono font-semibold text-ink">{stats.slots}</span> word slots</span>
            <span className="text-ink-soft"><span className="font-mono font-semibold text-ink">{stats.acrossSlots}</span> across</span>
            <span className="text-ink-soft"><span className="font-mono font-semibold text-ink">{stats.downSlots}</span> down</span>
            <span className="text-ink-soft"><span className="font-mono font-semibold text-ink">{stats.blackCells}</span> black cells</span>
          </div>
        </div>

        {/* Footer */}
        <div className="panel-pad pt-5 border-t border-ink/12 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={handleSave} disabled={stats.slots === 0} className="btn btn-accent">
            <Save size={16} />
            {mode === 'edit' ? 'Update Layout' : 'Save Layout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutEditorModal;
