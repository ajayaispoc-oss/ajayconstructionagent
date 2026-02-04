
import React, { useState, useEffect } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, UserData } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList } from './services/geminiService';

const LOADING_MESSAGES = [
  "Fetching 2026 Hyderabad Price Index...",
  "Analyzing Troop Bazaar material trends...",
  "Calculating labor logistics for your zone...",
  "Generating 3D Architectural Vision...",
  "Compiling professional engineering ledger..."
];

const MARKET_TICKER = [
  "UltraTech Cement: ₹415/bag",
  "Vizag TMT 12mm: ₹72,400/ton",
  "Finolex 2.5mm: ₹2,150/coil",
  "Asian Paints Royale: ₹590/Ltr",
  "M-Sand (Cubic Ft): ₹45",
  "AAC Block: ₹4,800/unit"
];

interface SavedEstimate extends EstimationResult {
  id: string;
  clientName: string;
  date: string;
  taskTitle: string;
  area: string;
  subtype?: string;
}

type AppView = 'calculator' | 'market' | 'invoice';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('calculator');
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [estimate, setEstimate] = useState<EstimationResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedEstimate[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Lead & Tracking State
  const [requestCount, setRequestCount] = useState<number>(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'calculate' | 'order' | 'invoice' | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Market specific state
  const [marketData, setMarketData] = useState<MarketPriceList | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ajay_quote_history');
    const savedCount = localStorage.getItem('ajay_request_count');
    const savedUser = localStorage.getItem('ajay_user_data');
    
    if (saved) setHistory(JSON.parse(saved));
    if (savedCount) setRequestCount(parseInt(savedCount));
    if (savedUser) setUserData(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchMarketPrices = async () => {
    setMarketLoading(true);
    try {
      const data = await getRawMaterialPriceList();
      setMarketData(data);
    } catch (err) {
      console.error("Failed to fetch market data", err);
    } finally {
      setMarketLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'market' && !marketData) {
      fetchMarketPrices();
    }
  }, [view]);

  const handleInputChange = (name: string, value: any) => {
    setFormInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleTaskSelect = (task: TaskConfig) => {
    setSelectedTask(task);
    setEstimate(null);
    setGeneratedImage(null);
    setFormInputs({});
    setError(null);
    setView('calculator');
  };

  const executeCalculation = async () => {
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
        clientName: formInputs.clientName || 'New Project',
        date: new Date().toLocaleDateString('en-IN'),
        taskTitle: selectedTask.title,
        area: formInputs.area_location || 'Hyderabad',
        subtype: formInputs.project_subtype
      };
      
      const updatedHistory = [newSaved, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('ajay_quote_history', JSON.stringify(updatedHistory));
      
      const nextCount = requestCount + 1;
      setRequestCount(nextCount);
      localStorage.setItem('ajay_request_count', nextCount.toString());
    } catch (err: any) {
      setError(err.message || "Estimation failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const checkAccessAndRun = (action: 'calculate' | 'order' | 'invoice') => {
    if (action === 'calculate' && requestCount === 0) {
      executeCalculation();
      return;
    }

    if (!userData) {
      setPendingAction(action);
      setShowLeadForm(true);
    } else {
      if (action === 'calculate') executeCalculation();
      else if (action === 'invoice') setView('invoice');
      else if (action === 'order') {
        if (!agreedToTerms) {
          alert("Please review and agree to the Terms & Conditions at the bottom of the invoice before placing an order.");
          setView('invoice');
          return;
        }
        alert(`Order request sent for ${formInputs.clientName || 'Project'}. Our agent will contact you at ${userData.phone}. Work will be scheduled per the agreed timeline with a 15-day grace period.`);
      }
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const user: UserData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      company: formData.get('company') as string,
    };
    setUserData(user);
    localStorage.setItem('ajay_user_data', JSON.stringify(user));
    setShowLeadForm(false);
    
    if (pendingAction === 'calculate') executeCalculation();
    else if (pendingAction === 'invoice') setView('invoice');
    else if (pendingAction === 'order') alert(`Order request received. Thank you, ${user.name}!`);
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F9FBFF] font-sans text-slate-900">
      {/* Market Ticker */}
      <div className="bg-[#1E3A8A] py-2 overflow-hidden whitespace-nowrap shadow-md">
        <div className="inline-block animate-marquee">
          {MARKET_TICKER.concat(MARKET_TICKER).map((text, i) => (
            <span key={i} className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mx-10 opacity-70">{text}</span>
          ))}
        </div>
      </div>

      {/* Lead Capture Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowLeadForm(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
            <div className="text-center mb-10">
              <div className="w-16 h-16 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl">💼</div>
              <h3 className="text-2xl font-black uppercase text-[#1E3A8A] tracking-tighter">Professional Access</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Unlock Engineering Reports & Orders</p>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <input required name="name" type="text" placeholder="Your Full Name" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
              <input required name="phone" type="tel" placeholder="Mobile Number" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
              <input required name="email" type="email" placeholder="Email Address" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
              <input name="company" type="text" placeholder="Company (Optional)" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
              <button type="submit" className="w-full bg-[#1E3A8A] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all">
                Continue to Portal
              </button>
              <p className="text-[9px] text-center text-slate-400 uppercase tracking-widest font-bold">Safe & Encrypted • 2026 Agent Protocol</p>
            </form>
          </div>
        </div>
      )}

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <div>
                <h3 className="text-xl font-black uppercase text-[#1E3A8A]">Project Ledger</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saved Quotes</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-2xl hover:rotate-90 transition-transform">✕</button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4">
              {history.length === 0 ? (
                <p className="text-center text-slate-300 py-20 font-bold uppercase text-xs">No saved projects yet</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="p-4 border border-slate-100 rounded-2xl hover:border-[#1E3A8A] hover:bg-blue-50 transition-all cursor-pointer group" onClick={() => {setEstimate(item); setShowHistory(false); setView('calculator'); setSelectedTask(CONSTRUCTION_TASKS.find(t => t.title === item.taskTitle) || null);}}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-bold text-[#1E3A8A] uppercase">{item.taskTitle} {item.subtype ? `(${item.subtype})` : ''}</p>
                      <p className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{item.date}</p>
                    </div>
                    <p className="font-bold text-slate-800 text-lg group-hover:text-[#1E3A8A] transition-colors">{item.clientName}</p>
                    <div className="flex justify-between mt-3 items-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.area}</p>
                      <p className="font-black text-[#1E3A8A] text-sm">₹{item.totalEstimatedCost.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b py-6 px-8 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => {setSelectedTask(null); setEstimate(null); setView('calculator');}}>
            <div className="bg-[#1E3A8A] w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform">🏗️</div>
            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">Ajay Construction Agent</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Agent Portal • {userData ? `Welcome, ${userData.name.split(' ')[0]}` : '2026 Index'}</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
            <button 
              onClick={() => setView('calculator')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calculator' ? 'bg-white shadow-sm text-[#1E3A8A]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Estimator
            </button>
            <button 
              onClick={() => setView('market')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'market' ? 'bg-white shadow-sm text-[#1E3A8A]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Market Watch
            </button>
          </nav>

          <div className="flex gap-4">
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 hover:border-[#1E3A8A] hover:bg-white transition-all group">
              <span className="text-xs font-black uppercase text-slate-500 group-hover:text-[#1E3A8A] tracking-widest">Ledger</span>
              <span className="text-lg">📜</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {view === 'invoice' && estimate ? (
          <div className="bg-white p-16 rounded-[4rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500 max-w-4xl mx-auto">
             <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
                <div>
                   <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">Engineering Invoice</h2>
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Project: {formInputs.clientName || 'New Construction'}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#1E3A8A] mb-1">Generated By</p>
                   <p className="font-black text-xl text-slate-800 uppercase">Ajay Construction Agent</p>
                   <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Bill To:</h4>
                   <p className="text-xl font-black text-slate-800 uppercase leading-none">{userData?.name || 'Valued Client'}</p>
                   <p className="font-bold text-slate-500 text-sm mt-2">{userData?.phone || 'Contact Provided'}</p>
                   <p className="font-bold text-slate-500 text-sm">{userData?.email}</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Service Scope:</h4>
                   <p className="text-xl font-black text-slate-800 uppercase leading-none">{selectedTask?.title}</p>
                   <p className="font-bold text-slate-500 text-sm mt-2">{formInputs.area_location}, Hyderabad</p>
                   <p className="font-bold text-slate-500 text-sm">{formInputs.quality_grade} Specifications</p>
                </div>
             </div>

             <table className="w-full mb-12">
                <thead>
                   <tr className="bg-slate-900 text-white">
                      <th className="p-4 text-left font-black uppercase text-[10px] tracking-widest">Material Breakdown</th>
                      <th className="p-4 text-center font-black uppercase text-[10px] tracking-widest">Quantity</th>
                      <th className="p-4 text-right font-black uppercase text-[10px] tracking-widest">Total (₹)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {estimate.materials.map((m, i) => (
                      <tr key={i}>
                         <td className="p-4 py-6">
                            <p className="font-black text-slate-800 text-sm uppercase">{m.name}</p>
                            <p className="text-[9px] font-bold text-[#1E3A8A] uppercase tracking-widest">{m.brandSuggestion}</p>
                         </td>
                         <td className="p-4 text-center font-bold text-slate-600 uppercase text-xs">{m.quantity}</td>
                         <td className="p-4 text-right font-black text-slate-900">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                      </tr>
                   ))}
                   <tr className="bg-slate-50">
                      <td className="p-4 py-6 font-black uppercase text-xs">Labor & Engineering Charges</td>
                      <td></td>
                      <td className="p-4 text-right font-black text-slate-900">₹{estimate.laborCost.toLocaleString('en-IN')}</td>
                   </tr>
                </tbody>
             </table>

             <div className="flex justify-end pt-10 border-t-2 border-slate-900 mb-12">
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Grand Total Estimate</p>
                   <p className="text-6xl font-black tracking-tighter text-slate-900 leading-none">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</p>
                </div>
             </div>

             {/* Legal Terms & Conditions Section */}
             <div className="bg-slate-50 rounded-[2.5rem] p-10 mb-12 border border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
                   Legal Terms & Engineering Guarantee <span className="text-blue-600">⚖️</span>
                </h3>
                <div className="space-y-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-relaxed">
                   <div className="flex gap-4">
                      <span className="text-slate-900 min-w-[20px]">01.</span>
                      <p><span className="text-slate-900">Timeline & Grace Period:</span> The project shall be completed within the estimated timeline of <span className="text-slate-900 underline">{estimate.estimatedDays} days</span>. A standard grace period of <span className="text-slate-900 underline">15 working days</span> is applicable beyond the estimated date for unforeseen logistics or weather delays.</p>
                   </div>
                   <div className="flex gap-4">
                      <span className="text-slate-900 min-w-[20px]">02.</span>
                      <p><span className="text-slate-900">Delivery Guarantee:</span> If the work is NOT completed within the combined period (Agreed Timeline + 15 Working Days Grace), a <span className="text-red-600 font-black">10% Refund of the total contract value</span> will be issued to the client as a professional penalty for the delay.</p>
                   </div>
                   <div className="flex gap-4">
                      <span className="text-slate-900 min-w-[20px]">03.</span>
                      <p><span className="text-slate-900">Modification Freeze:</span> To ensure adherence to the timeline, the client must not request any modifications to the existing Work Order at least <span className="text-slate-900 underline">30 days prior</span> to the scheduled completion date. No modifications will be entertained within the final 30-day window.</p>
                   </div>
                   <div className="flex gap-4">
                      <span className="text-slate-900 min-w-[20px]">04.</span>
                      <p><span className="text-slate-900">Pricing Validity:</span> This invoice is based on the Jan 2026 Hyderabad Price Index and is valid for 15 days from the date of generation.</p>
                   </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 flex items-center gap-4 group cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                   <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${agreedToTerms ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-300'}`}>
                      {agreedToTerms && <span className="text-white text-lg">✓</span>}
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">I have read and agree to the legal terms and project delivery guarantee.</span>
                </div>
             </div>

             <div className="mt-10 pt-10 border-t border-dashed border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-widest">
                   * This is an AI-generated engineering estimation and formal contract draft. Final signatures required at Troop Bazaar regional office before ground breaking.
                </div>
                <div className="flex justify-end gap-4 print:hidden">
                   <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-colors">Print / Export PDF</button>
                   <button 
                     disabled={!agreedToTerms}
                     onClick={() => checkAccessAndRun('order')} 
                     className={`px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all ${agreedToTerms ? 'bg-[#1E3A8A] text-white shadow-blue-100 hover:scale-105' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                   >
                     Confirm Work Order
                   </button>
                </div>
             </div>
          </div>
        ) : view === 'market' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Market Watch</h2>
                  <p className="text-slate-500 font-medium mt-2">Real-time construction material indices for Hyderabad & Telangana.</p>
                </div>
                <div className="bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest">Last Feed Update</p>
                  <p className="text-sm font-bold text-slate-700">{marketData?.lastUpdated || 'Syncing...'}</p>
                </div>
             </div>

             {marketLoading ? (
               <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1E3A8A] rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#1E3A8A] animate-pulse">Syncing with Troop Bazaar & Sanathnagar Indices...</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {marketData?.categories.map((cat, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden flex flex-col">
                      <div className="p-8 bg-slate-50/50 border-b flex justify-between items-center">
                        <h3 className="font-black uppercase text-sm tracking-widest text-[#1E3A8A]">{cat.title}</h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm">{cat.items.length} Items</span>
                      </div>
                      <div className="p-6 flex-grow space-y-4">
                        {cat.items.map((item, j) => (
                          <div key={j} className="flex justify-between items-center group">
                            <div>
                              <p className="font-black text-slate-800 text-sm leading-none">{item.brandName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{item.specificType}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900 leading-none">₹{item.priceWithGst.toLocaleString('en-IN')}</p>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/{item.unit}</span>
                                {item.trend === 'up' && <span className="text-[8px] text-red-500 font-black">▲</span>}
                                {item.trend === 'down' && <span className="text-[8px] text-emerald-500 font-black">▼</span>}
                                {item.trend === 'stable' && <span className="text-[8px] text-slate-300 font-black">▬</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        ) : (
          /* Calculator View */
          !selectedTask ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Construction Intelligence</h2>
                <p className="text-slate-500 font-medium max-w-2xl mx-auto">Generate precision engineering estimates for the Hyderabad real estate market. Professional quotes for clients in seconds.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {CONSTRUCTION_TASKS.map((task) => (
                  <button key={task.id} onClick={() => handleTaskSelect(task)} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-[#1E3A8A] hover:shadow-2xl hover:-translate-y-2 transition-all text-left group flex flex-col items-start h-full">
                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform origin-left">{task.icon}</div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">{task.title}</h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed mb-6">{task.description}</p>
                    <div className="mt-auto w-full pt-4 border-t border-slate-50">
                      <span className="text-[10px] font-black uppercase text-[#1E3A8A] tracking-widest group-hover:gap-4 flex items-center gap-2 transition-all">Start Quote →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start animate-in fade-in duration-500">
              {/* Form Section */}
              <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 sticky top-32">
                <button onClick={() => {setSelectedTask(null); setEstimate(null);}} className="text-[10px] font-black text-[#1E3A8A] mb-8 uppercase flex items-center gap-2 hover:gap-3 transition-all">
                  <span>←</span> Back to Services
                </button>
                <form onSubmit={(e) => {e.preventDefault(); checkAccessAndRun('calculate');}} className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Project / Client Name</label>
                    <input required type="text" placeholder="e.g., Gachibowli Flat 402" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] focus:bg-white outline-none font-bold transition-all" onChange={(e) => handleInputChange('clientName', e.target.value)} />
                  </div>
                  {selectedTask.fields.map(field => {
                    const isVisible = !field.dependsOn || formInputs[field.dependsOn] === field.showIfValue;
                    if (!isVisible) return null;
                    return (
                      <div key={field.name} className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">{field.label}</label>
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
                  <button disabled={loading} type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                    {loading ? "Calculating..." : (requestCount === 0 ? "Generate Free Quote" : "Generate Professional Quote")}
                  </button>
                  {requestCount > 0 && !userData && <p className="text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Consultant Profile Required for 2nd Estimate</p>}
                  {loading && (
                    <p className="text-center text-[10px] font-black text-[#1E3A8A] animate-pulse uppercase mt-4 tracking-tighter">{LOADING_MESSAGES[loadingMsgIdx]}</p>
                  )}
                  {error && <p className="text-red-500 text-xs font-bold text-center mt-4 p-4 bg-red-50 rounded-xl">⚠️ {error}</p>}
                </form>
              </div>

              {/* Quote Analysis Section */}
              <div className="lg:col-span-8 space-y-8">
                {estimate ? (
                  <div className="animate-in zoom-in-95 duration-500">
                    {/* Results Dashboard Header */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                      <div className="text-center md:text-left">
                        <h2 className="text-3xl font-black uppercase tracking-tighter">Quotation Analysis</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                          Category: {formInputs.project_subtype || 'Specialized Work'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-4 justify-center md:justify-end">
                        <button onClick={() => checkAccessAndRun('invoice')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors">📄 Invoice & Terms</button>
                        <button onClick={() => checkAccessAndRun('order')} className="bg-[#1E3A8A] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-100">🛒 Place Order</button>
                        <button onClick={() => window.open(`https://wa.me/?text=Quote for ${formInputs.clientName}: Totaling ₹${estimate.totalEstimatedCost.toLocaleString('en-IN')}`, '_blank')} className="bg-[#25D366] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">📱 WhatsApp</button>
                      </div>
                    </div>

                    {/* High-Level Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-[#1E3A8A] text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">💰</div>
                        <p className="text-[10px] uppercase font-black opacity-60 mb-2 tracking-widest">Total Estimate</p>
                        <h4 className="text-4xl font-black tracking-tighter">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</h4>
                      </div>
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-md">
                        <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Labor Cost</p>
                        <h4 className="text-4xl font-black tracking-tighter text-slate-800">₹{estimate.laborCost.toLocaleString('en-IN')}</h4>
                      </div>
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-md">
                        <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Duration</p>
                        <h4 className="text-4xl font-black tracking-tighter text-emerald-600">{estimate.estimatedDays} Days</h4>
                      </div>
                    </div>

                    {/* Visual Rendering */}
                    {generatedImage && (
                      <div className="relative overflow-hidden rounded-[3rem] shadow-2xl mb-8 border-8 border-white group">
                        <img src={generatedImage} className="w-full h-[450px] object-cover group-hover:scale-105 transition-transform duration-1000" alt="Architectural Rendering" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
                          <div>
                            <p className="text-white text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">AI Concept Design</p>
                            <p className="text-white text-3xl font-black tracking-tighter uppercase">{formInputs.quality_grade} {selectedTask.title}</p>
                          </div>
                          <div className="text-white text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Location Context</p>
                            <p className="font-bold text-sm">{formInputs.area_location}, Hyderabad</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detail Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      {/* Material Table */}
                      <div className="md:col-span-7 bg-white rounded-[3rem] border border-slate-100 shadow-lg overflow-hidden">
                        <div className="p-8 bg-slate-50/50 border-b flex justify-between items-center">
                          <span className="font-black uppercase text-sm tracking-widest text-slate-600">Bill of Materials</span>
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-widest">Live Jan 2026 Prices</span>
                        </div>
                        <div className="p-4">
                          <table className="w-full">
                            <thead>
                              <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50">
                                <th className="px-4 py-3 text-left">Material & Brand</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Total (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {estimate.materials.map((m, idx) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                  <td className="py-5 px-4">
                                    <p className="font-black text-slate-800 text-sm uppercase leading-none">{m.name}</p>
                                    <p className="text-[10px] text-[#1E3A8A] font-black uppercase mt-1 opacity-60">{m.brandSuggestion || 'Premium Select'}</p>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <p className="text-xs font-bold text-slate-500 uppercase">{m.quantity}</p>
                                  </td>
                                  <td className="py-5 px-4 text-right">
                                    <p className="font-black text-slate-900">₹{m.totalPrice.toLocaleString('en-IN')}</p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Expert Advice & Precautions */}
                      <div className="md:col-span-5 space-y-6">
                        <div className="bg-[#1E3A8A] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                          <div className="relative z-10">
                            <h5 className="font-black uppercase text-xs tracking-widest mb-4 opacity-70 border-b border-white/20 pb-2">Expert Engineer's Tip</h5>
                            <p className="font-bold text-lg italic leading-relaxed text-blue-50">"{estimate.expertTips}"</p>
                          </div>
                          <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 grayscale">💡</div>
                        </div>
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-md">
                          <h5 className="font-black uppercase text-xs tracking-widest mb-6 text-slate-400 flex items-center gap-2">
                            Critical Precautions <span className="text-red-500 animate-pulse">●</span>
                          </h5>
                          <ul className="space-y-4">
                            {estimate.precautions.map((p, i) => (
                              <li key={i} className="flex gap-4 text-sm font-bold text-slate-600 border-l-2 border-red-100 pl-4 hover:border-red-500 transition-all">
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-20 border-4 border-dashed border-slate-100 rounded-[4rem] opacity-30 group hover:opacity-100 transition-opacity">
                    <div className="text-8xl mb-8 group-hover:bounce transition-all">📊</div>
                    <h3 className="text-3xl font-black text-slate-400 uppercase tracking-tighter">Analysis Workstation</h3>
                    <p className="text-slate-400 mt-4 max-w-sm font-medium leading-relaxed uppercase text-[10px] tracking-widest">
                      Ready to process engineering logic for your next {selectedTask.title} project in Hyderabad.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </main>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: inline-block; animation: marquee 40s linear infinite; }
        @media print { 
          .print\\:hidden, header, footer, .bg-[#1E3A8A].py-2, .fixed, nav, button { display: none !important; } 
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .lg\\:col-span-12, .lg\\:col-span-8, .md\\:col-span-12 { width: 100% !important; flex: none !important; }
          .bg-white { box-shadow: none !important; border: 1px solid #eee !important; }
          .rounded-[4rem] { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
