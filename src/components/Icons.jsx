import React from 'react';

const createIcon = (glyph) => {
  const Icon = ({ className = '', ...props }) => (
    <span aria-hidden="true" className={className} {...props}>{glyph}</span>
  );
  Icon.displayName = `${glyph}Icon`;
  return Icon;
};

export const Upload = createIcon('↑');
export const Download = createIcon('↓');
export const RefreshCw = createIcon('↻');
export const Bug = createIcon('🐞');
export const Puzzle = createIcon('🧩');
export const PenTool = createIcon('✎');
export const Sparkles = createIcon('✦');
export const X = createIcon('✕');
export const Check = createIcon('✓');
export const ChevronRight = createIcon('›');
export const ChevronDown = createIcon('⌄');
export const Save = createIcon('💾');
export const FolderOpen = createIcon('📂');
export const Grid3X3 = createIcon('⊞');
export const Play = createIcon('▶');
export const BookOpen = createIcon('📖');
export const Languages = createIcon('🌐');
export const Edit3 = createIcon('✏');
export const Plus = createIcon('+');
export const DownloadCloud = createIcon('☁');
export const Search = createIcon('⌕');
export const Trash2 = createIcon('🗑');
export const Zap = createIcon('⚡');
export const Shuffle = createIcon('🔀');
export const Trophy = createIcon('🏆');
