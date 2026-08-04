import React from 'react';

// Reusable confirmation dialog (used before destructive/irreversible reveals & full-board checks).
const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1300] bg-ink/45 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="panel w-full max-w-sm p-6 animate-rise-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-xl font-semibold text-ink mb-2">{title}</h3>
        <p className="text-ink-soft text-sm mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className={`btn flex-1 ${danger ? 'btn-ink' : 'btn-accent'}`}>{confirmLabel}</button>
          <button onClick={onCancel} className="btn btn-ghost flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
