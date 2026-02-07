
import React, { useState, useEffect } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, UserData } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList } from './services/geminiService';

const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbz0Xg8xjg_TFoznnmJwdrmH48T9V3BDZE4RWJInJ4TmpYvNYm7ziFRrvz9kGnI_OtYmkQ/exec";

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

const UPI_ID = "ajay.t.me@icici";
const BRAND_NAME = "Ajay Constructions";

interface SavedEstimate extends EstimationResult {
  id: string;
  clientName: string;
  clientPhone: string;
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
  
  // Interaction State
  const [requestCount, setRequestCount] = useState<number>(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showCallbackPopup, setShowCallbackPopup] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackRequested, setCallbackRequested] = useState(false);
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

  const logRequestToCloud = async (est: EstimationResult, currentCount: number) => {
    try {
      let geoInfo = "Unknown Location";
      let userIp = "Unknown IP";
      
      try {
        const geoRes = await fetch('https://ipapi.co/json/', { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          userIp = geoData.ip;
          geoInfo = `${geoData.city}, ${geoData.region}, ${geoData.country_name}`;
        }
      } catch (geoErr) { console.warn("Geo fallback engaged", geoErr); }

      const payload = {
        type: 'LOG',
        username: userData?.name || formInputs.clientName || 'Lead-Prospect',
        email: userData?.email || 'No-Email',
        phone: formInputs.clientPhone || userData?.phone || 'No-Phone',
        ip: userIp,
        location: geoInfo,
        category: selectedTask?.title || 'General',
        totalCost: est.totalEstimatedCost,
        requestCount: currentCount
      };

      await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    } catch (e) { console.error("Logging failure", e); }
  };

  const handleRequestCallback = async () => {
    if (!estimate) return;
    setCallbackLoading(true);
    try {
      const payload = {
        type: 'CALLBACK',
        username: userData?.name || formInputs.clientName || 'Lead',
        email: userData?.email || 'N/A',
        phone: formInputs.clientPhone || userData?.phone || 'N/A',
        category: selectedTask?.title || 'Construction Project',
        totalCost: estimate.totalEstimatedCost,
        location: formInputs.area_location || 'Hyderabad'
      };

      await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      setCallbackRequested(true);
      setTimeout(() => setShowCallbackPopup(false), 3000);
    } catch (e) {
      console.error("Callback notify failure", e);
      alert("Something went wrong. Please call Ajay directly at 9703133338.");
    } finally {
      setCallbackLoading(false);
    }
  };

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
    setCallbackRequested(false);
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

      const nextCount = requestCount + 1;
      setRequestCount(nextCount);
      localStorage.setItem('ajay_request_count', nextCount.toString());

      const newSaved: SavedEstimate = {
        ...result,
        id: Math.random().toString(36).substr(2, 9),
        clientName: formInputs.clientName || 'New Project',
        clientPhone: formInputs.clientPhone || 'N/A',
        date: new Date().toLocaleDateString('en-IN'),
        taskTitle: selectedTask.title,
        area: formInputs.area_location || 'Hyderabad',
        subtype: formInputs.project_subtype
      };
      
      const updatedHistory = [newSaved, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('ajay_quote_history', JSON.stringify(updatedHistory));

      logRequestToCloud(result, nextCount);
      // Show callback popup once calculation is complete
      setTimeout(() => setShowCallbackPopup(true), 1500);

    } catch (err: any) {
      setError(err.message || "Estimation failed. Please check connection.");
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
          alert("Please review and agree to Terms & Conditions.");
          setView('invoice');
          return;
        }
        alert(`Order request sent. Ajay will contact you at ${formInputs.clientPhone || userData.phone}.`);
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
    setPendingAction(null);
  };

  const getUpiQrUrl = (amount?: number) => {
    const baseUrl = `upi://pay?pa={UPI_ID}&pn=${encodeURIComponent(BRAND_NAME)}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(amount ? `${baseUrl}&am=${amount}` : baseUrl)}`;
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

      {/* Callback Success Popup */}
      {showCallbackPopup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-12 text-center animate-in zoom-in-95 duration-300">
            {callbackRequested ? (
              <div className="animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-100">✅</div>
                <h3 className="text-2xl font-black uppercase text-[#1E3A8A] tracking-tighter">Request Notified</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Ajay will contact you shortly.</p>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-blue-100">📞</div>
                <h3 className="text-2xl font-black uppercase text-[#1E3A8A] tracking-tighter">Quote Ready!</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 mb-8">Would you like a priority call back from our engineer?</p>
                <div className="flex flex-col gap-3">
                   <button 
                    onClick={handleRequestCallback}
                    disabled={callbackLoading}
                    className="w-full bg-[#1E3A8A] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                   >
                    {callbackLoading ? "Requesting..." : "Yes, Request Call Back"}
                   </button>
                   <button 
                    onClick={() => setShowCallbackPopup(false)}
                    className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all"
                   >
                    Just view Invoice
                   </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                      <p className="text-[10px] font-bold text-[#1E3A8A] uppercase">{item.taskTitle}</p>
                      <p className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{item.date}</p>
                    </div>
                    <p className="font-bold text-slate-800 text-lg group-hover:text-[#1E3A8A] transition-colors">{item.clientName}</p>
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
              <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">{BRAND_NAME}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Agent Portal • 2026 Index</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
            <button onClick={() => setView('calculator')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calculator' ? 'bg-white shadow-sm text-[#1E3A8A]' : 'text-slate-500'}`}>Estimator</button>
            <button onClick={() => setView('market')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'market' ? 'bg-white shadow-sm text-[#1E3A8A]' : 'text-slate-500'}`}>Market Watch</button>
          </nav>

          <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 hover:border-[#1E3A8A] transition-all group">
            <span className="text-xs font-black uppercase text-slate-500 group-hover:text-[#1E3A8A] tracking-widest">Ledger</span>
            <span className="text-lg">📜</span>
          </button>
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
                   <p className="font-black text-xl text-slate-800 uppercase">{BRAND_NAME}</p>
                   <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Bill To:</h4>
                   <p className="text-xl font-black text-slate-800 uppercase leading-none">{userData?.name || 'Valued Client'}</p>
                   <p className="font-bold text-slate-500 text-sm mt-2">Ph: {formInputs.clientPhone || userData?.phone}</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Scope:</h4>
                   <p className="text-xl font-black text-slate-800 uppercase leading-none">{selectedTask?.title}</p>
                   <p className="font-bold text-slate-500 text-sm mt-2">{formInputs.area_location}, Hyderabad</p>
                </div>
             </div>

             <table className="w-full mb-12 text-sm">
                <thead>
                   <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
                      <th className="p-4 text-left">Material & Brand</th>
                      <th className="p-4 text-center">Qty</th>
                      <th className="p-4 text-right">Total (₹)</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {estimate.materials.map((m, i) => (
                      <tr key={i}>
                         <td className="p-4 py-6 font-black text-slate-800 uppercase">{m.name}<br/><span className="text-[9px] text-[#1E3A8A] opacity-60">{m.brandSuggestion}</span></td>
                         <td className="p-4 text-center font-bold text-slate-600">{m.quantity}</td>
                         <td className="p-4 text-right font-black">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                      </tr>
                   ))}
                   <tr className="bg-slate-50 font-black">
                      <td className="p-4 py-6">Labor & Engineering</td>
                      <td></td>
                      <td className="p-4 text-right">₹{estimate.laborCost.toLocaleString('en-IN')}</td>
                   </tr>
                </tbody>
             </table>

             <div className="flex justify-between items-end pt-10 border-t-2 border-slate-900 mb-12">
                <div className="bg-slate-50 p-6 rounded-3xl text-center">
                   <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Scan to Pay Adv. Consultation</p>
                   <img src={getUpiQrUrl()} className="w-24 h-24 mx-auto" alt="UPI" />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Grand Total Estimate</p>
                   <p className="text-6xl font-black tracking-tighter text-slate-900 leading-none">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</p>
                </div>
             </div>

             <div className="flex justify-end gap-4 print:hidden">
                <button onClick={() => setShowCallbackPopup(true)} className="bg-slate-100 text-[#1E3A8A] px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 transition-colors">Request Call Back</button>
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest">Print / PDF</button>
                <button 
                  disabled={!agreedToTerms}
                  onClick={() => checkAccessAndRun('order')} 
                  className={`px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${agreedToTerms ? 'bg-[#1E3A8A] text-white shadow-xl shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}
                >
                  Confirm Work Order
                </button>
             </div>
             <div className="mt-8 border-t pt-4 flex items-center gap-4 cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${agreedToTerms ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'border-slate-300'}`}>
                  {agreedToTerms && <span className="text-white">✓</span>}
                </div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Agree to Terms & Delivery Guarantee (15-day Grace)</span>
             </div>
          </div>
        ) : view === 'market' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-12">Market Watch</h2>
             {marketLoading ? (
               <div className="py-40 text-center animate-pulse font-black text-[#1E3A8A] uppercase text-xs tracking-widest">Syncing Price Indices...</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {marketData?.categories.map((cat, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden p-8">
                      <h3 className="font-black uppercase text-sm tracking-widest text-[#1E3A8A] mb-6 border-b pb-4">{cat.title}</h3>
                      <div className="space-y-4">
                        {cat.items.map((item, j) => (
                          <div key={j} className="flex justify-between items-center text-sm">
                            <span className="font-black text-slate-800 uppercase">{item.brandName}</span>
                            <span className="font-black text-slate-900">₹{item.priceWithGst.toLocaleString('en-IN')}/<span className="opacity-40">{item.unit}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        ) : (
          !selectedTask ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Construction Intelligence</h2>
                <p className="text-slate-500 font-medium max-w-2xl mx-auto uppercase text-[10px] tracking-widest">Select service to generate agent-grade precision engineering estimates.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {CONSTRUCTION_TASKS.map((task) => (
                  <button key={task.id} onClick={() => handleTaskSelect(task)} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-[#1E3A8A] hover:shadow-2xl hover:-translate-y-2 transition-all text-left group">
                    <div className="text-5xl mb-6">{task.icon}</div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">{task.title}</h3>
                    <p className="text-sm text-slate-400 mt-2 font-medium mb-6">{task.description}</p>
                    <span className="text-[10px] font-black uppercase text-[#1E3A8A] tracking-widest">Start Quote →</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start animate-in fade-in duration-500">
              <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 sticky top-32">
                <button onClick={() => setSelectedTask(null)} className="text-[10px] font-black text-[#1E3A8A] mb-8 uppercase">← Back</button>
                <form onSubmit={(e) => {e.preventDefault(); checkAccessAndRun('calculate');}} className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Project / Client Name</label>
                    <input required type="text" placeholder="e.g., Manikonda Villa 5" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" onChange={(e) => handleInputChange('clientName', e.target.value)} />
                  </div>
                  {selectedTask.fields.map(field => {
                    const isVisible = !field.dependsOn || formInputs[field.dependsOn] === field.showIfValue;
                    if (!isVisible) return null;
                    return (
                      <div key={field.name}>
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
                    {loading ? "Calculating..." : "Generate Professional Quote"}
                  </button>
                  {loading && <p className="text-center text-[10px] font-black text-[#1E3A8A] animate-pulse uppercase mt-4 tracking-tighter">{LOADING_MESSAGES[loadingMsgIdx]}</p>}
                  {error && <p className="text-red-500 text-xs font-bold text-center mt-4">⚠️ {error}</p>}
                </form>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {estimate ? (
                  <div className="animate-in zoom-in-95 duration-500">
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                      <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedTask.title} Analysis</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Ref: {formInputs.clientName}</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => checkAccessAndRun('invoice')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">📄 Invoice</button>
                        <button onClick={() => checkAccessAndRun('order')} className="bg-[#1E3A8A] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-all">🛒 Order</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       <div className="bg-[#1E3A8A] text-white p-8 rounded-[2.5rem] shadow-xl">
                         <p className="text-[10px] uppercase font-black opacity-60 mb-2 tracking-widest">Estimate</p>
                         <h4 className="text-4xl font-black tracking-tighter">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</h4>
                       </div>
                       <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Labor</p>
                         <h4 className="text-4xl font-black tracking-tighter text-slate-800">₹{estimate.laborCost.toLocaleString('en-IN')}</h4>
                       </div>
                       <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Duration</p>
                         <h4 className="text-4xl font-black tracking-tighter text-emerald-600">{estimate.estimatedDays} Days</h4>
                       </div>
                    </div>

                    {generatedImage && (
                      <div className="relative overflow-hidden rounded-[3rem] shadow-2xl mb-8 border-8 border-white group">
                        <img src={generatedImage} className="w-full h-[450px] object-cover group-hover:scale-105 transition-transform duration-1000" alt="Architectural Render" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent text-white p-12 flex items-end">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">2026 Architectural Vision</p>
                            <h3 className="text-3xl font-black tracking-tighter uppercase">{formInputs.quality_grade} {selectedTask.title}</h3>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-7 bg-white rounded-[3rem] border border-slate-100 p-8 shadow-lg overflow-hidden">
                        <h5 className="font-black uppercase text-sm tracking-widest text-slate-600 mb-8 pb-4 border-b">Materials</h5>
                        <table className="w-full text-xs">
                           <tbody>
                              {estimate.materials.map((m, idx) => (
                                <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                  <td className="py-4 font-black text-slate-800 uppercase leading-none">{m.name}<br/><span className="text-[8px] opacity-40">{m.brandSuggestion}</span></td>
                                  <td className="py-4 text-right font-black text-slate-900">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                      </div>

                      <div className="md:col-span-5 space-y-6">
                        <div className="bg-[#1E3A8A] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                          <h5 className="font-black uppercase text-xs tracking-widest mb-4 opacity-70">Expert Tip</h5>
                          <p className="font-bold text-lg italic leading-relaxed">"{estimate.expertTips}"</p>
                          <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 grayscale">💡</div>
                        </div>
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-md">
                          <h5 className="font-black uppercase text-xs tracking-widest mb-4 text-slate-400">Precautions</h5>
                          <ul className="space-y-4">
                            {estimate.precautions.map((p, i) => (
                              <li key={i} className="flex gap-4 text-sm font-bold text-slate-600 border-l-2 border-red-100 pl-4">
                                {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-20 border-4 border-dashed border-slate-100 rounded-[4rem] opacity-30">
                    <div className="text-8xl mb-8">📊</div>
                    <h3 className="text-3xl font-black text-slate-400 uppercase tracking-tighter">Analysis Workstation</h3>
                    <p className="text-slate-400 mt-4 max-w-sm font-medium leading-relaxed uppercase text-[10px] tracking-widest">Select {selectedTask.title} parameters to build your project shell.</p>
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
        @media print { .print\\:hidden, header, footer, .fixed, nav, button { display: none !important; } main { padding: 0 !important; width: 100% !important; } }
      `}</style>
    </div>
  );
};

export default App;
