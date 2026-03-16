import React from 'react';
import { Edit3, Plus } from './Icons';

const LayoutSelector = ({
  isOpen,
  layouts,
  activeTab,
  layoutIndexForTab,
  onSelect,
  onClose,
  onCreateLayout,
  onEditLayout
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} />
      <div className="fixed z-[999] bg-slate-800 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden min-w-[220px]" style={{ top: '280px', left: '50%', transform: 'translateX(-50%)' }}>
        <div className="bg-purple-500/20 px-4 py-2 border-b border-purple-500/30 flex items-center justify-between">
          <span className="text-purple-200 font-semibold text-sm">Select Layout</span>
          <div className="flex gap-2">
            <button onClick={onCreateLayout} className="text-xs px-2 py-1 rounded-md bg-purple-500/30 text-amber-200 hover:bg-purple-500/50 transition flex items-center gap-1">
              <Plus size={14} />New
            </button>
            <button onClick={onEditLayout} className="text-xs px-2 py-1 rounded-md bg-purple-500/30 text-purple-100 hover:bg-purple-500/50 transition flex items-center gap-1">
              <Edit3 size={14} />Edit
            </button>
          </div>
        </div>
        {layouts.map((layout, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(idx, activeTab)}
            className={`w-full px-4 py-3 text-left hover:bg-purple-500/20 transition flex items-center justify-between ${layoutIndexForTab === idx ? 'bg-purple-500/30 text-amber-300' : 'text-purple-100'}`}
          >
            <span>{layout.name}</span>
            <span className="text-purple-400 text-xs">{layout.grid.length}A-{layout.grid[0].length}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default LayoutSelector;
