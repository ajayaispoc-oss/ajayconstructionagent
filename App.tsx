
import React, { useState, useEffect } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, UserData } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList } from './services/geminiService';

const UPI_ID = "ajay.t.me@icici";
const BRAND_NAME = "Ajay Constructions";
const FREE_LIMIT = 3;
const UPGRADE_PRICE = 499;

const TERMS_AND_CONDITIONS = [
  "Validity: This estimate is valid for 7 days due to market volatility.",
  "Payment Schedule: 50% Advance for materials, 40% on 70% completion, 10% after handover.",
  "Warranty: 1-year structural warranty on masonry.",
  "Design Policy: The visual render is for indicative purpose only. Actual execution depends on site feasibility.",
  "Business Impact: Failure to match the indicative render does not constitute a breach of contract, as renders are stylistic visions. Specific custom matches may increase material costs by 20-30%."
];

const MARKET_TICKER = [
  "UltraTech Cement: ₹415/bag",
  "Vizag TMT 12mm: ₹72,400/ton",
  "Finolex 2.5mm: ₹2,150/coil",
  "Asian Paints Royale: ₹590/Ltr",
  "Ashirvad CPVC 1'': ₹280/length"
];

const App: React.FC = () => {
  const [view, setView] = useState<'estimator' | 'market' | 'invoice'>('estimator');
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimationResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceList | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const [requestCount, setRequestCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('ajay_request_count') || "0");
  });
  const [isUpgraded, setIsUpgraded] = useState<boolean>(() => {
    return localStorage.getItem('ajay_is_upgraded') === 'true';
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'calculate' | 'invoice' | 'upgrade' | null>(null);

  useEffect(() => {
    const savedSession = sessionStorage.getItem('agent_session_context');
    if (savedSession) {
      const data = JSON.parse(savedSession);
      setUserData(data);
      setFormInputs(prev => ({
        ...prev,
        clientPhone: data.phone,
        area_location: data.location
      }));
    }
    getRawMaterialPriceList().then(setMarketPrices);
  }, []);

  const handleInputChange = (name: string, value: any) => {
    const newInputs = { ...formInputs, [name]: value };
    setFormInputs(newInputs);
    
    if (name === 'clientPhone' || name === 'area_location') {
      const updatedUser = { 
        ...userData, 
        phone: name === 'clientPhone' ? value : userData?.phone || '',
        location: name === 'area_location' ? value : userData?.location || ''
      };
      if (userData) {
        setUserData(updatedUser as UserData);
      }
      sessionStorage.setItem('agent_session_context', JSON.stringify(updatedUser));
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const user: UserData = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      location: formData.get('location') as string
    };
    setUserData(user);
    sessionStorage.setItem('agent_session_context', JSON.stringify(user));
    setShowLeadForm(false);
    
    setFormInputs(prev => ({ 
      ...prev, 
      clientPhone: user.phone, 
      area_location: user.location 
    }));

    if (pendingAction === 'calculate') executeCalculation();
    else if (pendingAction === 'invoice') setView('invoice');
    else if (pendingAction === 'upgrade') setShowUpgradeModal(true);
  };

  const executeCalculation = async () => {
    if (requestCount >= FREE_LIMIT && !isUpgraded) {
      setShowUpgradeModal(true);
      return;
    }

    if (!selectedTask) return;
    setLoading(true);
    setEstimate(null);
    setGeneratedImage(null);
    
    try {
      const result = await getConstructionEstimate(selectedTask.id, formInputs);
      setEstimate(result);
      
      const imageUrl = await generateDesignImage(selectedTask.id, result.visualPrompt);
      setGeneratedImage(imageUrl);

      if (!isUpgraded) {
        const nextCount = requestCount + 1;
        setRequestCount(nextCount);
        localStorage.setItem('ajay_request_count', nextCount.toString());
      }
    } catch (err: any) {
      console.error("Calculation error:", err);
      alert("Encountered an internal error during calculation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeActivation = () => {
    setIsUpgraded(true);
    localStorage.setItem('ajay_is_upgraded', 'true');
    setShowUpgradeModal(false);
  };

  const getUpiQrUrl = (amount?: number) => {
    let url = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(BRAND_NAME)}&cu=INR`;
    if (amount) url += `&am=${amount}&tn=${encodeURIComponent('Project_Commitment')}`;
    else url += `&tn=${encodeURIComponent('Premium_Service_Activation')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };

  const handleNavToEstimator = () => {
    setView('estimator');
    setEstimate(null);
    setGeneratedImage(null);
    setSelectedTask(null);
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] font-sans text-slate-900 pb-20">
      {/* Ticker */}
      <div className="bg-[#1E3A8A] py-2 overflow-hidden whitespace-nowrap border-b border-white/10">
        <div className="animate-marquee inline-block">
          {MARKET_TICKER.map((t, i) => <span key={i} className="text-[9px] font-black uppercase tracking-widest text-white/80 mx-8">{t} •</span>)}
          {MARKET_TICKER.map((t, i) => <span key={i+100} className="text-[9px] font-black uppercase tracking-widest text-white/80 mx-8">{t} •</span>)}
        </div>
      </div>

      <header className="bg-white border-b py-6 px-8 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={handleNavToEstimator}>
            <div className="bg-[#1E3A8A] w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg text-white">🏗️</div>
            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">{BRAND_NAME}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {isUpgraded ? "PRO UNLIMITED ACCESS" : `${Math.max(0, FREE_LIMIT - requestCount)} FREE ESTIMATES REMAINING`}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {!isUpgraded && (
              <button 
                onClick={() => {
                  setPendingAction('upgrade');
                  setShowUpgradeModal(true);
                }} 
                className="bg-amber-400 text-slate-900 px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:scale-105 transition-all"
              >
                Premium Services 🚀
              </button>
            )}
            <button onClick={handleNavToEstimator} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] ${view === 'estimator' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Estimator</button>
            <button onClick={() => setView('market')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] ${view === 'market' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Market Watch</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {view === 'market' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-10 text-slate-900">Live Price Index</h2>
            {marketPrices ? (
              <div className="grid md:grid-cols-3 gap-8">
                {marketPrices.categories.map((cat, i) => (
                  <div key={i} className="bg-white p-10 rounded-[3rem] border shadow-sm">
                    <h3 className="text-xl font-black uppercase text-slate-800 mb-6">{cat.title}</h3>
                    <div className="space-y-4">
                      {cat.items.map((item, j) => (
                        <div key={j} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">{item.brandName}</p>
                            <p className="text-sm font-bold text-slate-800">{item.specificType}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-[#1E3A8A]">₹{item.priceWithGst.toLocaleString('en-IN')}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Per {item.unit}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="p-20 text-center font-black text-slate-300">Syncing with Hyderabad Ledger...</div>}
          </div>
        ) : view === 'invoice' && estimate ? (
          <div className="bg-white p-20 rounded-[4rem] shadow-2xl max-w-4xl mx-auto animate-in zoom-in-95 duration-500 border">
             <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
                <h2 className="text-6xl font-black uppercase tracking-tighter">Quote</h2>
                <div className="text-right">
                   <p className="font-black text-xl text-slate-800">{BRAND_NAME}</p>
                   <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-10 mb-12">
                <div>
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Billed To</h4>
                   <p className="text-xl font-black text-slate-900 uppercase">{userData?.name || "Premium Client"}</p>
                   <p className="font-bold text-[#1E3A8A] text-sm">Ph: {userData?.phone || formInputs.clientPhone}</p>
                   <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">{userData?.location || formInputs.area_location}, Hyderabad</p>
                </div>
                <div className="text-right">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Details</h4>
                   <p className="text-xl font-black text-slate-900 uppercase">{selectedTask?.title}</p>
                   <p className="font-bold text-emerald-600 text-sm">Proj. Timeline: {estimate.estimatedDays} Days</p>
                </div>
             </div>
             
             <div className="overflow-x-auto rounded-[2rem] border mt-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-widest">
                    <tr><th className="p-4">Item</th><th className="p-4">Qty</th><th className="p-4 text-right">Estimate (₹)</th></tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {estimate.materials.map((m, i) => (
                      <tr key={i}>
                        <td className="p-4 font-black">{m.name}<div className="text-[8px] text-[#1E3A8A] mt-1">{m.brandSuggestion}</div></td>
                        <td className="p-4 font-bold">{m.quantity}</td>
                        <td className="p-4 text-right font-black">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>

             <div className="mt-12 flex justify-between items-center gap-10 border-t-2 pt-12">
                <div className="bg-slate-50 p-8 rounded-[3rem] flex items-center gap-6 border">
                   <img src={getUpiQrUrl(estimate.totalEstimatedCost)} className="w-32 h-32 rounded-xl" />
                   <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-[#1E3A8A]">Engineering Total</p>
                      <p className="text-3xl font-black">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</p>
                   </div>
                </div>
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex-1">
                   <h4 className="text-[9px] font-black uppercase text-amber-800 mb-2">Notes</h4>
                   <p className="text-[10px] font-medium text-amber-700 leading-relaxed italic">The image renders provided are indicative visions for the project domain. Execution may vary.</p>
                </div>
             </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            {!selectedTask ? (
              <div className="lg:col-span-12 space-y-12">
                <div className="grid md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                  {CONSTRUCTION_TASKS.map(task => (
                    <button key={task.id} onClick={() => { setSelectedTask(task); setEstimate(null); setGeneratedImage(null); }} className="bg-white p-12 rounded-[3.5rem] border shadow-sm hover:shadow-2xl transition-all text-left group">
                      <div className="text-6xl mb-8 group-hover:scale-110 transition-transform">{task.icon}</div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">{task.title}</h3>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">{task.description}</p>
                      <span className="text-[10px] font-black uppercase text-[#1E3A8A]">Configure Estimate →</span>
                    </button>
                  ))}
                </div>

                {!isUpgraded && (
                  <div className="bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] p-16 rounded-[4rem] text-white flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 text-center md:text-left">
                       <h2 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">Unlock Unlimited Estimations</h2>
                       <p className="text-lg opacity-80 font-medium mb-8">Professional Real Estate Agent Upgrade for ₹{UPGRADE_PRICE}</p>
                       <button 
                        onClick={() => {
                          setPendingAction('upgrade');
                          setShowUpgradeModal(true);
                        }} 
                        className="bg-white text-[#1E3A8A] px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-slate-50 transition-all"
                       >
                         Premium Services 🚀
                       </button>
                    </div>
                    <div className="relative z-10 w-48 h-48 bg-white/10 rounded-[3rem] backdrop-blur-md flex items-center justify-center text-7xl">💎</div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="lg:col-span-4 bg-white p-10 rounded-[3.5rem] shadow-xl border sticky top-32 h-fit">
                   <button onClick={handleNavToEstimator} className="text-[10px] font-black text-[#1E3A8A] mb-8 uppercase hover:underline">← All Services</button>
                   <form onSubmit={(e) => {
                     e.preventDefault();
                     if (!userData) { setPendingAction('calculate'); setShowLeadForm(true); }
                     else executeCalculation();
                   }} className="space-y-6">
                      {selectedTask.fields.map(field => {
                        const currentValue = formInputs[field.dependsOn || ''];
                        const isVisible = !field.dependsOn || (Array.isArray(field.showIfValue) ? field.showIfValue.includes(currentValue) : currentValue === field.showIfValue);
                        if (!isVisible) return null;
                        return (
                          <div key={field.name} className="animate-in fade-in slide-in-from-top-2 duration-300">
                             <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">{field.label}</label>
                             {field.type === 'select' ? (
                                <select required value={formInputs[field.name] || ''} className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm cursor-pointer transition-all" onChange={(e) => handleInputChange(field.name, e.target.value)}>
                                   <option value="">{field.placeholder}</option>
                                   {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                             ) : (
                                <input required value={formInputs[field.name] || ''} type={field.type} placeholder={field.placeholder} className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm transition-all" onChange={(e) => handleInputChange(field.name, e.target.value)} />
                             )}
                          </div>
                        );
                      })}
                      <button disabled={loading} type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-2xl font-black uppercase text-xs shadow-2xl hover:scale-[1.02] active:scale-95 transition-all">
                         {loading ? "Ledger Computing..." : "Generate Analysis"}
                      </button>
                   </form>
                </div>

                <div className="lg:col-span-8 space-y-10">
                   {estimate ? (
                     <div className="animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border flex justify-between items-center gap-8 mb-8">
                           <div>
                              <h2 className="text-3xl font-black uppercase leading-tight">{selectedTask.title} Quote</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{userData?.name || "Client"} • Hyderabad Hub</p>
                           </div>
                           <button onClick={() => {
                             if (!userData) { setPendingAction('invoice'); setShowLeadForm(true); }
                             else setView('invoice');
                           }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Get Detailed Invoice 📄</button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                           <div className="bg-[#1E3A8A] text-white p-8 rounded-[2.5rem] shadow-lg">
                              <p className="text-[10px] opacity-60 font-black mb-1 uppercase tracking-widest">Grand Total</p>
                              <h4 className="text-4xl font-black">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</h4>
                           </div>
                           <div className="bg-white p-8 rounded-[2.5rem] border">
                              <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Labor Allocation</p>
                              <h4 className="text-4xl font-black text-slate-800">₹{estimate.laborCost.toLocaleString('en-IN')}</h4>
                           </div>
                           <div className="bg-white p-8 rounded-[2.5rem] border">
                              <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Proj. Duration</p>
                              <h4 className="text-4xl font-black text-emerald-600">{estimate.estimatedDays} Days</h4>
                           </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border mb-10">
                           <h3 className="text-xl font-black uppercase text-slate-800 mb-4">Engineering Ledger (B.O.M)</h3>
                           <div className="overflow-x-auto rounded-2xl border">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-widest">
                                  <tr><th className="p-4">Item Detail</th><th className="p-4">Quantity</th><th className="p-4 text-right">Estimate (₹)</th></tr>
                                </thead>
                                <tbody className="divide-y bg-white">
                                  {estimate.materials.map((m, i) => (
                                    <tr key={i}>
                                      <td className="p-4 font-black">{m.name}<div className="text-[8px] text-[#1E3A8A] mt-1 uppercase">{m.brandSuggestion}</div></td>
                                      <td className="p-4 font-bold">{m.quantity}</td>
                                      <td className="p-4 text-right font-black">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                           </div>
                           
                           <div className="grid md:grid-cols-2 gap-6 mt-10">
                              <div className="bg-slate-50 p-8 rounded-[2.5rem] border flex flex-col items-center">
                                 <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Advance Booking Token</p>
                                 <img src={getUpiQrUrl()} className="w-24 h-24 rounded-xl shadow-md" />
                                 <p className="text-[8px] font-bold text-slate-400 mt-4 text-center">Pay token amount to secure your slot</p>
                              </div>
                              <div className="bg-blue-50 p-8 rounded-[2.5rem] border-blue-100 flex flex-col items-center">
                                 <p className="text-[10px] font-black uppercase text-[#1E3A8A] mb-4 tracking-widest">Full Procurement Payment</p>
                                 <img src={getUpiQrUrl(estimate.totalEstimatedCost)} className="w-24 h-24 rounded-xl shadow-md border-2 border-white" />
                                 <p className="text-[8px] font-black text-[#1E3A8A] mt-4 text-center">Full Work Order: ₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</p>
                              </div>
                           </div>
                        </div>

                        {generatedImage && (
                          <div className="group relative rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white animate-in zoom-in-95 duration-700">
                            <img src={generatedImage} className="w-full h-[550px] object-cover" alt="Architectural Reference" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-12">
                               <p className="text-white font-black text-4xl uppercase tracking-tighter mb-4">Visionary Render 2026</p>
                               <p className="text-white font-black text-sm uppercase leading-relaxed bg-black/40 p-4 rounded-xl border border-white/20">
                                 **Note: This image is for indicative purpose only. Actual design and site execution may vary based on structural feasibility.**
                               </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-8 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100">
                           <h4 className="text-[10px] font-black uppercase text-amber-800 mb-4">📜 Project Commitments</h4>
                           <ul className="space-y-3">
                              {TERMS_AND_CONDITIONS.map((t, i) => (
                                <li key={i} className="text-[11px] font-medium text-amber-700 leading-relaxed flex gap-3"><span>•</span> {t}</li>
                              ))}
                           </ul>
                        </div>
                     </div>
                   ) : (
                     <div className="h-[600px] flex flex-col items-center justify-center text-center p-20 border-8 border-dashed border-slate-100 rounded-[5rem] opacity-30 animate-pulse">
                        <div className="text-[10rem] mb-12">📊</div>
                        <h3 className="text-4xl font-black text-slate-400 uppercase tracking-tighter leading-none">Engineering Desk Ready</h3>
                        <p className="text-sm font-bold text-slate-300 mt-4 uppercase tracking-[0.2em]">Input project metrics for AI Analysis</p>
                     </div>
                   )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Identity Terminal Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl p-16 animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setShowLeadForm(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors">✕</button>
            <div className="text-center mb-10">
               <div className="w-20 h-20 bg-[#1E3A8A] rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 text-white shadow-xl">💼</div>
               <h3 className="text-3xl font-black uppercase text-[#1E3A8A] tracking-tighter">Identity Terminal</h3>
               <p className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">Establish Session Context</p>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-6">
              <input required name="name" type="text" placeholder="Your Full Name" defaultValue={userData?.name} className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm transition-all" />
              <input required name="phone" type="tel" placeholder="Mobile Number" defaultValue={userData?.phone} className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm transition-all" />
              <input required name="email" type="email" placeholder="Email Address" defaultValue={userData?.email} className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm transition-all" />
              <select required name="location" defaultValue={userData?.location} className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold appearance-none cursor-pointer text-sm transition-all">
                 <option value="">Default Sub-Zone</option>
                 <option value="Madhapur">Madhapur</option>
                 <option value="Gachibowli">Gachibowli</option>
                 <option value="Kukatpally">Kukatpally</option>
                 <option value="Jubilee Hills">Jubilee Hills</option>
                 <option value="Banjara Hills">Banjara Hills</option>
                 <option value="Manikonda">Manikonda</option>
                 <option value="Kondapur">Kondapur</option>
              </select>
              <button type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-[1.5rem] font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">Establish Session</button>
            </form>
          </div>
        </div>
      )}

      {/* Premium Services Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-3xl p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[5rem] p-12 text-center shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500 relative my-auto">
             <button onClick={() => setShowUpgradeModal(false)} className="absolute top-12 right-12 text-slate-300 hover:text-slate-900 transition-colors">✕</button>
             
             <div className="grid md:grid-cols-2 gap-12 items-center text-left">
                <div className="space-y-6">
                   <div className="inline-block bg-amber-400 text-slate-900 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Premium Services Terminal</div>
                   <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">Upgrade Pro</h2>
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Unlimited estimations, custom branding, and priority support.</p>
                   
                   <div className="bg-slate-50 p-8 rounded-[3rem] border shadow-inner">
                      <h4 className="text-[10px] font-black uppercase text-[#1E3A8A] mb-4">Identity Verification</h4>
                      <form onSubmit={handleLeadSubmit} className="space-y-4">
                         <input required name="name" type="text" placeholder="Full Name" defaultValue={userData?.name} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-sm" />
                         <div className="grid grid-cols-2 gap-4">
                            <input required name="phone" type="tel" placeholder="Mobile" defaultValue={userData?.phone} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-sm" />
                            <input required name="email" type="email" placeholder="Email" defaultValue={userData?.email} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-sm" />
                         </div>
                         <select required name="location" defaultValue={userData?.location} className="w-full bg-white p-4 rounded-2xl border outline-none font-bold text-sm">
                            <option value="">Sub-Zone</option>
                            <option value="Madhapur">Madhapur</option>
                            <option value="Gachibowli">Gachibowli</option>
                            <option value="Kukatpally">Kukatpally</option>
                            <option value="Jubilee Hills">Jubilee Hills</option>
                            <option value="Banjara Hills">Banjara Hills</option>
                            <option value="Manikonda">Manikonda</option>
                            <option value="Kondapur">Kondapur</option>
                         </select>
                         <p className="text-[8px] font-bold text-slate-400 uppercase text-center mt-2">Session will be updated upon establishing identity</p>
                      </form>
                   </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-[#1E3A8A] p-10 rounded-[4rem] text-white shadow-2xl">
                   <div className="bg-white p-6 rounded-[3rem] mb-6 shadow-xl">
                      <img src={getUpiQrUrl(UPGRADE_PRICE)} className="w-48 h-48 rounded-2xl" alt="UPI Scanner" />
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase opacity-60 mb-1 tracking-widest">Premium Activation Fee</p>
                      <h3 className="text-5xl font-black tracking-tighter">₹{UPGRADE_PRICE}</h3>
                      <p className="text-[10px] font-bold mt-4 uppercase tracking-[0.2em] bg-white/10 py-2 px-4 rounded-full">One-Time Lifetime Access</p>
                   </div>
                   
                   <button 
                     onClick={handleUpgradeActivation} 
                     className="mt-8 w-full bg-white text-[#1E3A8A] py-6 rounded-3xl font-black uppercase text-xs shadow-xl hover:scale-105 active:scale-95 transition-all"
                   >
                     Confirm Payment & Activate 🚀
                   </button>
                </div>
             </div>

             <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Trusted by 200+ agents in Hyderabad Real Estate Hub</p>
                <button 
                  onClick={() => setShowUpgradeModal(false)} 
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  Return to Estimator
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
