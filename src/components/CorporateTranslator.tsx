import React, { useState, useEffect } from 'react';
import { translateTechSpeak, generateJiraTicket, JiraTicketResult } from '../services/geminiService';

interface ModeOption {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  templates: { label: string; text: string }[];
}

interface ToneOption {
  id: string;
  name: string;
  emoji: string;
}

interface SavedJiraTicket extends JiraTicketResult {
  id: string;
  type: 'Task' | 'Story' | 'Bug';
  createdAt: string;
  status: 'To Do' | 'In Progress' | 'Done';
}

const MODULE_MODES: ModeOption[] = [
  {
    id: 'daily_status',
    name: 'Daily Standup Reporter',
    description: 'Transform quick dev bullets, raw work logs, or commits into a perfectly structured Standup Update (Yesterday, Today, Blockers).',
    placeholder: 'e.g. yesterday did API routing layout, today starting db auth middleware, blockers is waiting on DevOps to share Supbase secrets...',
    templates: [
      {
        label: 'Standup: Feature Work',
        text: 'yesterday: completed the main component design for the stock search bar. today: writing the yahoo finance proxy test cases and connecting state hooks. blockers: none, but waiting for devops to register the environment key.'
      },
      {
        label: 'Standup: Bug Fixing',
        text: 'yesterday: tracked down the memory leak causing the browser page freeze when typing queries. fixed it by cleaning up the useEffect resize observer. today: running linter validation across all components and pushing. blockers: none.'
      }
    ]
  },
  {
    id: 'jira_comment',
    name: 'Professional Jira Commenter',
    description: 'Elevate raw developer opinions, technical rebuttals, or code explanations into highly diplomatic, clear JIRA comment briefs.',
    placeholder: 'e.g. you are wrong, frontend breaks because you sent string instead of integer in payload, read my schema...',
    templates: [
      {
        label: 'Pushback: Schema Mismatch',
        text: 'the dashboard is crashing on load because the backend response sends string instead of integer in the pricing key. you need to update the serializer before I can sync my card. check line 104 in api.js.'
      },
      {
        label: 'Explanation: Delay in Delivery',
        text: 'this story is delayed by 2 days because the documentation on their third-party map gateway is completely outdated and we had to write custom fetch code to parse the lat longs. already resolved but waiting for qa approval.'
      }
    ]
  },
  {
    id: 'email_conv',
    name: 'Developer Email Polisher',
    description: 'Polish informal dev briefs, critical alerts, team help requests, or downtime notifications into executive-ready corporate emails.',
    placeholder: 'e.g. hey guys direct db is down since 2pm, our supbase connection pool hit max limit, need devops team to reboot the staging database right now...',
    templates: [
      {
        label: 'Alert: Staging Server Down',
        text: 'hey team, supabase is throwing connection timeout errors since 2 PM today. we hit the maximum connection limit on the staging pool. can someone from devops look into restarting the staging instance database fast? it is blocking our current release testing.'
      },
      {
        label: 'Request: Cross-Team API access',
        text: 'hey finance team, we need the live sandboxed upi api credentials to build the payment flow logic for our online customer registration. the current mock key you shared is expired. please share the new client id.'
      }
    ]
  },
  {
    id: 'tech_to_business',
    name: 'Tech Speak ➔ Business Worth',
    description: 'Translate pure tech definitions, backend jargon, or optimization work into strategic business value for Product Managers & Directors.',
    placeholder: 'e.g. spent 5 hours refactoring index query cache to reduce response from 3s to 200ms using redis indexing...',
    templates: [
      {
        label: 'Value: Query Optimization',
        text: 'reindexed the core PostgreSQL catalog tables and implemented a lazy-loading Redis query cache to bring API response down from 3 seconds to 150 milliseconds.'
      },
      {
        label: 'Value: Security Refactoring',
        text: 'migrated all localstorage critical API session payloads over to HttpOnly secure cookies and enabled double-hashed token hashing filters for incoming route gateways.'
      }
    ]
  }
];

const TONE_OPTIONS: ToneOption[] = [
  { id: 'diplomatic', name: 'Diplomatic & Polished', emoji: '🤵' },
  { id: 'direct', name: 'Direct & Professional', emoji: '⚔️' },
  { id: 'collaborative', name: 'Warm & Team-Centric', emoji: '🤝' },
  { id: 'eli5', name: 'ELI5 (Extreme Simplicity)', emoji: '👶' }
];

interface CorporateTranslatorProps {
  displayName: string;
}

const CorporateTranslator: React.FC<CorporateTranslatorProps> = ({ displayName }) => {
  // Tab control: 'translator' | 'jira'
  const [activeTab, setActiveTab] = useState<'translator' | 'jira'>('translator');

  // TRANSLATOR TAB STATES
  const [text, setText] = useState('');
  const [mode, setMode] = useState('daily_status');
  const [tone, setTone] = useState('diplomatic');
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JIRA CREATOR TAB STATES
  const [jiraReq, setJiraReq] = useState('');
  const [jiraType, setJiraType] = useState<'Task' | 'Story' | 'Bug'>('Task');
  const [jiraLoading, setJiraLoading] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<JiraTicketResult | null>(null);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [backlog, setBacklog] = useState<SavedJiraTicket[]>([]);
  const [selectedBacklogTicket, setSelectedBacklogTicket] = useState<SavedJiraTicket | null>(null);
  const [jiraCopied, setJiraCopied] = useState(false);

  // Load backlog on Mount
  useEffect(() => {
    const saved = localStorage.getItem('developer_agile_tickets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBacklog(parsed);
      } catch (e) {
        console.error('Error loading tickets backlog');
      }
    }
  }, []);

  // Save backlog changes
  const saveBacklogToStorage = (updatedBacklog: SavedJiraTicket[]) => {
    setBacklog(updatedBacklog);
    localStorage.setItem('developer_agile_tickets', JSON.stringify(updatedBacklog));
  };

  const currentModeObj = MODULE_MODES.find(m => m.id === mode) || MODULE_MODES[0];

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const selectedModeName = currentModeObj.name;
      const selectedToneName = TONE_OPTIONS.find(t => t.id === tone)?.name || tone;
      const result = await translateTechSpeak(text, selectedModeName, selectedToneName);
      setTranslated(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred during translation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (contentToCopy: string) => {
    if (!contentToCopy) return;
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setText('');
    setTranslated('');
    setError(null);
  };

  // Generate JIRA Ticket using AI Product Owner Logic
  const handleGenerateJira = async () => {
    if (!jiraReq.trim()) return;
    setJiraLoading(true);
    setJiraError(null);
    setJiraCopied(false);
    try {
      const result = await generateJiraTicket(jiraReq, jiraType);
      setGeneratedTicket(result);
    } catch (err: any) {
      setJiraError(err.message || 'Failed to generate Jira ticket details.');
    } finally {
      setJiraLoading(false);
    }
  };

  // Add a newly generated ticket to the local simulated Agile board
  const handleAddTicketToBacklog = () => {
    if (!generatedTicket) return;
    
    // Incremental JIRA ticket key
    const incrementNumber = backlog.length > 0 ? 
      Math.max(...backlog.map(t => parseInt(t.id.split('-')[1]))) + 1 : 
      101;
    
    const newSaved: SavedJiraTicket = {
      ...generatedTicket,
      id: `AJAY-${incrementNumber}`,
      type: jiraType,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'To Do'
    };

    const updated = [newSaved, ...backlog];
    saveBacklogToStorage(updated);
    setSelectedBacklogTicket(newSaved);
    setGeneratedTicket(null); // Clear active workspace to focus on the created ticket
    setJiraReq('');
  };

  // Delete a ticket from backlog
  const handleDeleteTicket = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = backlog.filter(t => t.id !== idToDelete);
    saveBacklogToStorage(updated);
    if (selectedBacklogTicket?.id === idToDelete) {
      setSelectedBacklogTicket(updated.length > 0 ? updated[0] : null);
    }
  };

  // Update Ticket Status
  const handleUpdateStatus = (idToUpdate: string, newStatus: 'To Do' | 'In Progress' | 'Done') => {
    const updated = backlog.map(t => t.id === idToUpdate ? { ...t, status: newStatus } : t);
    saveBacklogToStorage(updated);
    if (selectedBacklogTicket?.id === idToUpdate) {
      setSelectedBacklogTicket({ ...selectedBacklogTicket, status: newStatus });
    }
  };

  const copyTicketMarkdown = (ticket: JiraTicketResult, id?: string) => {
    const key = id || 'AJAY-TEMP';
    const textToCopy = `🎫 Jira Ticket ID: ${key}
Type: ${jiraType.toUpperCase()}
Title: ${ticket.title}
Story Points: ${ticket.suggestedPoints} SP | Priority: ${ticket.suggestedPriority}
Labels: ${ticket.labels.join(', ')}

===================
DESCRIPTION / USER NARRATIVE:
${ticket.description}

===================
TECHNICAL IMPLEMENTATION DETAILS:
${ticket.technicalDetails}

===================
ACCEPTANCE CRITERIA:
${ticket.acceptanceCriteria}`;

    navigator.clipboard.writeText(textToCopy);
    setJiraCopied(true);
    setTimeout(() => setJiraCopied(false), 2000);
  };

  return (
    <div className="animate-in space-y-8 pb-20">
      
      {/* Title & Introductory Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-100 text-[10px] font-black uppercase tracking-widest">
          AI Communications Suite for {displayName}
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
          Business English & Scrum Toolkit
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-relaxed">
          Streamline daily updates, draft professional Jira communications, and architecture flawless Jira stories with model-backed precision.
        </p>

        {/* Tab Selection */}
        <div className="flex justify-center gap-2 pt-2">
          <button
            onClick={() => setActiveTab('translator')}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'translator'
                ? 'bg-[#1E3A8A] text-white shadow-xl shadow-blue-900/10'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            💬 Developer Comms Translator
          </button>
          <button
            onClick={() => setActiveTab('jira')}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeTab === 'jira'
                ? 'bg-[#1E3A8A] text-white shadow-xl shadow-blue-900/10'
                : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            🎫 AI JIRA Ticket Architect
          </button>
        </div>
      </div>

      {activeTab === 'translator' ? (
        /* ==================== TRANSLATOR TAB ==================== */
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Controls - Left side */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 space-y-6 text-slate-800">
              <h3 className="text-sm font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4 flex items-center justify-between">
                <span>Translation Deck</span>
                <span className="text-xs font-bold text-slate-300">v3.5-Flash</span>
              </h3>

              {/* Translation Mode selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Target Scenario
                </label>
                <select
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    const chosen = MODULE_MODES.find(m => m.id === e.target.value);
                    if (chosen && chosen.templates.length > 0) {
                      setText(chosen.templates[0].text);
                    } else {
                      setText('');
                    }
                    setTranslated('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-2xl px-5 py-4 text-xs font-bold text-slate-800 outline-none transition-all cursor-pointer"
                >
                  {MODULE_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mt-1.5 leading-relaxed">
                  {currentModeObj.description}
                </p>
              </div>

              {/* Persona / Tone options */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Output Persona Tone
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                        tone === t.id
                          ? 'bg-blue-50/50 border-[#1E3A8A] text-[#1E3A8A] font-extrabold shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-500 font-bold'
                      }`}
                    >
                      <span className="text-base">{t.emoji}</span>
                      <span className="text-[9px] uppercase tracking-wider truncate leading-none">{t.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Developer Pre-fill templates */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  💡 Dev Snippet Templates
                </label>
                <div className="flex flex-col gap-2">
                  {currentModeObj.templates.map((tpl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setText(tpl.text);
                        setTranslated('');
                      }}
                      className="w-full text-left bg-slate-50 border border-slate-100 hover:border-[#1E3A8A]/30 p-2.5 rounded-xl transition-all cursor-pointer text-[9px] font-bold text-slate-600 truncate uppercase tracking-wide block"
                    >
                      🚀 Fill: <span className="text-[#1E3A8A]">{tpl.label}</span>
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
                  <span>Translating Tech Speak...</span>
                </>
              ) : (
                <>
                  <span>Align Business Language</span>
                  <span>⚡</span>
                </>
              )}
            </button>
          </div>

          {/* Source and Results pane - Right side */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-rows-2 gap-6 min-h-[500px]">
              
              {/* Input section */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col relative text-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Dev Jargon / Raw Draft
                  </span>
                  {text && (
                    <button
                      onClick={handleClear}
                      className="text-[9px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Clear Board
                    </button>
                  )}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={currentModeObj.placeholder}
                  className="flex-1 w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-2xl p-5 text-xs font-semibold text-slate-800 outline-none resize-none transition-all placeholder:text-slate-400 leading-relaxed"
                />
                <div className="absolute bottom-10 right-10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {text.length} Characters
                </div>
              </div>

              {/* Output section */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden text-slate-800">
                <div className="absolute top-0 left-0 w-1 bg-[#1E3A8A] h-full"></div>

                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest pl-2">
                    Polished Business Masterpiece
                  </span>
                  {translated && (
                    <button
                      onClick={() => handleCopy(translated)}
                      className={`text-[9px] font-black uppercase tracking-widest transition-all p-2 px-4 rounded-xl cursor-pointer ${
                        copied
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {copied ? 'Copied Successfully ✅' : 'Copy Result 📋'}
                    </button>
                  )}
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-5 overflow-y-auto max-h-[170px]">
                  {error ? (
                    <p className="text-xs font-bold text-red-500 uppercase tracking-wider">{error}</p>
                  ) : translated ? (
                    <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed select-text">
                      {translated}
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-10">
                      {loading ? 'AI Engine modeling linguistic components...' : 'Awaiting developer draft inputs...'}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3 px-4">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Synthesizer Engine v3.5-Flash Active
                  </span>
                  {translated && (
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Speech Restructured
                    </span>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      ) : (
        /* ==================== JIRA CREATOR TAB ==================== */
        <div className="space-y-8">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Ticket inputs - Left side */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-110 shadow-sm rounded-3xl p-8 space-y-6 text-slate-800">
                <h3 className="text-sm font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4">
                  Ticket Configuration
                </h3>

                {/* Ticket Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    JIRA Issue Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'Task', color: 'text-sky-600 bg-sky-50 border-sky-200', label: '🟦 Task' },
                      { type: 'Story', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: '🟩 Story' },
                      { type: 'Bug', color: 'text-rose-600 bg-rose-50 border-rose-200', label: '🟥 Bug' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => setJiraType(item.type as any)}
                        className={`py-3 px-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border text-center transition-all cursor-pointer ${
                          jiraType === item.type 
                            ? `${item.color} shadow-sm border-2 ring-1 ring-offset-2 ring-primary`
                            : 'bg-slate-5/50 border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Requirements input area */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                    <span>Developer Requirements</span>
                    <span className="text-[8px] text-slate-400">English / Jargon OK</span>
                  </label>
                  <textarea
                    value={jiraReq}
                    onChange={(e) => setJiraReq(e.target.value)}
                    placeholder="Provide simple developer notes, list of requirements, or user request..."
                    rows={6}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-2xl p-4 text-xs font-semibold text-slate-800 outline-none resize-none transition-all placeholder:text-slate-400 leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase">💡 Fill Examples:</span>
                    <button 
                      onClick={() => setJiraReq('we need to implement multi-factor authentication (MFA) via SMS OTP. When users log in, if they have MFA enabled, generate a 6-digit number, send it using Twilio, and save it in a cache with a 3-minute expiration limit. Show proper error feedback on frontend.')}
                      className="text-[8px] bg-slate-100 hover:bg-blue-50 hover:text-[#1E3A8A] text-slate-650 font-bold px-2 py-1 rounded transition-colors"
                    >
                      OTP Auth Flow
                    </button>
                    <button 
                      onClick={() => setJiraReq('the profile avatar upload is crashing when users try to upload image files bigger than 2MB. Staging server returns 413 Payload Too Large and we do not catch it on React. Need to compress on local browser client side or show a clean limit alert.')}
                      className="text-[8px] bg-slate-100 hover:bg-blue-50 hover:text-[#1E3A8A] text-slate-650 font-bold px-2 py-1 rounded transition-colors"
                    >
                      Avatar Upload Crash
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerateJira}
                disabled={jiraLoading || !jiraReq.trim()}
                className="w-full py-5 rounded-2xl bg-[#1E3A8A] hover:bg-blue-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-45 text-white font-black uppercase text-xs tracking-widest shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {jiraLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Fleshing Out ticket details...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Structured JIRA Ticket</span>
                    <span>🎫</span>
                  </>
                )}
              </button>
            </div>

            {/* Ticket workspace preview - Right side */}
            <div className="lg:col-span-7 space-y-6">
              {jiraError && (
                <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-red-600 font-bold text-xs uppercase tracking-wide">
                  {jiraError}
                </div>
              )}

              {generatedTicket ? (
                /* Ticket Workspace View right after generation */
                <div className="bg-white border-2 border-dashed border-blue-200/80 shadow-md rounded-[2.5rem] p-8 space-y-6 text-slate-800 relative select-text">
                  <div className="absolute top-4 right-4 bg-yellow-50 text-yellow-800 border border-yellow-250 text-[8px] font-black uppercase px-2.5 py-1 rounded tracking-wider animate-pulse">
                    Draft Preview
                  </div>

                  {/* Header mock values */}
                  <div className="flex items-center gap-2.5 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-50 pb-4">
                    <span>Ajay Projects</span>
                    <span>/</span>
                    <span className="text-slate-700 font-black">Backlog Architect</span>
                  </div>

                  <div className="space-y-2">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded flex-shrink-0 uppercase tracking-widest inline-block ${
                      jiraType === 'Bug' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      jiraType === 'Story' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                      'bg-sky-50 text-sky-700 border border-sky-100'
                    }`}>
                      {jiraType} Estimation
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      {generatedTicket.title}
                    </h3>
                  </div>

                  {/* Ticket Content */}
                  <div className="space-y-5 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 max-h-[300px] overflow-y-auto">
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{generatedTicket.description}</p>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Technical Spec Steps</h4>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed bg-white border border-slate-100 p-4 rounded-xl font-mono text-[10px]">{generatedTicket.technicalDetails}</p>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Acceptance Criteria</h4>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{generatedTicket.acceptanceCriteria}</p>
                    </div>
                  </div>

                  {/* Sidebar Metadata Layout Mock */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Story Points</p>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md inline-block mt-1">
                        ⭐ {generatedTicket.suggestedPoints} Points
                      </span>
                    </div>

                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Suggested Priority</p>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md inline-block mt-1">
                        🚨 {generatedTicket.suggestedPriority}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Labels</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedTicket.labels.map(l => (
                          <span key={l} className="text-[8px] text-[#1E3A8A] font-black uppercase tracking-wide bg-blue-50 px-1.5 py-0.5 rounded">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => copyTicketMarkdown(generatedTicket)}
                      className={`flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer text-center ${
                        jiraCopied 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {jiraCopied ? 'Copied Markdown! ✅' : '📋 Copy Markdown Ticket'}
                    </button>
                    <button
                      onClick={handleAddTicketToBacklog}
                      className="flex-1 py-3.5 rounded-xl bg-[#1E3A8A] hover:bg-blue-800 text-white font-black uppercase text-[10px] tracking-widest shadow-md transition-all cursor-pointer text-center"
                    >
                      📁 Commit to JIRA board
                    </button>
                  </div>
                </div>
              ) : selectedBacklogTicket ? (
                /* Selected Backlog Ticket interactive board view */
                <div className="bg-white border border-slate-100 shadow-md rounded-[2.5rem] p-8 space-y-6 text-slate-800 relative select-text">
                  
                  {/* Status Bar toggle */}
                  <div className="flex justify-between items-center border-b border-slate-55 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                      <span>Commitment Date: {selectedBacklogTicket.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Status:</label>
                      <select
                        value={selectedBacklogTicket.status}
                        onChange={(e) => handleUpdateStatus(selectedBacklogTicket.id, e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-[9px] font-extrabold uppercase cursor-pointer focus:outline-none"
                      >
                        <option value="To Do">📍 To Do</option>
                        <option value="In Progress">⚡ In Progress</option>
                        <option value="Done">✔ Done</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-mono text-xs font-black text-[#1E3A8A] uppercase tracking-widest p-1.5 px-3 rounded-lg bg-blue-50/70 border border-blue-150">
                        🎫 {selectedBacklogTicket.id}
                      </span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        selectedBacklogTicket.type === 'Bug' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        selectedBacklogTicket.type === 'Story' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250' :
                        'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {selectedBacklogTicket.type}
                      </span>
                    </div>

                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight pt-1">
                      {selectedBacklogTicket.title}
                    </h3>
                  </div>

                  {/* Details block */}
                  <div className="space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-100 max-h-[300px] overflow-y-auto">
                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">User Narrative Description</h4>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed select-text">{selectedBacklogTicket.description}</p>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Technical Blueprint Specifics</h4>
                      <div className="p-4 bg-white border border-slate-150 rounded-xl font-mono text-[9px] text-slate-650 leading-relaxed whitespace-pre-wrap">
                        {selectedBacklogTicket.technicalDetails}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Acceptance Criteria Checkpoints</h4>
                      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed select-text">{selectedBacklogTicket.acceptanceCriteria}</p>
                    </div>
                  </div>

                  {/* Metadata and Tag lists */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Velocity Estimate</p>
                      <span className="text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block mt-1">
                        ⭐ {selectedBacklogTicket.suggestedPoints} SP
                      </span>
                    </div>

                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Priority Ranking</p>
                      <span className="text-xs font-black text-slate-850 bg-slate-100 border border-slate-150 px-2 py-0.5 rounded-md inline-block mt-1">
                        🚨 {selectedBacklogTicket.suggestedPriority}
                      </span>
                    </div>

                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-extrabold text-slate-400">Labels</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedBacklogTicket.labels.map(l => (
                          <span key={l} className="text-[7px] text-[#1E3A8A] font-black uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom functional commands */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => copyTicketMarkdown(selectedBacklogTicket, selectedBacklogTicket.id)}
                      className={`flex-1 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer text-center ${
                        jiraCopied 
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {jiraCopied ? 'Copied Ticket MD! ✅' : '📋 Copy Entire Ticket'}
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteTicket(selectedBacklogTicket.id, e)}
                      className="py-3 px-5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-all font-black text-[9px] uppercase tracking-widest cursor-pointer text-center"
                    >
                      🗑 Delete
                    </button>
                  </div>

                </div>
              ) : (
                /* Empty Workspace placeholder */
                <div className="bg-white border-2 border-dashed border-slate-200/60 rounded-[3rem] p-12 text-center flex flex-col justify-center items-center min-h-[400px]">
                  <span className="text-5xl mb-4">🎟</span>
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider">Awaiting Ticket Parameters</h4>
                  <p className="text-xs font-bold text-slate-400 uppercase mt-2 max-w-sm leading-relaxed">
                    Write raw dev specifications on the left deck, select task type, and tap "Generate Structured JIRA Ticket" to instantiate model analysis.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* SIMULATED SCRUM ACCELERATOR BACKLOG BOARD - Full width below */}
          <div className="bg-white border border-slate-100 shadow-xl rounded-[3rem] p-8 space-y-6 text-slate-800">
            <h3 className="text-xs font-black uppercase text-[#1E3A8A] tracking-[0.2em] border-b border-slate-100 pb-4 flex justify-between items-center">
              <span>📋 Simulated JIRA Dev Board (Active Session)</span>
              <span className="text-[9px] font-black bg-[#1E3A8A] text-white px-2.5 py-0.5 rounded-full uppercase">
                {backlog.length} Tickets Committed
              </span>
            </h3>

            {backlog.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* BACKLOG COLUMN: TO DO */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">📍 TO DO</span>
                    <span className="text-[9px] bg-slate-200 font-extrabold text-slate-600 px-2 py-0.5 rounded-full">
                      {backlog.filter(t => t.status === 'To Do').length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {backlog.filter(t => t.status === 'To Do').map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedBacklogTicket(ticket)}
                        className={`p-4 bg-white border rounded-xl shadow-sm text-left transition-all cursor-pointer group hover:border-[#1E3A8A] ${
                          selectedBacklogTicket?.id === ticket.id ? 'border-2 border-[#1E3A8A] ring-1 ring-blue-100' : 'border-slate-200/70'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] font-black text-slate-500 tracking-wider">
                            {ticket.id}
                          </span>
                          <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            ticket.type === 'Bug' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                            ticket.type === 'Story' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            'bg-sky-50 text-sky-800 border border-sky-100'
                          }`}>
                            {ticket.type}
                          </span>
                        </div>
                        <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tight line-clamp-1 group-hover:text-[#1E3A8A] transition-colors">{ticket.title}</h4>
                        <div className="flex justify-between items-center mt-3 text-[8px] font-extrabold text-slate-450 uppercase text-slate-400">
                          <span>⭐ {ticket.suggestedPoints} SP</span>
                          <button 
                            onClick={(e) => handleDeleteTicket(ticket.id, e)}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {backlog.filter(t => t.status === 'To Do').length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-6">No tasks in backlog</p>
                    )}
                  </div>
                </div>

                {/* BACKLOG COLUMN: IN PROGRESS */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">⚡ IN PROGRESS</span>
                    <span className="text-[9px] bg-amber-100 font-extrabold text-amber-700 px-2 py-0.5 rounded-full">
                      {backlog.filter(t => t.status === 'In Progress').length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {backlog.filter(t => t.status === 'In Progress').map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedBacklogTicket(ticket)}
                        className={`p-4 bg-white border rounded-xl shadow-sm text-left transition-all cursor-pointer group hover:border-[#1E3A8A] ${
                          selectedBacklogTicket?.id === ticket.id ? 'border-2 border-[#1E3A8A] ring-1 ring-blue-100' : 'border-slate-200/70'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] font-black text-slate-500 tracking-wider">
                            {ticket.id}
                          </span>
                          <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            ticket.type === 'Bug' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                            ticket.type === 'Story' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            'bg-sky-50 text-sky-800 border border-sky-100'
                          }`}>
                            {ticket.type}
                          </span>
                        </div>
                        <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tight line-clamp-1 group-hover:text-[#1E3A8A] transition-colors">{ticket.title}</h4>
                        <div className="flex justify-between items-center mt-3 text-[8px] font-extrabold text-slate-450 uppercase text-slate-400">
                          <span>⭐ {ticket.suggestedPoints} SP</span>
                          <button 
                            onClick={(e) => handleDeleteTicket(ticket.id, e)}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {backlog.filter(t => t.status === 'In Progress').length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-6">No tasks in progress</p>
                    )}
                  </div>
                </div>

                {/* BACKLOG COLUMN: DONE */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✔ DONE</span>
                    <span className="text-[9px] bg-emerald-100 font-extrabold text-emerald-700 px-2 py-0.5 rounded-full">
                      {backlog.filter(t => t.status === 'Done').length}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {backlog.filter(t => t.status === 'Done').map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedBacklogTicket(ticket)}
                        className={`p-4 bg-white border rounded-xl shadow-sm text-left transition-all cursor-pointer group hover:border-[#1E3A8A] ${
                          selectedBacklogTicket?.id === ticket.id ? 'border-2 border-[#1E3A8A] ring-1 ring-blue-100' : 'border-slate-200/70'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2 mb-1.5">
                          <span className="font-mono text-[9px] font-black text-slate-500 tracking-wider">
                            {ticket.id}
                          </span>
                          <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            ticket.type === 'Bug' ? 'bg-rose-50 text-rose-800 border border-rose-100' :
                            ticket.type === 'Story' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                            'bg-sky-50 text-sky-800 border border-sky-100'
                          }`}>
                            {ticket.type}
                          </span>
                        </div>
                        <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-tight line-clamp-1 group-hover:text-[#1E3A8A] transition-colors text-slate-400 line-through">{ticket.title}</h4>
                        <div className="flex justify-between items-center mt-3 text-[8px] font-extrabold text-slate-450 uppercase text-slate-400">
                          <span>⭐ {ticket.suggestedPoints} SP</span>
                          <button 
                            onClick={(e) => handleDeleteTicket(ticket.id, e)}
                            className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {backlog.filter(t => t.status === 'Done').length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center py-6">No completed tasks yet</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-12 border border-slate-100 text-center rounded-2xl bg-slate-50/20">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Agile commitment backlog is empty.
                </p>
                <p className="text-[9px] text-slate-400 uppercase font-black mt-2">
                  Generate your first JIRA Task or Bug above, and click "Commit to JIRA board" to view it here!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CorporateTranslator;
