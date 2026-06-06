import React, { useState } from 'react';
import { translateTechSpeak } from '../services/geminiService';

interface ModeOption {
  id: string;
  name: string;
  description: string;
}

interface ToneOption {
  id: string;
  name: string;
  emoji: string;
}

const MODULE_MODES: ModeOption[] = [
  { id: 'tech_to_business', name: 'Tech Jargon ➔ Business Value', description: 'Convert complex technical definitions into high-impact executive summaries.' },
  { id: 'corporate_to_human', name: 'Corporate Speak ➔ Plain English', description: 'De-bullshit corporate buzzwords and emails into clear, actionable truths.' },
  { id: 'plain_to_corporate', name: 'Plain English ➔ Buzzword Premium', description: 'Elevate casual descriptions into professional, stakeholder-approved synergy speak.' },
  { id: 'need_to_spec', name: 'Requirement ➔ Technical Spec', description: 'Transform loose user demands into structured technical guidelines.' }
];

const TONE_OPTIONS: ToneOption[] = [
  { id: 'diplomatic', name: 'Diplomatic & Polished', emoji: '🤵' },
  { id: 'direct', name: 'Direct & No-Nonsense', emoji: '⚔️' },
  { id: 'sarcastic', name: 'Sarcastic Dev (Humorous)', emoji: '👾' },
  { id: 'eli5', name: 'ELI5 (Extreme Clarity)', emoji: '👶' }
];

interface CorporateTranslatorProps {
  displayName: string;
}

const CorporateTranslator: React.FC<CorporateTranslatorProps> = ({ displayName }) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('tech_to_business');
  const [tone, setTone] = useState('diplomatic');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const selectedModeName = MODULE_MODES.find(m => m.id === mode)?.name || mode;
      const selectedToneName = TONE_OPTIONS.find(t => t.id === tone)?.name || tone;
      const result = await translateTechSpeak(text, selectedModeName, selectedToneName);
      setTranslated(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during translation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!translated) return;
    navigator.clipboard.writeText(translated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setText('');
    setTranslated('');
    setError(null);
  };

  return (
    <div className="animate-in space-y-8 pb-20">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-100 text-[10px] font-black uppercase tracking-widest">
          AI Communications Suite for {displayName}
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
          Business English Translation
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-relaxed">
          {displayName}, you can translate your tech-speak, complex jargon, and requirements into high-value professional business English here.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Panel: Inputs and Configurations */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 space-y-6 text-slate-800">
            <h3 className="text-sm font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4">
              Translation Config
            </h3>

            {/* Translation Mode */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Translation Alignment
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-2xl px-5 py-4 text-xs font-bold text-slate-805 outline-none transition-all cursor-pointer"
              >
                {MODULE_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mt-1 leading-relaxed">
                {MODULE_MODES.find(m => m.id === mode)?.description}
              </p>
            </div>

            {/* Desired Tone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Target Output Persona
              </label>
              <div className="grid grid-cols-2 gap-3">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                      tone === t.id
                        ? 'bg-blue-50 border-[#1E3A8A] text-[#1E3A8A] font-extrabold shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-500 font-bold'
                    }`}
                  >
                    <span className="text-sm">{t.emoji}</span>
                    <span className="text-[10px] uppercase tracking-wide leading-none">{t.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleTranslate}
            disabled={loading || !text.trim()}
            className="w-full py-5 rounded-2xl bg-[#1E3A8A] hover:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-45 text-white font-black uppercase text-xs tracking-widest shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Synthesizing Corpus...</span>
              </>
            ) : (
              <>
                <span>Perform Translation</span>
                <span>⚡</span>
              </>
            )}
          </button>
        </div>

        {/* Right Input & Output Areas */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-rows-2 gap-6 min-h-[500px]">
            {/* Input Pane */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col relative text-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Source Text
                </span>
                {text && (
                  <button
                    onClick={handleClear}
                    className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Reset Area
                  </button>
                )}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter technical jargon, unpolished requirements, or cryptic corporate comments..."
                className="flex-1 w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-2xl p-5 text-xs font-semibold text-slate-800 outline-none resize-none transition-all placeholder:text-slate-400 leading-relaxed"
              />
              <div className="absolute bottom-10 right-10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {text.length} Characters
              </div>
            </div>

            {/* Output Pane */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden text-slate-800">
              <div className="absolute top-0 left-0 w-1 bg-[#1E3A8A] h-full"></div>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest pl-2">
                  Semantic Output
                </span>
                {translated && (
                  <button
                    onClick={handleCopy}
                    className={`text-[9px] font-black uppercase tracking-widest transition-all p-2 px-4 rounded-xl cursor-pointer ${
                      copied
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {copied ? 'Successfully Copied ✅' : 'Copy Output 📋'}
                  </button>
                )}
              </div>

              <div className="flex-1 bg-slate-55 border border-slate-100 bg-slate-50 rounded-2xl p-5 overflow-y-auto max-h-[170px]">
                {error ? (
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider">{error}</p>
                ) : translated ? (
                  <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed select-text">
                    {translated}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-10">
                    {loading ? 'AI Engine compiling lexical projections...' : 'Awaiting corpus input to begin synthesis...'}
                  </p>
                )}
              </div>

              {/* Action/Success highlight snippet */}
              <div className="mt-3 flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3 px-4">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Synthesizer Engine v3.5-Flash Grounded
                </span>
                {translated && (
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Corpus Aligned
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorporateTranslator;
