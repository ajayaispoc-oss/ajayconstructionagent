
import React, { useState, useEffect } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, UserData } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList } from './services/geminiService';

const UPI_ID = "ajay.t.me@icici";
const BRAND_NAME = "Ajay Constructions";

const TERMS_AND_CONDITIONS = [
  "Validity: This estimate is valid for 7 days due to market volatility (Steel/Cement).",
  "Payment Schedule: 50% Advance for materials, 40% on 70% completion, 10% after handover.",
  "Warranty: 1-year structural warranty on all masonry and 6 months on fixtures.",
  "Image Disclaimer: The 3D render is indicative. Actual execution requires formal site plans.",
  "Business Impact Note: Replicating 100% of the visual render may increase procurement costs if non-standard fixtures are used."
];

const MARKET_TICKER = [
  "UltraTech Cement: ₹415/bag",
  "Vizag TMT 12mm: ₹72,400/ton",
  "Finolex 2.5mm: ₹2,150/coil",
  "Asian Paints Royale: ₹590/Ltr",
  "Ashirvad CPVC 1'': ₹280/length"
];

const App: React.FC = () => {
  const [view, setView] = useState<'calculator' | 'market' | 'invoice'>('calculator');
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimationResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceList | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'calculate' | 'invoice' | null>(null);

  // Persistence: User identity stays for the browsing session
  useEffect(() => {
    const savedUser = sessionStorage.getItem('persistent_agent_data');
    if (savedUser) {
      const data = JSON.parse(savedUser);
      setUserData(data);
      // Pre-fill sub-zone and phone into form inputs automatically
      setFormInputs(prev => ({ 
        ...prev, 
        area_location: data.location || '', 
        clientPhone: data.phone || '' 
      }));
    }
    getRawMaterialPriceList().then(setMarketPrices);
  }, []);

  const handleInputChange = (name: string, value: any) => {
    setFormInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const user: any = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      location: formData.get('location') as string
    };
    setUserData(user);
    sessionStorage.setItem('persistent_agent_data', JSON.stringify(user));
    setShowLeadForm(false);
    // Inherit identity to form inputs
    setFormInputs(prev => ({ ...prev, area_location: user.location, clientPhone: user.phone }));
    if (pendingAction === 'calculate') executeCalculation();
    else if (pendingAction === 'invoice') setView('invoice');
  };

  const executeCalculation = async () => {
    if (!selectedTask) return;
    setLoading(true);
    try {
      const result = await getConstructionEstimate(selectedTask.id, formInputs);
      setEstimate(result);
      // Cache-aware image fetch
      const imageUrl = await generateDesignImage(selectedTask.id, result.visualPrompt);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getUpiQrUrl = (amount?: number) => {
    let url = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(BRAND_NAME)}&cu=INR`;
    if (amount) url += `&am=${amount}&tn=${encodeURIComponent('Project_Payment')}`;
    else url += `&tn=${encodeURIComponent('Advance_Token')}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };

  const MaterialsTable = ({ materials }: { materials: any[] }) => (
    <div className="overflow-x-auto rounded-[2rem] border border-slate-100 mt-6">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-widest">
          <tr><th className="p-4">Item Detail</th><th className="p-4">Quantity</th><th className="p-4 text-right">Estimate (₹)</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-50 bg-white">
          {materials.map((m, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 font-black text-slate-800">{m.name}<div className="text-[8px] text-[#1E3A8A] mt-1">{m.brandSuggestion}</div></td>
              <td className="p-4 font-bold text-slate-500">{m.quantity}</td>
              <td className="p-4 text-right font-black">₹{m.totalPrice.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const TncSection = () => (
    <div className="mt-8 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100">
      <h4 className="text-[10px] font-black uppercase text-amber-800 mb-4 flex items-center gap-2">📜 Engineering Terms & Conditions</h4>
      <ul className="space-y-2">
        {TERMS_AND_CONDITIONS.map((t, i) => (
          <li key={i} className="text-[10px] font-medium text-amber-700 leading-relaxed flex gap-2"><span>•</span> {t}</li>
        ))}
      </ul>
    </div>
  );

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
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => {setSelectedTask(null); setView('calculator');}}>
            <div className="bg-[#1E3A8A] w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg text-white">🏗️</div>
            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">{BRAND_NAME}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized Construction Intelligence</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('calculator')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] ${view === 'calculator' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Calculator</button>
            <button onClick={() => setView('market')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] ${view === 'market' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Market Watch</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {view === 'invoice' && estimate ? (
          <div className="bg-white p-20 rounded-[4rem] shadow-2xl max-w-4xl mx-auto animate-in zoom-in-95 duration-500 border border-slate-100">
             <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
                <h2 className="text-6xl font-black uppercase tracking-tighter">Invoice</h2>
                <div className="text-right">
                   <p className="font-black text-xl text-slate-800">{BRAND_NAME}</p>
                   <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-10 mb-12">
                <div>
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Authorized Client</h4>
                   <p className="text-xl font-black text-slate-900 uppercase">{userData?.name}</p>
                   <p className="font-bold text-[#1E3A8A] text-sm">Ph: {userData?.phone} • {userData?.email}</p>
                   <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">{userData?.location}, Hyderabad</p>
                </div>
                <div className="text-right">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Service Context</h4>
                   <p className="text-xl font-black text-slate-900 uppercase">{selectedTask?.title}</p>
                   <p className="font-bold text-emerald-600 text-sm">Proj. Timeline: {estimate.estimatedDays} Days</p>
                </div>
             </div>
             <MaterialsTable materials={estimate.materials} />
             <div className="mt-12 flex justify-between items-center gap-10 border-t-2 pt-12">
                <div className="bg-slate-50 p-8 rounded-[3rem] flex items-center gap-6 border">
                   <img src={getUpiQrUrl(estimate.totalEstimatedCost)} className="w-32 h-32 rounded-xl" />
                   <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-[#1E3A8A]">Payment Gateway</p>
                      <p className="text-3xl font-black">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</p>
                   </div>
                </div>
                <TncSection />
             </div>
             <div className="mt-12 text-center text-slate-300 font-black text-[10px] uppercase tracking-[0.5em] border-t pt-8">This ledger is electronically generated and verified for 2026.</div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            {!selectedTask ? (
              <div className="lg:col-span-12 grid md:grid-cols-3 gap-8">
                {CONSTRUCTION_TASKS.map(task => (
                  <button key={task.id} onClick={() => setSelectedTask(task)} className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all text-left group">
                    <div className="text-6xl mb-8 group-hover:scale-110 transition-transform">{task.icon}</div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">{task.title}</h3>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">{task.description}</p>
                    <span className="text-[10px] font-black uppercase text-[#1E3A8A]">Configure Quote →</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="lg:col-span-4 bg-white p-10 rounded-[3.5rem] shadow-xl h-fit border border-slate-100 sticky top-32">
                   <button onClick={() => setSelectedTask(null)} className="text-[10px] font-black text-[#1E3A8A] mb-8 uppercase hover:underline">← All Services</button>
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
                                <select required value={formInputs[field.name] || ''} className="w-full bg-slate-50 p-5 rounded-2xl border-2 outline-none font-bold text-sm cursor-pointer" onChange={(e) => handleInputChange(field.name, e.target.value)}>
                                   <option value="">{field.placeholder}</option>
                                   {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                             ) : (
                                <input required value={formInputs[field.name] || ''} type={field.type} placeholder={field.placeholder} className="w-full bg-slate-50 p-5 rounded-2xl border-2 outline-none font-bold text-sm" onChange={(e) => handleInputChange(field.name, e.target.value)} />
                             )}
                          </div>
                        );
                      })}
                      <button disabled={loading} type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-2xl font-black uppercase text-xs shadow-2xl hover:scale-[1.02] transition-all">
                         {loading ? "Ledger Computing..." : "Generate Analysis"}
                      </button>
                   </form>
                </div>

                <div className="lg:col-span-8 space-y-10">
                   {estimate ? (
                     <div className="animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 flex justify-between items-center gap-8 mb-8">
                           <div>
                              <h2 className="text-3xl font-black uppercase leading-tight">{selectedTask.title} Quote</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ref: {userData?.name || 'Prospect'} • Hyderabad</p>
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
                           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Labor Charges</p>
                              <h4 className="text-4xl font-black text-slate-800">₹{estimate.laborCost.toLocaleString('en-IN')}</h4>
                           </div>
                           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">Timeline</p>
                              <h4 className="text-4xl font-black text-emerald-600">{estimate.estimatedDays} Days</h4>
                           </div>
                        </div>

                        {/* Direct Estimate Breakdown Table */}
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 mb-8">
                           <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-black uppercase text-slate-800">Bill of Materials (B.O.M)</h3>
                              <span className="bg-blue-50 text-[#1E3A8A] px-4 py-1 rounded-full text-[9px] font-black uppercase">2026 Price Index</span>
                           </div>
                           <MaterialsTable materials={estimate.materials} />
                           
                           {/* Payment Options Section */}
                           <div className="grid md:grid-cols-2 gap-6 mt-10">
                              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                                 <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">1. Advance Booking Token</p>
                                 <div className="bg-white p-4 rounded-2xl shadow-lg"><img src={getUpiQrUrl()} className="w-24 h-24" /></div>
                                 <p className="text-[8px] font-bold text-slate-400 mt-4 text-center">Scan to pay custom advance amount<br/>to secure your slot</p>
                              </div>
                              <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 flex flex-col items-center">
                                 <p className="text-[10px] font-black uppercase text-[#1E3A8A] mb-4 tracking-widest">2. Full Work Order Payment</p>
                                 <div className="bg-white p-4 rounded-2xl shadow-lg"><img src={getUpiQrUrl(estimate.totalEstimatedCost)} className="w-24 h-24" /></div>
                                 <p className="text-[8px] font-black text-[#1E3A8A] mt-4 text-center leading-relaxed">Pay full ₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}<br/>to initiate material procurement</p>
                              </div>
                           </div>
                           
                           <TncSection />
                        </div>

                        {generatedImage && (
                          <div className="group relative rounded-[4rem] overflow-hidden shadow-2xl border-8 border-white">
                            <img src={generatedImage} className="w-full h-[550px] object-cover transition-transform duration-1000 group-hover:scale-105" alt="Vision" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-12">
                               <p className="text-white font-black text-4xl uppercase tracking-tighter mb-2">Architectural Vision 2026</p>
                               <p className="text-white/80 font-black text-xs uppercase mb-4">**Note: image for indicative purpose. actual design may vary.**</p>
                            </div>
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="h-[600px] flex flex-col items-center justify-center text-center p-20 border-8 border-dashed border-slate-100 rounded-[5rem] opacity-30 animate-pulse">
                        <div className="text-[10rem] mb-12">🏢</div>
                        <h3 className="text-4xl font-black text-slate-400 uppercase tracking-tighter leading-none">Awaiting Construction Data</h3>
                        <p className="text-sm font-bold text-slate-300 mt-4 uppercase tracking-[0.2em]">Hyderabad Ledger Sync Ready</p>
                     </div>
                   )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Persistent Identity Modal */}
      {showLeadForm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl p-16 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-10">
               <div className="w-20 h-20 bg-[#1E3A8A] rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 text-white">🏢</div>
               <h3 className="text-3xl font-black uppercase text-[#1E3A8A] tracking-tighter">Identity Terminal</h3>
               <p className="text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">Saved for Current Session</p>
            </div>
            <form onSubmit={handleLeadSubmit} className="space-y-6">
              <input required name="name" type="text" placeholder="Your Full Name" className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 outline-none font-bold" />
              <input required name="phone" type="tel" placeholder="Mobile Number" className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 outline-none font-bold" />
              <input required name="email" type="email" placeholder="Email Address" className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 outline-none font-bold" />
              <select required name="location" className="w-full bg-slate-50 p-6 rounded-[1.5rem] border-2 outline-none font-bold appearance-none cursor-pointer">
                 <option value="">Default Sub-Zone</option>
                 <option value="Madhapur">Madhapur</option>
                 <option value="Gachibowli">Gachibowli</option>
                 <option value="Kukatpally">Kukatpally</option>
                 <option value="Jubilee Hills">Jubilee Hills</option>
                 <option value="Banjara Hills">Banjara Hills</option>
                 <option value="Manikonda">Manikonda</option>
                 <option value="Kondapur">Kondapur</option>
              </select>
              <button type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-[1.5rem] font-black uppercase text-xs shadow-2xl active:scale-95 transition-all">Secure Identity</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
