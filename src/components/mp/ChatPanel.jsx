import React, { useState, useRef, useEffect } from 'react';
import { Send } from '../Icons';

const EMOJI = ['👍', '😂', '🎉', '😮', '🔥', '❤️'];

// Lobby chat + quick emoji reactions. `chat` = [{player_id,name,color,text,created_at}].
const ChatPanel = ({ chat = [], myId, onSend, onReact }) => {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [chat.length]);

  const submit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    onSend?.(text);
    setText('');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-1 py-2 space-y-1.5">
        {chat.length === 0 && <div className="text-ink-faint text-sm text-center py-4">Say hi 👋</div>}
        {chat.map((m, i) => (
          <div key={i} className={`text-sm leading-snug ${m.player_id === myId ? 'text-right' : ''}`}>
            <span className="font-semibold" style={{ color: m.color }}>{m.player_id === myId ? 'You' : m.name}</span>
            <span className="text-ink-soft"> {m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-1 px-1 py-1.5 border-t border-line">
        {EMOJI.map((e) => (
          <button key={e} onClick={() => onReact?.(e)} className="w-8 h-8 rounded-md hover:bg-ink/5 text-lg leading-none" title="React">{e}</button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 px-1 pb-1">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="field flex-1" maxLength={200} />
        <button type="submit" className="btn btn-accent px-3" aria-label="Send"><Send size={16} /></button>
      </form>
    </div>
  );
};

export default ChatPanel;
