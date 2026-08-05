import React from 'react';

// Fixed top-center transient notifications (joins, leaves, solved…).
const Toasts = ({ toasts = [] }) => {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[1400] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="panel px-4 py-2 text-sm font-medium text-ink animate-rise-in shadow-lg">{t.text}</div>
      ))}
    </div>
  );
};

export default Toasts;
