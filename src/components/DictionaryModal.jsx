import React from 'react';
import { BookOpen, Plus, Download, Search, Check, X, Edit3, Trash2 } from 'lucide-react';

const DictionaryModal = ({
  isOpen,
  onClose,
  words,
  dictionarySearch,
  setDictionarySearch,
  newWord,
  setNewWord,
  newClue,
  setNewClue,
  addWordToDictionary,
  exportDictionary,
  getFilteredWords,
  editingWordIndex,
  setEditingWordIndex,
  editWord,
  setEditWord,
  editClue,
  setEditClue,
  saveEditWord,
  startEditWord,
  deleteWordFromDictionary
}) => {
  if (!isOpen) return null;

  const filteredWords = getFilteredWords();

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
              <BookOpen size={24} />Dictionary
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
              <X size={24} className="text-purple-300" />
            </button>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value.toUpperCase())}
              placeholder="New word..."
              className="flex-1 min-w-[120px] bg-white/10 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              value={newClue}
              onChange={(e) => setNewClue(e.target.value)}
              placeholder="Clue for this word..."
              className="flex-[2] min-w-[200px] bg-white/10 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={addWordToDictionary}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-500 hover:to-teal-500 transition font-medium flex items-center gap-2"
            >
              <Plus size={18} />Add
            </button>
            <button
              onClick={exportDictionary}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-500 hover:to-orange-500 transition font-medium flex items-center gap-2"
            >
              <Download size={18} />Export CSV
            </button>
          </div>
          
          <div className="mt-4 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/50" />
            <input
              type="text"
              value={dictionarySearch}
              onChange={(e) => setDictionarySearch(e.target.value)}
              placeholder="Search words or clues..."
              className="w-full bg-white/10 border border-purple-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-purple-300/50 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          
          <div className="mt-3 text-purple-300/60 text-sm">
            {words.length} words in dictionary
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {filteredWords.length === 0 ? (
            <div className="text-center text-purple-300/60 py-8">
              {words.length === 0 ? 'No words in dictionary. Add some or upload a CSV!' : 'No matching words found.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWords.slice(0, 200).map((item) => {
                const originalIndex = words.indexOf(item);
                const isEditing = editingWordIndex === originalIndex;
                
                return (
                  <div key={originalIndex} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value.toUpperCase())}
                          className="w-32 bg-white/10 border border-purple-500/30 rounded px-2 py-1 text-amber-300 font-mono focus:outline-none focus:border-amber-500/50"
                        />
                        <input
                          type="text"
                          value={editClue}
                          onChange={(e) => setEditClue(e.target.value)}
                          className="flex-1 bg-white/10 border border-purple-500/30 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500/50"
                        />
                        <button onClick={saveEditWord} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded transition">
                          <Check size={18} />
                        </button>
                        <button onClick={() => setEditingWordIndex(null)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded transition">
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-32 font-mono text-amber-300 font-bold">{item.word}</span>
                        <span className="flex-1 text-purple-100/80 text-sm">{item.clue}</span>
                        <button onClick={() => startEditWord(originalIndex)} className="p-2 text-purple-300 hover:bg-purple-500/20 rounded transition">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => deleteWordFromDictionary(originalIndex)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded transition">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {filteredWords.length > 200 && (
                <div className="text-center text-purple-300/60 py-4">
                  Showing first 200 of {getFilteredWords().length} results
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DictionaryModal;
