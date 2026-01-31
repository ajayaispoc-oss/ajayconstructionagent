
import React, { useState, useEffect } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, TimelineEvent } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList } from './services/geminiService';

const LOADING_MESSAGES = [
  "Fetching 2026 Hyderabad Price Index...",
  "Calculating Troop Bazaar material logic...",
  "Planning weekly labor deployment...",
  "Generating architectural 3D view...",
  "Finalizing Project Ledger entry..."
];

const MARKET_TICKER = [
  "UltraTech Cement: ₹415/bag",
  "Vizag TMT 12mm: ₹72,400/ton",
  "Finolex 2.5mm: ₹2,150/coil",
  "Asian Paints Royale: ₹590/Ltr",
  "M-Sand (Cubic Ft): ₹45",
  "AAC Block (Red): ₹4,800/unit"
];

interface SavedEstimate extends EstimationResult {
  id: string;
  clientName: string;
  date: string;
  taskTitle: string;
  area: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'raw_materials'>('quotes');
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [estimate, setEstimate] = useState<EstimationResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedEstimate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [marketPrices, setMarketPrices] = useState<MarketPriceList | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ajay_quote_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (activeTab === 'raw_materials' && !marketPrices) fetchMarketPrices();
  }, [activeTab]);

  const fetchMarketPrices = async () => {
    setPricesLoading(true);
    try {
      const data = await getRawMaterialPriceList();
      setMarketPrices(data);
    } catch (err) { console.error(err); } 
    finally { setPricesLoading(false); }
  };

  // Fix: Added handleInputChange to manage form state updates and resolve reference errors
  const handleInputChange = (name: string, value: any) => {
    setFormInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaskSelect = (task: TaskConfig) => {
    setSelectedTask(task);
    setEstimate(null);
    setGeneratedImage(null);
    setFormInputs({});
    setError(null);
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getConstructionEstimate(selectedTask.id, formInputs);
      setEstimate(result);
      const imageUrl = await generateDesignImage(result.visualPrompt);
      setGeneratedImage(imageUrl);

      const newSaved: SavedEstimate = {
        ...result,
        id: Math.random().toString(36).substr(2, 9),
        clientName: formInputs.clientName || 'Unnamed Project',
        date: new Date().toLocaleString('en-IN'),
        taskTitle: selectedTask.title,
        area: formInputs.area_location || 'Hyderabad'
      };
      const updatedHistory = [newSaved, ...history].slice(0, 15);
      setHistory(updatedHistory);
      localStorage.setItem('ajay_quote_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      setError(err.message || "Estimation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!estimate) return;
    const text = `*Ajay Construction Hub - Quotation*%0A
Project: ${selectedTask?.title}%0A
Location: ${formInputs.area_location}%0A
Total: ₹${estimate.totalEstimatedCost.toLocaleString('en-IN')}%0A
Timeline: ${estimate.estimatedDays} Days%0A%0A
View your render here: [AI Generated Render attached]`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F9FBFF] font-sans text-slate-900 selection:bg-blue-100">
      {/* Ledger Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <h3 className="text-xl font-black uppercase text-[#1E3A8A]">Project Ledger</h3>
              <button onClick={() => setShowHistory(false)} className="bg-slate-100 p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors">✕</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <div className="text-4xl mb-4">📂</div>
                  <p className="font-bold">No saved quotes found</p>
                </div>
              ) : history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => { setEstimate(item); setShowHistory(false); setActiveTab('quotes'); setSelectedTask(CONSTRUCTION_TASKS.find(t => t.id === item.category) || null); }}
                  className="p-5 border border-slate-100 rounded-3xl hover:border-[#1E3A8A] hover:bg-blue-50/50 cursor-pointer transition-all active:scale-95"
                >
                  <p className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-wider">{item.taskTitle} • {item.area}</p>
                  <p className="font-bold text-slate-800 text-lg mt-1">{item.clientName}</p>
                  <div className="flex justify-between items-end mt-4">
                    <p className="text-xs text-slate-400">{item.date}</p>
                    <p className="font-black text-[#1E3A8A]">₹{item.totalEstimatedCost.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRINT VIEW */}
      {estimate && (
        <div className="hidden print:block p-16 text-black bg-white">
          <div className="border-t-[12px] border-[#1E3A8A] pt-12">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-5xl font-black text-[#1E3A8A] uppercase tracking-tighter">Ajay Engineering</h1>
                <p className="text-sm font-bold text-slate-500 mt-2 uppercase">Certified Real Estate Estimator • Jan 2026</p>
              </div>
              <div className="text-right">
                <p className="font-black text-[#1E3A8A] uppercase text-xs mb-1">Quotation ID</p>
                <p className="font-bold">#AJ-{Math.floor(Math.random()*100000)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-12 bg-slate-50 p-8 rounded-2xl">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Project Details</p>
                <p className="text-lg font-bold">{selectedTask?.title} - {formInputs.project_subtype || 'General'}</p>
                <p className="text-slate-600">{formInputs.area_location}, Hyderabad</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Client Reference</p>
                <p className="text-lg font-bold underline underline-offset-4">{formInputs.clientName}</p>
              </div>
            </div>

            <table className="w-full text-left mb-12">
              <thead className="border-b-4 border-[#1E3A8A]">
                <tr>
                  <th className="py-4 font-black uppercase text-xs">Material / Description</th>
                  <th className="py-4 font-black uppercase text-xs">Spec/Brand</th>
                  <th className="py-4 font-black uppercase text-xs text-right">Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                {estimate.materials.map((m, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-4 font-bold">{m.name} <span className="text-[10px] text-slate-400 block">{m.quantity}</span></td>
                    <td className="py-4 italic text-sm text-slate-600">{m.brandSuggestion}</td>
                    <td className="py-4 text-right font-bold">{m.totalPrice.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#1E3A8A] text-white">
                  <td colSpan={2} className="py-6 px-4 font-black text-2xl uppercase">Estimated Total</td>
                  <td className="py-6 px-4 text-right font-black text-2xl">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>

            <div className="grid grid-cols-2 gap-12 text-xs">
              <div>
                <p className="font-black uppercase mb-2">Terms & Safety</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-500">
                  {estimate.precautions.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl">
                <p className="font-black uppercase mb-2">Expert Consultation</p>
                <p className="italic text-slate-600">"{estimate.expertTips}"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WEB INTERFACE */}
      <div className="print:hidden">
        <div className="bg-[#1E3A8A] py-2.5 overflow-hidden whitespace-nowrap shadow-md">
          <div className="inline-block animate-marquee">
            {MARKET_TICKER.concat(MARKET_TICKER).map((text, i) => (
              <span key={i} className="text-[11px] font-black text-blue-100 uppercase tracking-widest mx-12 opacity-90">{text}</span>
            ))}
          </div>
        </div>

        <header className="bg-white/80 backdrop-blur-md py-5 px-6 shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-5 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {setSelectedTask(null); setEstimate(null);}}>
              <div className="bg-[#1E3A8A] w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-200">🏗️</div>
              <div>
                <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">Ajay Engineering</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hyderabad Agent Portal • 2026 Forecast</p>
              </div>
            </div>
            <nav className="flex items-center gap-3">
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                <button onClick={() => setActiveTab('quotes')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'quotes' ? 'bg-[#1E3A8A] text-white shadow-md' : 'text-slate-500 hover:text-[#1E3A8A]'}`}>Estimates</button>
                <button onClick={() => setActiveTab('raw_materials')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'raw_materials' ? 'bg-[#1E3A8A] text-white shadow-md' : 'text-slate-500 hover:text-[#1E3A8A]'}`}>Market</button>
              </div>
              <button onClick={() => setShowHistory(true)} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-lg hover:border-[#1E3A8A] hover:bg-blue-50 transition-all shadow-sm">📜</button>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-12">
          {activeTab === 'quotes' ? (
            !selectedTask ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-16">
                  <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">Start a Project</h2>
                  <p className="text-slate-500 font-medium">Select a service to generate a hyper-local 2026 quotation.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {CONSTRUCTION_TASKS.map((task) => (
                    <button key={task.id} onClick={() => handleTaskSelect(task)} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-[#1E3A8A] hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-2 transition-all text-left group overflow-hidden relative">
                      <div className="absolute top-[-20px] right-[-20px] text-8xl opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">{task.icon}</div>
                      <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left">{task.icon}</div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">{task.title}</h3>
                      <p className="text-sm text-slate-400 mt-3 font-medium leading-relaxed">{task.description}</p>
                      <div className="mt-8 flex items-center gap-2 text-[#1E3A8A] font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        Configure Project <span>→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 sticky top-32 animate-in fade-in slide-in-from-left-4">
                  <button onClick={() => {setSelectedTask(null); setEstimate(null);}} className="flex items-center gap-2 text-[10px] font-black text-[#1E3A8A] mb-8 uppercase hover:gap-3 transition-all">
                    <span>←</span> Return to Services
                  </button>
                  <form onSubmit={handleCalculate} className="space-y-6">
                    <div className="group">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block group-focus-within:text-[#1E3A8A]">Client Reference</label>
                      <input required type="text" placeholder="e.g., Mr. Reddy's Villa" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] focus:bg-white outline-none font-bold transition-all" onChange={(e) => handleInputChange('clientName', e.target.value)} />
                    </div>
                    {selectedTask.fields.map(field => {
                      const isVisible = !field.dependsOn || formInputs[field.dependsOn] === field.showIfValue;
                      if (!isVisible) return null;

                      return (
                        <div key={field.name} className="animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">{field.label}</label>
                          {field.type === 'select' ? (
                            <select required className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold appearance-none cursor-pointer" onChange={(e) => handleInputChange(field.name, e.target.value)}>
                              <option value="">{field.placeholder}</option>
                              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input required type={field.type} placeholder={field.placeholder} className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" onChange={(e) => handleInputChange(field.name, e.target.value)} />
                          )}
                        </div>
                      );
                    })}
                    <button disabled={loading} type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:shadow-blue-200 active:scale-95 transition-all disabled:opacity-50">
                      {loading ? "Analyzing Context..." : "Generate Engineering Quote"}
                    </button>
                    {loading && (
                      <div className="text-center pt-2">
                        <p className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest">{LOADING_MESSAGES[loadingMsgIdx]}</p>
                      </div>
                    )}
                  </form>
                </div>

                <div className="lg:col-span-8 space-y-8 min-h-[600px]">
                  {estimate ? (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 mb-8 gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Quote Live</h2>
                          </div>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Zone: {formInputs.area_location} • Level: {formInputs.quality_grade}</p>
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                          <button onClick={() => window.print()} className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all">🖨️ Print PDF</button>
                          <button onClick={handleWhatsAppShare} className="flex-1 md:flex-none bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">📱 WhatsApp</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#1E3A8A] text-white p-10 rounded-[3rem] shadow-xl shadow-blue-100">
                          <p className="text-[10px] opacity-60 uppercase font-black tracking-widest mb-1">Project Budget</p>
                          <h4 className="text-4xl font-black tracking-tighter">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</h4>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-md">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Labor Capital</p>
                          <h4 className="text-4xl font-black tracking-tighter text-slate-800">₹{estimate.laborCost.toLocaleString('en-IN')}</h4>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-md">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Duration</p>
                          <h4 className="text-4xl font-black tracking-tighter text-emerald-600">{estimate.estimatedDays} Days</h4>
                        </div>
                      </div>

                      {generatedImage && (
                        <div className="relative group">
                          <img src={generatedImage} className="w-full h-[450px] object-cover rounded-[3.5rem] shadow-2xl mb-8 border-4 border-white transition-transform duration-700 group-hover:scale-[1.01]" alt="Architectural Render" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-[3.5rem] pointer-events-none"></div>
                          <div className="absolute bottom-12 left-12">
                            <p className="text-white text-xs font-black uppercase tracking-[0.2em] drop-shadow-md">AI Render: 2026 {formInputs.quality_grade} Finish</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Breakdown */}
                        <div className="md:col-span-7 bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
                          <div className="p-8 bg-slate-50/50 border-b flex items-center justify-between">
                            <span className="font-black uppercase text-lg tracking-tighter">Material Audit</span>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Jan 2026 Prices</span>
                          </div>
                          <div className="p-2">
                            <table className="w-full text-left">
                              <tbody>
                                {estimate.materials.map((m, idx) => (
                                  <tr key={idx} className="group border-b border-slate-50 last:border-0">
                                    <td className="p-6">
                                      <p className="font-black text-slate-800 uppercase text-sm group-hover:text-[#1E3A8A] transition-colors">{m.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Spec: {m.brandSuggestion}</p>
                                    </td>
                                    <td className="p-6 text-right">
                                      <p className="font-black text-lg text-slate-900">₹{m.totalPrice.toLocaleString('en-IN')}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{m.quantity}</p>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Timeline & Tips */}
                        <div className="md:col-span-5 space-y-8">
                          {estimate.timeline && (
                            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl p-8">
                              <h5 className="font-black uppercase text-sm tracking-widest mb-6 text-[#1E3A8A]">Execution Timeline</h5>
                              <div className="space-y-6">
                                {estimate.timeline.map((event, idx) => (
                                  <div key={idx} className="flex gap-4 items-start relative">
                                    {idx !== estimate.timeline!.length - 1 && <div className="absolute left-3 top-8 bottom-[-24px] w-0.5 bg-slate-100"></div>}
                                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-black text-[#1E3A8A] shrink-0 z-10">{event.week}</div>
                                    <div>
                                      <p className="font-bold text-sm text-slate-800 leading-tight">{event.activity}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Week {event.week} • Target</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-blue-600 rounded-[3rem] p-8 text-white shadow-xl shadow-blue-100">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-2xl">💡</span>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Agent Advisory</p>
                            </div>
                            <p className="font-bold text-lg leading-relaxed italic">"{estimate.expertTips}"</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-20 border-4 border-dashed border-slate-100 rounded-[4rem] opacity-50">
                      <div className="text-8xl mb-8">📋</div>
                      <h3 className="text-2xl font-black text-slate-300 uppercase">Awaiting Configuration</h3>
                      <p className="text-slate-400 mt-2 max-w-xs">Fill out the project details on the left to generate your custom engineering quote.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            /* MARKET VIEW */
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center mb-16">
                  <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-4">Market Matrix</h2>
                  <p className="text-slate-500 font-medium">Real-time procurement rates for Hyderabad clusters.</p>
                </div>
              {pricesLoading ? (
                <div className="text-center py-40">
                  <div className="w-16 h-16 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Scanning Troop Bazaar Inventory...</p>
                </div>
              ) : marketPrices?.categories.map((cat, i) => (
                <div key={i} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden mb-12 animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-8 bg-slate-50/80 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">{cat.title}</h3>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Verified Date</p>
                      <p className="text-xs font-bold text-[#1E3A8A]">{marketPrices.lastUpdated}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto p-4">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase text-slate-400 border-b"><th className="px-6 py-4 tracking-widest">Brand</th><th className="px-6 py-4 tracking-widest">Spec</th><th className="px-6 py-4 text-right tracking-widest">Price (Incl. GST)</th></tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item, j) => (
                          <tr key={j} className="group border-b border-slate-50 hover:bg-blue-50/50 transition-colors">
                            <td className="px-6 py-6">
                              <p className="font-black text-slate-800 uppercase text-lg group-hover:text-[#1E3A8A] transition-all">{item.brandName}</p>
                              <div className={`text-[9px] font-black uppercase mt-1 inline-block px-2 py-0.5 rounded ${item.trend === 'up' ? 'bg-red-50 text-red-500' : item.trend === 'down' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>Trend: {item.trend}</div>
                            </td>
                            <td className="px-6 py-6 text-sm font-medium text-slate-500">{item.specificType}</td>
                            <td className="px-6 py-6 text-right">
                              <p className="text-2xl font-black text-[#1E3A8A]">₹{item.priceWithGst.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">per {item.unit}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: inline-block; animation: marquee 40s linear infinite; }
        @media print { .print\\:hidden { display: none !important; } }
      `}</style>
    </div>
  );
};

export default App;
