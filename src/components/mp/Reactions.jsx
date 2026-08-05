import React from 'react';

// Floating emoji reactions that rise and fade.
const Reactions = ({ reactions = [] }) => {
  if (!reactions.length) return null;
  return (
    <div className="fixed inset-0 z-[1400] pointer-events-none overflow-hidden">
      {reactions.map((r) => (
        <div key={r.id} className="reaction-float absolute bottom-28 text-4xl" style={{ left: `${r.x}%` }}>{r.emoji}</div>
      ))}
    </div>
  );
};

export default Reactions;
