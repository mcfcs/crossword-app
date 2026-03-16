// src/components/LayoutEditorModal.jsx
// Layout creation and editing modal

import React, { useState, useEffect } from 'react';
import { Grid3X3, X, Save } from 'lucide-react';
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
  
  const createEmptyGrid = (size) => {
    const newGrid = Array(size).fill(null).map(() => Array(size).fill('.'));
    setGrid(newGrid);
  };
  
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
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
              <Grid3X3 size={24} />
              {mode === 'edit' ? 'Edit Layout' : 'Create New Layout'}
            </h2>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X size={24} className="text-purple-300" />
            </button>
          </div>
          
          {/* Layout name and size controls */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-purple-300 text-sm mb-1">Layout Name</label>
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="My Custom Layout"
                className="w-full bg-white/10 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="w-32">
              <label className="block text-purple-300 text-sm mb-1">Size</label>
              <select
                value={layoutSize}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                disabled={mode === 'edit'}
                className="w-full bg-white/10 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
              >
                {Array.from({ length: 17 }, (_, i) => i + 5).map(size => (
                  <option key={size} value={size} className="bg-slate-800">
                    {size}x{size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setSymmetryEnabled(!symmetryEnabled)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  symmetryEnabled
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-white/10 text-purple-200 border-purple-500/30'
                }`}
              >
                Symmetry {symmetryEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-3 text-rose-400 text-sm">{error}</div>
          )}
        </div>
        
        {/* Grid Editor */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-purple-300/60 text-sm mb-4">
            Click cells to toggle black/white. 
            {symmetryEnabled && ' Rotational symmetry is enabled.'}
          </p>
          
          {grid && (
            <div className="flex justify-center">
              <div className="inline-block border-2 border-purple-500/30 rounded-lg overflow-hidden">
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
                          className={`${cellSize} border border-purple-500/20 cursor-pointer transition-colors ${
                            cell === '#'
                              ? 'bg-slate-800 hover:bg-slate-700'
                              : 'bg-white/90 hover:bg-purple-100'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <span className="text-purple-300">
              <span className="text-amber-300 font-bold">{stats.slots}</span> word slots
            </span>
            <span className="text-purple-300">
              <span className="text-amber-300 font-bold">{stats.acrossSlots}</span> across
            </span>
            <span className="text-purple-300">
              <span className="text-amber-300 font-bold">{stats.downSlots}</span> down
            </span>
            <span className="text-purple-300">
              <span className="text-amber-300 font-bold">{stats.blackCells}</span> black cells
            </span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-purple-500/30 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 text-purple-300 rounded-xl hover:bg-white/20 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={stats.slots === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-500 hover:to-teal-500 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {mode === 'edit' ? 'Update Layout' : 'Save Layout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutEditorModal;
