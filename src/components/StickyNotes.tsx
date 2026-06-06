import React, { useState, useEffect } from 'react';

interface StickyNote {
  id: string;
  text: string;
  color: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

const COLOR_PRESETS = [
  { id: 'indigo', bg: 'bg-blue-50 border-blue-200 text-slate-800', dot: 'bg-blue-500', tag: 'bg-blue-100 text-blue-700' },
  { id: 'teal', bg: 'bg-teal-50 border-teal-200 text-slate-800', dot: 'bg-teal-500', tag: 'bg-teal-100 text-teal-700' },
  { id: 'rose', bg: 'bg-rose-50 border-rose-200 text-slate-800', dot: 'bg-rose-500', tag: 'bg-rose-100 text-rose-700' },
  { id: 'amber', bg: 'bg-amber-50 border-amber-200 text-slate-800', dot: 'bg-amber-500', tag: 'bg-amber-100 text-amber-700' },
  { id: 'emerald', bg: 'bg-emerald-50 border-emerald-200 text-slate-800', dot: 'bg-emerald-500', tag: 'bg-emerald-100 text-emerald-700' },
  { id: 'zinc', bg: 'bg-slate-50 border-slate-200 text-slate-800', dot: 'bg-slate-500', tag: 'bg-slate-200 text-slate-700' }
];

const CATEGORIES = ['All', 'Task List', 'Meetings', 'Ideas', 'Personal'];

interface StickyNotesProps {
  displayName: string;
}

const StickyNotes: React.FC<StickyNotesProps> = ({ displayName }) => {
  const [notes, setNotes] = useState<StickyNote[]>(() => {
    const saved = localStorage.getItem('ajay_workspace_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      { id: '1', text: 'Prepare Q3 slide deck for financial project stakeholders. Sync up with the treasury team regarding standard estimates.', color: 'indigo', category: 'Task List', priority: 'high', createdAt: new Date().toISOString() },
      { id: '2', text: 'Verify Hyderabad concrete supply with Gachibowli site engineer at 3PM. Note the PPC cement pricing trends.', color: 'amber', category: 'Meetings', priority: 'medium', createdAt: new Date().toISOString() },
      { id: '3', text: 'Explore integrating automatic inflation modeling in our cost estimation software.', color: 'teal', category: 'Ideas', priority: 'low', createdAt: new Date().toISOString() }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [selectedColor, setSelectedColor] = useState('indigo');
  const [selectedCategory, setSelectedCategory] = useState('Task List');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Persist state
  useEffect(() => {
    localStorage.setItem('ajay_workspace_notes', JSON.stringify(notes));
  }, [notes]);

  const handleAddNote = () => {
    if (!inputText.trim()) return;
    const newNote: StickyNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      color: selectedColor,
      category: selectedCategory,
      priority: selectedPriority,
      createdAt: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
    inputText_clear();
  };

  const inputText_clear = () => {
    setInputText('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  const handleEditNoteText = (id: string, newText: string) => {
    setNotes(notes.map((note) => (note.id === id ? { ...note, text: newText } : note)));
  };

  const filteredNotes = notes.filter((note) => {
    const matchesCategory = filterCategory === 'All' || note.category === filterCategory;
    const matchesSearch = note.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-100 text-[10px] font-black uppercase tracking-widest">
          Integrated Memo Board for {displayName}
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
          Workspace Sticky Notes
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-relaxed">
          {displayName}, you can organize your tasks, manage active milestones, and write sticky memos instantly here.
        </p>
      </div>

      {/* Main Board Area */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Note Creator Control */}
        <div className="lg:col-span-4 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6 text-slate-800">
          <h3 className="text-sm font-black uppercase text-[#1E3A8A] tracking-widest border-b border-slate-100 pb-4">
            Instantiate Memo
          </h3>

          {/* Text Area */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Memo Content</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Jot down notes, meetings, updates, or raw thoughts..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-xl p-4 text-xs font-semibold text-slate-805 outline-none resize-none transition-all placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category Select */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-xl p-3 text-[10px] font-bold text-slate-800 outline-none cursor-pointer"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Select */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-xl p-3 text-[10px] font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Memo Color Tone</label>
            <div className="flex gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-7 h-7 rounded-full ${color.dot} border-2 transition-all flex items-center justify-center ${
                    selectedColor === color.id ? 'scale-115 border-slate-800' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  title={color.id}
                >
                  {selectedColor === color.id && <span className="text-[10px] text-white font-extrabold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAddNote}
            disabled={!inputText.trim()}
            className="w-full py-4 rounded-xl bg-[#1E3A8A] hover:bg-blue-800 text-white font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 disabled:opacity-45 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Post Memo Node</span>
            <span>📌</span>
          </button>
        </div>

        {/* Board Search, Filter and Card Deck */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white border border-slate-100 p-4 px-6 rounded-2xl shadow-sm">
            {/* Category selection bar */}
            <div className="flex flex-wrap justify-center items-center gap-2 flex-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                    filterCategory === cat
                      ? 'bg-[#1E3A8A] text-white shadow-sm shadow-[#1E3A8A]/10'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Keyword search bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memo boards..."
              className="bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-xl px-4 py-2 text-[10px] font-bold text-slate-805 outline-none w-full md:w-48 placeholder:text-slate-400"
            />
          </div>

          {/* Sticky Notes Grid */}
          {filteredNotes.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {filteredNotes.map((note) => {
                const colorConfig = COLOR_PRESETS.find((c) => c.id === note.color) || COLOR_PRESETS[5];
                return (
                  <div
                    key={note.id}
                    className={`p-6 rounded-[2rem] border transition-all hover:scale-[1.01] hover:shadow-lg flex flex-col justify-between min-h-[220px] relative overflow-hidden group shadow-sm ${colorConfig.bg}`}
                  >
                    {/* Header: card tags */}
                    <div className="flex items-center justify-between mb-4">
                      {/* Priority Tag */}
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        note.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200' :
                        note.priority === 'medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {note.priority} Priority
                      </span>

                      {/* Delete Trigger */}
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-slate-400 hover:text-red-500 text-sm font-semibold transition-colors p-1 cursor-pointer"
                        title="Discard Memo"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Text Field representation */}
                    <textarea
                      value={note.text}
                      onChange={(e) => handleEditNoteText(note.id, e.target.value)}
                      className="flex-grow bg-transparent border-none outline-none text-xs font-semibold leading-relaxed focus:bg-white/40 p-2 rounded-xl h-24 overflow-y-auto resize-none scrollbar-none text-slate-800"
                    />

                    {/* Footer tags */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200/40">
                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">
                        📁 {note.category}
                      </span>
                      <span className="text-[7px] text-slate-405">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-[2rem] p-16 text-center shadow-sm">
              <span className="text-3xl">📭</span>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">No active memos matched filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyNotes;
