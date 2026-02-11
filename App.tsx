
import React, { useState, useEffect } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, UserData } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList } from './services/geminiService';

// IMPORTANT: Ensure this URL matches your deployed Apps Script Web App URL
const GOOGLE_SHEET_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbysL0GwQvJ_pirhjDiLoODbsIFZ8lQXgYXJOO68uxx28frwva759lDSPe7nxWZPXlq9pw/exec";

const FREE_LIMIT = 3;
const UPGRADE_PRICE = 399;
const UPI_ID = "ajay.t.me@icici";
const BRAND_NAME = "Ajay Constructions";

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
  clientPhone: string;
  date: string;
  taskTitle: string;
  area: string;
  subtype?: string;
}

type AppView = 'calculator' | 'market' | 'invoice';
type PaymentState = 'idle' | 'pending' | 'verifying' | 'success';

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
  
  // Access Control & Tracking
  const [requestCount, setRequestCount] = useState<number>(0);
  const [hasFullAccess, setHasFullAccess] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Interaction State
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showCallbackPopup, setShowCallbackPopup] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [pendingAction, setPendingAction] = useState<'calculate' | 'order' | 'invoice' | null>(null);
  const [profileUpdated, setProfileUpdated] = useState(false);

  // Upgrade Payment State
  const [upgradeStatus, setUpgradeStatus] = useState<PaymentState>('idle');

  useEffect(() => {
    const saved = localStorage.getItem('ajay_quote_history');
    const savedCount = localStorage.getItem('ajay_request_count') || "0";
    const savedUser = localStorage.getItem('ajay_user_data');
    const savedAccess = localStorage.getItem('ajay_full_access') === 'true';
    
    if (saved) setHistory(JSON.parse(saved));
    setRequestCount(parseInt(savedCount));
    setHasFullAccess(savedAccess);
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

  /**
   * Tracks user data, IP and notifies Ajay via Google Sheet/Email
   */
  const trackAndNotify = async (type: 'LOG' | 'CALLBACK' | 'PAYMENT_INIT' | 'PAYMENT_SUCCESS', est: EstimationResult | null = null) => {
    try {
      let ip = "N/A";
      let location = formInputs.area_location || "Hyderabad";

      try {
        const geoRes = await fetch('https://ipapi.co/json/');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          ip = geoData.ip;
          location = `${geoData.city}, ${geoData.region}`;
        }
      } catch (e) { console.warn("Geo lookup failed"); }

      const payload = {
        type,
        username: userData?.name || formInputs.clientName || 'Prospect',
        email: userData?.email || 'N/A',
        phone: userData?.phone || formInputs.clientPhone || 'N/A',
        ip,
        location,
        category: selectedTask?.title || 'System Event',
        totalCost: est?.totalEstimatedCost.toLocaleString('en-IN') || (type.includes('PAYMENT') ? `₹${UPGRADE_PRICE}` : '0'),
        details: type === 'PAYMENT_SUCCESS' ? "User upgraded to UNLIMITED ACCESS" : (est ? est.materials.map(m => m.name).join(', ') : "Internal Event")
      };

      await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Tracking Error", e);
    }
  };

  const handleUpgradeVerify = async () => {
    setUpgradeStatus('verifying');
    await new Promise(r => setTimeout(r, 4000)); // Simulate bank processing
    
    setHasFullAccess(true);
    localStorage.setItem('ajay_full_access', 'true');
    setUpgradeStatus('success');
    await trackAndNotify('PAYMENT_SUCCESS');
    
    setTimeout(() => {
      setShowPaywall(false);
      setUpgradeStatus('idle');
    }, 2000);
  };

  const handleRequestCallback = async () => {
    setCallbackLoading(true);
    try {
      await trackAndNotify('CALLBACK', estimate);
      setCallbackRequested(true);
      setTimeout(() => {
        setShowCallbackPopup(false);
        setCallbackRequested(false);
      }, 3000);
    } catch (e) {
      alert("Relay error. Contact Ajay.");
    } finally {
      setCallbackLoading(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormInputs((prev) => ({ ...prev, [name]: value }));
  };

  // Fix: Adding missing handleTaskSelect function to handle navigation and state reset
  const handleTaskSelect = (task: TaskConfig) => {
    setSelectedTask(task);
    setEstimate(null);
    setGeneratedImage(null);
    setFormInputs({});
    setError(null);
  };

  const executeCalculation = async () => {
    // Check Limit
    if (requestCount >= FREE_LIMIT && !hasFullAccess) {
      setShowPaywall(true);
      trackAndNotify('PAYMENT_INIT');
      return;
    }

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
        clientPhone: userData?.phone || formInputs.clientPhone || 'N/A',
        date: new Date().toLocaleDateString('en-IN'),
        taskTitle: selectedTask.title,
        area: formInputs.area_location || 'Hyderabad',
      };
      
      setHistory([newSaved, ...history].slice(0, 10));
      localStorage.setItem('ajay_quote_history', JSON.stringify([newSaved, ...history].slice(0, 10)));

      await trackAndNotify('LOG', result);
      setTimeout(() => setShowCallbackPopup(true), 1500);
    } catch (err: any) {
      setError(err.message || "Estimation failed.");
    } finally {
      setLoading(false);
    }
  };

  const checkAccessAndRun = (action: 'calculate' | 'order' | 'invoice') => {
    if (!userData) {
      setPendingAction(action);
      setShowLeadForm(true);
    } else {
      if (action === 'calculate') executeCalculation();
      else if (action === 'invoice') setView('invoice');
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const user: UserData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
    };
    setUserData(user);
    localStorage.setItem('ajay_user_data', JSON.stringify(user));
    setProfileUpdated(true);
    
    setTimeout(() => {
      setShowLeadForm(false);
      setProfileUpdated(false);
      if (pendingAction === 'calculate') executeCalculation();
      else if (pendingAction === 'invoice') setView('invoice');
      setPendingAction(null);
    }, 1500);
  };

  const getUpiQrUrl = (amount: number) => {
    const upiUri = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(BRAND_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Unlimited Access Upgrade')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F9FBFF] font-sans text-slate-900">
      
      {/* Premium Upgrade Modal (Paywall) */}
      {showPaywall && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0F172A]/95 backdrop-blur-3xl p-6">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col md:flex-row">
             <div className="bg-gradient-to-br from-[#1E3A8A] to-[#1E40AF] p-12 text-white md:w-1/2 flex flex-col justify-between">
                <div>
                   <div className="bg-amber-400 text-slate-900 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-6">Premium Access</div>
                   <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-4">Unlimited Engineering</h2>
                   <p className="text-blue-100 text-sm font-medium leading-relaxed opacity-80">You've reached the {FREE_LIMIT}-quote limit. Unlock lifetime access to Hyderabad's most precise 2026 estimation index.</p>
                </div>
                <div className="space-y-4 mt-8">
                   {['Instant Invoice Generation', 'Priority Callback Status', 'Real-time Market Ticker', '2026 Architectural Vision'].map(item => (
                      <div key={item} className="flex items-center gap-3 text-xs font-bold">
                        <span className="text-amber-400">✦</span> {item}
                      </div>
                   ))}
                </div>
             </div>
             <div className="p-12 md:w-1/2 text-center flex flex-col items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Scan to Pay & Unlock</p>
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 mb-6 shadow-xl">
                   <img src={getUpiQrUrl(UPGRADE_PRICE)} className="w-40 h-40" alt="UPI Upgrade" />
                </div>
                <div className="mb-8">
                   <p className="text-4xl font-black tracking-tighter text-[#1E3A8A]">₹{UPGRADE_PRICE}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">One-time Lifetime Fee</p>
                </div>
                <button 
                   onClick={handleUpgradeVerify} 
                   disabled={upgradeStatus !== 'idle'}
                   className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${upgradeStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-[#1E3A8A] text-white shadow-xl shadow-blue-100'}`}
                >
                   {upgradeStatus === 'verifying' ? 'Connecting to Bank...' : upgradeStatus === 'success' ? 'Access Granted ✅' : 'Verify Transaction'}
                </button>
                <button onClick={() => setShowPaywall(false)} className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#1E3A8A]">Skip for now</button>
             </div>
          </div>
        </div>
      )}

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
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-100 text-white">✅</div>
                <h3 className="text-2xl font-black uppercase text-[#1E3A8A] tracking-tighter">Alert Dispatched</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Ajay has been notified of your request.</p>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-blue-100 text-white">📞</div>
                <h3 className="text-2xl font-black uppercase text-[#1E3A8A] tracking-tighter">Connect with Agent</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 mb-8">Quote ready. Send high-priority call alert to Ajay?</p>
                <div className="flex flex-col gap-3">
                   <button onClick={handleRequestCallback} disabled={callbackLoading} className="w-full bg-[#1E3A8A] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">{callbackLoading ? "Sending Alert..." : "Send Priority Call Alert"}</button>
                   <button onClick={() => setShowCallbackPopup(false)} className="w-full bg-slate-50 text-slate-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Profile Form */}
      {showLeadForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 relative animate-in zoom-in-95 duration-300">
            {profileUpdated ? (
              <div className="text-center py-10 animate-in fade-in duration-300">
                <div className="text-6xl mb-6">✨</div>
                <h3 className="text-2xl font-black uppercase text-emerald-600 tracking-tighter">Profile Active</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Syncing Project Ledger...</p>
              </div>
            ) : (
              <>
                <button onClick={() => setShowLeadForm(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors">✕</button>
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-[#1E3A8A] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl text-white">💼</div>
                  <h3 className="text-2xl font-black uppercase text-[#1E3A8A] tracking-tighter">Engineer Identity</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Required for Hyderabad 2026 Quote Relay</p>
                </div>
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <input required name="name" type="text" defaultValue={userData?.name} placeholder="Your Full Name" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
                  <input required name="phone" type="tel" defaultValue={userData?.phone} placeholder="Mobile Number" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
                  <input required name="email" type="email" defaultValue={userData?.email} placeholder="Email Address" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" />
                  <button type="submit" className="w-full bg-[#1E3A8A] text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100">Sync with Ajay</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main UI Header */}
      <header className="bg-white border-b py-6 px-8 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => {setSelectedTask(null); setEstimate(null); setView('calculator');}}>
            <div className="bg-[#1E3A8A] w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform text-white">🏗️</div>
            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">{BRAND_NAME}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {userData ? (
                  <span className="flex items-center gap-2">
                    Authorized Agent: <span className="text-[#1E3A8A]">{userData.name}</span> 
                    {hasFullAccess && <span className="bg-amber-400 text-[8px] px-2 py-0.5 rounded-full text-slate-900 font-black">Unlimited</span>}
                    <button onClick={(e) => {e.stopPropagation(); setShowLeadForm(true);}} className="text-slate-300 hover:text-[#1E3A8A] transition-colors">✎ Edit</button>
                  </span>
                ) : `Agent Portal • ${FREE_LIMIT - requestCount} Free Quotes Left`}
              </p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
            <button onClick={() => setView('calculator')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'calculator' ? 'bg-white shadow-sm text-[#1E3A8A]' : 'text-slate-500'}`}>Estimator</button>
            <button onClick={() => setView('market')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'market' ? 'bg-white shadow-sm text-[#1E3A8A]' : 'text-slate-500'}`}>Market Watch</button>
          </nav>

          <div className="flex items-center gap-3">
            {!hasFullAccess && requestCount > 0 && (
               <button onClick={() => setShowPaywall(true)} className="bg-amber-400 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:scale-105 transition-all">Upgrade</button>
            )}
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 hover:border-[#1E3A8A] transition-all group">
              <span className="text-xs font-black uppercase text-slate-500 group-hover:text-[#1E3A8A] tracking-widest">History</span>
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
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Ref: {formInputs.clientName || 'Project Shell'}</p>
                </div>
                <div className="text-right">
                   <p className="font-black text-xl text-slate-800 uppercase">{BRAND_NAME}</p>
                   <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Recipient:</h4>
                   <p className="text-xl font-black text-slate-800 uppercase leading-none">{userData?.name || 'Authorized Lead'}</p>
                   <p className="font-bold text-[#1E3A8A] text-sm mt-2">{userData?.phone || 'No Mobile Linked'}</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Task Scope:</h4>
                   <p className="text-xl font-black text-slate-800 uppercase leading-none">{selectedTask?.title}</p>
                   <p className="font-bold text-slate-500 text-sm mt-2">{formInputs.area_location}, Hyderabad</p>
                </div>
             </div>

             <table className="w-full mb-12 text-sm">
                <thead>
                   <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
                      <th className="p-4 text-left">Material / Specification</th>
                      <th className="p-4 text-center">Qty</th>
                      <th className="p-4 text-right">Estimate (₹)</th>
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
                      <td className="p-4 py-6">Labor & Project Management</td>
                      <td></td>
                      <td className="p-4 text-right">₹{estimate.laborCost.toLocaleString('en-IN')}</td>
                   </tr>
                </tbody>
             </table>

             <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-10 border-t-2 border-slate-900 mb-12">
                <div className="bg-slate-50 p-10 rounded-[3rem] text-center border-2 border-slate-100 flex flex-col items-center gap-6">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#1E3A8A] mb-1">Project Consultation QR</p>
                   <div className="bg-white p-4 rounded-3xl shadow-xl">
                      <img src={getUpiQrUrl(estimate.totalEstimatedCost)} className="w-48 h-48 mx-auto" alt="UPI QR Code" />
                   </div>
                </div>
                <div className="text-right flex-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Grand Total Engineering Estimate</p>
                   <p className="text-7xl font-black tracking-tighter text-slate-900 leading-none">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</p>
                </div>
             </div>

             <div className="flex justify-end gap-4 print:hidden">
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:opacity-90">Print Quote</button>
                <button onClick={() => setView('calculator')} className="bg-[#1E3A8A] text-white px-8 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">New Estimate</button>
             </div>
          </div>
        ) : (
          !selectedTask ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">Construction Intelligence</h2>
                <p className="text-slate-500 font-medium max-w-2xl mx-auto uppercase text-[10px] tracking-widest">Select a service to build a precision engineering estimate.</p>
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
                <button onClick={() => setSelectedTask(null)} className="text-[10px] font-black text-[#1E3A8A] mb-8 uppercase hover:underline">← Back</button>
                <form onSubmit={(e) => {e.preventDefault(); checkAccessAndRun('calculate');}} className="space-y-6">
                  <div className="group">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Project Reference</label>
                    <input required type="text" placeholder="e.g., Gachibowli Site A" className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold" onChange={(e) => handleInputChange('clientName', e.target.value)} />
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
                  <button disabled={loading} type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all disabled:opacity-50">
                    {loading ? "Calculating..." : `Generate Professional Quote (${hasFullAccess ? 'Unlimited' : (FREE_LIMIT - requestCount) + ' Free Left'})`}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {estimate ? (
                  <div className="animate-in zoom-in-95 duration-500">
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
                      <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">{selectedTask.title} Analysis</h2>
                        <p className="text-xs text-[#1E3A8A] font-black uppercase tracking-widest mt-1">{formInputs.clientName}</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => checkAccessAndRun('invoice')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all">📄 Full Invoice</button>
                        <button onClick={() => setShowCallbackPopup(true)} className="bg-[#1E3A8A] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-105 transition-all">📞 Agent Alert</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       <div className="bg-[#1E3A8A] text-white p-8 rounded-[2.5rem] shadow-xl">
                         <p className="text-[10px] uppercase font-black opacity-60 mb-2 tracking-widest">Grand Total</p>
                         <h4 className="text-4xl font-black tracking-tighter">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</h4>
                       </div>
                       <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Labor Cost</p>
                         <h4 className="text-4xl font-black tracking-tighter text-slate-800">₹{estimate.laborCost.toLocaleString('en-IN')}</h4>
                       </div>
                       <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                         <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Est. Timeline</p>
                         <h4 className="text-4xl font-black tracking-tighter text-emerald-600">{estimate.estimatedDays} Days</h4>
                       </div>
                    </div>

                    {generatedImage && (
                      <div className="relative overflow-hidden rounded-[3rem] shadow-2xl mb-8 border-8 border-white group">
                        <img src={generatedImage} className="w-full h-[450px] object-cover transition-transform duration-700 group-hover:scale-110" alt="Vision" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <p className="text-white font-black uppercase text-xl tracking-widest">Engineering Vision 2026</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-20 border-4 border-dashed border-slate-100 rounded-[4rem] opacity-30">
                    <div className="text-8xl mb-8">📊</div>
                    <h3 className="text-3xl font-black text-slate-400 uppercase tracking-tighter">Analysis Workstation Ready</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-4">Precision Hyderabad Estimates</p>
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
