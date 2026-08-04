import React from 'react';

// Lightweight clue markup so constructors can add emphasis:
//   **bold**   *italic*   _italic_
// Symbols / accents / emoji just pass through as normal text.
export function renderRich(text) {
  if (!text || typeof text !== 'string') return text;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  const nodes = [];
  let last = 0;
  let key = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : text;
}
