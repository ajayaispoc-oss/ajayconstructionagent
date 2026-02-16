
import React, { useState, useEffect, useRef } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList, UserData } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, generateDesignImage, getRawMaterialPriceList, sendMessageToAssistant } from './services/geminiService';
import { notifyCloud } from './services/notificationService';

const UPI_ID = "ajay.t.me@icici";
const BRAND_NAME = "Ajay Infra";
const FREE_LIMIT = 3;
const UPGRADE_PRICE = 499;
const COOLDOWN_MINUTES = 5;

// ChatBot UI Component
const ChatBot = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Hello! I'm Ajay's Virtual Site Engineer. How can I help you with your construction project today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const stream = await sendMessageToAssistant(userMsg);
      let fullText = "";
      setMessages(prev => [...prev, { role: 'bot', text: "" }]);
      
      for await (const chunk of stream) {
        fullText += (chunk as any).text;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = fullText;
          return newMsgs;
        });
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: "I'm having trouble connecting to the site server. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border z-[1000] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500 backdrop-blur-xl bg-white/95">
      <div className="bg-[#1E3A8A] p-6 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🤖</div>
          <div>
            <h4 className="font-black uppercase text-[10px] tracking-widest">Ajay Assistant</h4>
            <p className="text-[8px] opacity-60 uppercase font-bold">Virtual Site Engineer • Online</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xl opacity-60 hover:opacity-100">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-3xl text-xs font-medium leading-relaxed ${m.role === 'user' ? 'bg-[#1E3A8A] text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="text-[10px] text-slate-400 font-black animate-pulse">SITE ENGINEER IS TYPING...</div>}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-slate-50 border-t flex gap-2">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about materials, prices, labor..." 
          className="flex-1 bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs outline-none focus:border-[#1E3A8A] font-bold"
        />
        <button onClick={handleSend} className="bg-[#1E3A8A] text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform">➤</button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'estimator' | 'market' | 'invoice' | 'upgrade'>('estimator');
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimationResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceList | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [requestCount, setRequestCount] = useState<number>(() => {
    return parseInt(localStorage.getItem('ajay_request_count') || "0");
  });
  const [isUpgraded, setIsUpgraded] = useState<boolean>(() => {
    return localStorage.getItem('ajay_is_upgraded') === 'true';
  });

  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const lastUser = localStorage.getItem('ajay_last_user');
    const userObj = lastUser ? JSON.parse(lastUser) : null;
    
    if (userObj) {
      setUserData(userObj);
      setFormInputs(prev => ({
        ...prev,
        clientName: userObj.name,
        clientPhone: userObj.phone,
        area_location: userObj.location
      }));
    }

    notifyCloud('access', { user: userObj, userAgent: navigator.userAgent });

    const savedCooldown = localStorage.getItem('ajay_payment_request_ts');
    if (savedCooldown) {
      const elapsed = Date.now() - parseInt(savedCooldown);
      const remaining = (COOLDOWN_MINUTES * 60 * 1000) - elapsed;
      if (remaining > 0) setCooldownTimeLeft(Math.ceil(remaining / 1000));
    }
  }, []);

  useEffect(() => {
    if (cooldownTimeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setCooldownTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            localStorage.removeItem('ajay_payment_request_ts');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldownTimeLeft]);

  // Log whenever someone opens premium page
  useEffect(() => {
    if (view === 'upgrade' && !isUpgraded) {
      notifyCloud('upgrade', { user: userData || { name: 'Anonymous', phone: 'Attempting Upgrade' }, details: "User opened premium services page" });
    }
  }, [view, isUpgraded]);

  useEffect(() => { getRawMaterialPriceList().then(setMarketPrices); }, []);

  const triggerSyncFeedback = (msg: string) => {
    setSyncStatus(msg);
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleRequestCallBack = async () => {
    const user = {
      name: formInputs.clientName || userData?.name || 'Guest',
      phone: formInputs.clientPhone || userData?.phone || 'N/A',
      location: formInputs.area_location || userData?.location || 'N/A',
      email: ''
    };
    triggerSyncFeedback("Syncing Callback...");
    await notifyCloud('callback', { user, task: selectedTask?.title || "General Support", total: estimate?.totalEstimatedCost || 0, details: estimate?.materials || null, inputs: formInputs });
    alert(`Hello ${user.name}, your request has been sent to Ajay Infra. We will call you on ${user.phone} shortly.`);
  };

  const handleNotifyWorkOrder = async () => {
    if (!estimate) return;
    const user = {
      name: formInputs.clientName || userData?.name || 'Guest',
      phone: formInputs.clientPhone || userData?.phone || 'N/A',
      location: formInputs.area_location || userData?.location || 'N/A',
      email: ''
    };
    triggerSyncFeedback("Sending Work Order...");
    await notifyCloud('work_order', { user, task: selectedTask?.title, total: estimate.totalEstimatedCost, materials: estimate.materials, inputs: formInputs });
    alert("Project Start Notified! Ajay has received your work order and invoice details.");
  };

  const handleViewInvoice = async () => {
    const user = {
      name: formInputs.clientName || userData?.name || 'Guest',
      phone: formInputs.clientPhone || userData?.phone || 'N/A',
      location: formInputs.area_location || userData?.location || 'N/A',
      email: ''
    };
    setView('invoice');
    triggerSyncFeedback("Syncing Invoice Data...");
    await notifyCloud('invoice_sent', { user, task: selectedTask?.title, total: estimate?.totalEstimatedCost, materials: estimate?.materials, inputs: formInputs });
  };

  const handleInputChange = (name: string, value: any) => { setFormInputs(prev => ({ ...prev, [name]: value })); };

  const executeCalculation = async () => {
    if (requestCount >= FREE_LIMIT && !isUpgraded) { setView('upgrade'); return; }
    if (!selectedTask) return;
    if (!formInputs.clientName || !formInputs.clientPhone) { alert("Please enter your Name and Mobile Number to generate the quote."); return; }
    setLoading(true);
    setEstimate(null);
    setGeneratedImage(null);
    try {
      const newUser: UserData = { name: formInputs.clientName, phone: formInputs.clientPhone, location: formInputs.area_location || 'N/A', email: '' };
      setUserData(newUser);
      localStorage.setItem('ajay_last_user', JSON.stringify(newUser));
      const result = await getConstructionEstimate(selectedTask.id, formInputs);
      setEstimate(result);
      const imageUrl = await generateDesignImage(selectedTask.id, result.visualPrompt);
      setGeneratedImage(imageUrl);
      triggerSyncFeedback("Syncing Quote...");
      notifyCloud('quote', { user: newUser, task: selectedTask.title, inputs: formInputs, total: result.totalEstimatedCost });
      if (!isUpgraded) {
        const nextCount = requestCount + 1;
        setRequestCount(nextCount);
        localStorage.setItem('ajay_request_count', nextCount.toString());
      }
    } catch (err: any) { alert("Analysis failed. Please try again."); } finally { setLoading(false); }
  };

  const handleNavToEstimator = () => { setView('estimator'); setEstimate(null); setGeneratedImage(null); setSelectedTask(null); };

  const handlePaymentConfirmationClick = () => {
    if (cooldownTimeLeft > 0) return;
    const ts = Date.now();
    localStorage.setItem('ajay_payment_request_ts', ts.toString());
    setCooldownTimeLeft(COOLDOWN_MINUTES * 60);
    notifyCloud('upgrade', { user: userData || { name: 'Awaiting Confirmation', phone: 'N/A' }, details: `User clicked 'Awaiting Payment Confirmation' for ₹${UPGRADE_PRICE}.` });
    alert(`Payment request submitted. Confirmation may take up to 5 minutes. Please wait.`);
  };

  const getUpiQrUrl = (amount?: number) => {
    const note = amount ? `Payment_₹${amount}` : 'Consultation';
    let url = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(BRAND_NAME)}&cu=INR&tn=${encodeURIComponent(note)}`;
    if (amount) url += `&am=${amount}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };

  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  const PaymentSection = ({ total }: { total: number }) => (
    <div className="mt-8 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-6 rounded-[2.5rem] border flex flex-col items-center">
          <p className="text-[9px] font-black uppercase text-[#1E3A8A] tracking-widest mb-4 text-center">Full Work Order Payment</p>
          <div className="bg-white p-2 rounded-2xl shadow-sm mb-4">
            <img src={getUpiQrUrl(total)} className="w-32 h-32" alt="Full Payment" />
          </div>
          <p className="text-xl font-black">₹{total.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-blue-50/50 p-6 rounded-[2.5rem] border-2 border-blue-100 flex flex-col items-center">
          <p className="text-[9px] font-black uppercase text-blue-800 tracking-widest mb-4 text-center">5% Advance Booking Token</p>
          <div className="bg-white p-2 rounded-2xl shadow-sm mb-4">
            <img src={getUpiQrUrl(Math.round(total * 0.05))} className="w-32 h-32" alt="Advance Payment" />
          </div>
          <p className="text-xl font-black text-blue-900">₹{Math.round(total * 0.05).toLocaleString('en-IN')}</p>
        </div>
      </div>
      <div className="bg-amber-50 p-5 rounded-[1.5rem] border border-amber-100 text-center">
        <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1">🛡️ Refund Guarantee</p>
        <p className="text-[10px] font-medium text-amber-700 leading-relaxed italic">Payments are **100% refundable** if the work order is cancelled before site mobilization.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FBFF] font-sans text-slate-900 pb-20 relative">
      <ChatBot isVisible={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#1E3A8A] text-white rounded-full shadow-2xl flex items-center justify-center text-3xl z-[999] hover:scale-110 active:scale-90 transition-transform shadow-blue-900/40"
      >
        💬
      </button>

      {syncStatus && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-[#1E3A8A] text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3">
            <span className="animate-pulse">●</span> {syncStatus}
          </div>
        </div>
      )}

      <header className="bg-white border-b py-6 px-8 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={handleNavToEstimator}>
            <div className="bg-[#1E3A8A] w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg text-white">🏗️</div>
            <div>
              <h1 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">{BRAND_NAME}</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {isUpgraded ? "PRO UNLIMITED ACCESS" : `${Math.max(0, FREE_LIMIT - requestCount)} FREE QUOTES LEFT`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNavToEstimator} className={`px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest ${view === 'estimator' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Estimator</button>
            <button onClick={() => setView('market')} className={`px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest ${view === 'market' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Market</button>
            <button onClick={() => setView('upgrade')} className={`px-4 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest ${view === 'upgrade' || isUpgraded ? 'bg-amber-400 text-slate-900' : 'bg-slate-50 text-slate-400'}`}>{isUpgraded ? 'Premium Active' : 'Upgrade Pro'}</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        {view === 'market' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-10 text-slate-900">Hyderabad Price Index</h2>
            {marketPrices && marketPrices.categories ? (
              <div className="grid md:grid-cols-3 gap-8">
                {marketPrices.categories.map((cat, i) => (
                  <div key={i} className="bg-white p-10 rounded-[3rem] border shadow-sm">
                    <h3 className="text-xl font-black uppercase text-slate-800 mb-6">{cat.title}</h3>
                    <div className="space-y-4">
                      {cat.items?.map((item, j) => (
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
            ) : <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Syncing Hub Ledger...</div>}
          </div>
        ) : view === 'upgrade' ? (
          <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-500">
            <div className="bg-white w-full rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl border">
               <div className="grid md:grid-cols-2 gap-16 items-stretch text-left">
                  <div className="space-y-8">
                     <div className="inline-block bg-amber-400 text-slate-900 px-8 py-3 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg transform -rotate-2">Premium Terminal</div>
                     <h2 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">Unlimited Pro</h2>
                     <p className="text-lg font-bold text-slate-400 leading-relaxed">Unlock full 2026 Price Index access and priority architectural renders for a one-time activation of ₹{UPGRADE_PRICE}.</p>
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] border shadow-inner">
                       <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Scan to Activate</p>
                       <div className="flex items-center gap-6">
                         <img src={getUpiQrUrl(UPGRADE_PRICE)} className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg" alt="UPI" />
                         <div>
                           <p className="text-xs font-black text-[#1E3A8A] uppercase">{UPI_ID}</p>
                           <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Instant Pro Activation</p>
                         </div>
                       </div>
                     </div>
                  </div>
                  <div className="bg-[#1E3A8A] p-12 rounded-[3.5rem] text-white flex flex-col items-center justify-center text-center shadow-2xl relative">
                     <div className="text-7xl mb-6">💎</div>
                     <h3 className="text-6xl font-black tracking-tighter">₹{UPGRADE_PRICE}</h3>
                     <p className="text-[10px] font-black uppercase opacity-60 mt-6 tracking-widest">One-Time Activation</p>
                     {isUpgraded ? (
                       <div className="mt-12 bg-white/10 p-6 rounded-3xl border border-white/20 w-full"><p className="font-black uppercase text-xs tracking-widest">Premium Service Active</p></div>
                     ) : (
                       <button disabled={cooldownTimeLeft > 0} onClick={handlePaymentConfirmationClick} className={`mt-12 w-full py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl transition-transform active:scale-95 ${cooldownTimeLeft > 0 ? 'bg-slate-500 text-slate-200 cursor-not-allowed' : 'bg-white text-[#1E3A8A] hover:scale-105'}`}>
                         {cooldownTimeLeft > 0 ? `Awaiting Confirmation (${formatTime(cooldownTimeLeft)})` : 'Awaiting Payment Confirmation 🚀'}
                       </button>
                     )}
                     <p className="mt-4 text-[9px] opacity-60 font-bold uppercase tracking-widest italic">Access enabled immediately upon admin approval.</p>
                  </div>
               </div>
            </div>
          </div>
        ) : view === 'invoice' && estimate ? (
          <div className="bg-white p-12 md:p-20 rounded-[4rem] shadow-2xl max-w-4xl mx-auto animate-in zoom-in-95 duration-500 border relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 font-black text-9xl pointer-events-none select-none">AJAY</div>
             <div className="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
                <h2 className="text-6xl font-black uppercase tracking-tighter">Quote</h2>
                <div className="text-right">
                   <p className="font-black text-xl text-slate-800 uppercase tracking-tighter">{BRAND_NAME}</p>
                   <p className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-IN')}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-10 mb-12">
                <div>
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Billed To</h4>
                   <p className="text-xl font-black text-slate-900 uppercase">{userData?.name || "Client"}</p>
                   <p className="font-bold text-[#1E3A8A] text-sm">{userData?.phone || "N/A"}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{userData?.location}, Hyderabad</p>
                </div>
                <div className="text-right">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Project Detail</h4>
                   <p className="text-xl font-black text-slate-900 uppercase">{selectedTask?.title}</p>
                   <p className="font-bold text-emerald-600 text-sm">Timeline: {estimate.estimatedDays} Days</p>
                </div>
             </div>
             <div className="overflow-x-auto rounded-[2rem] border mt-6 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-widest">
                    <tr><th className="p-4">Material / Item</th><th className="p-4">Qty</th><th className="p-4 text-right">Estimate (₹)</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {estimate.materials?.map((m, i) => (
                      <tr key={i}>
                        <td className="p-4 font-black">{m.name}<div className="text-[8px] text-[#1E3A8A] mt-1 uppercase tracking-widest">{m.brandSuggestion}</div></td>
                        <td className="p-4 font-bold">{m.quantity}</td>
                        <td className="p-4 text-right font-black">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <PaymentSection total={estimate.totalEstimatedCost} />
             <div className="mt-12 flex gap-4 w-full justify-center">
                <button onClick={handleRequestCallBack} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl transition-transform active:scale-95">📞 Request Callback</button>
                <button onClick={handleNotifyWorkOrder} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-xl transition-transform active:scale-95">🏗️ Start Project</button>
             </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            {!selectedTask ? (
              <div className="lg:col-span-12 space-y-12">
                <div className="bg-white p-10 rounded-[3rem] border-l-[12px] border-[#1E3A8A] shadow-xl animate-in slide-in-from-left duration-700 bg-gradient-to-r from-white to-blue-50/20">
                  <p className="text-[#1E3A8A] font-black uppercase tracking-[0.2em] text-[10px] mb-2">{userData?.name ? 'Verified Session' : 'Smart Engineering Portal'}</p>
                  <h2 className="text-5xl font-black tracking-tighter leading-none">{userData?.name ? `Hello Welcome, ${userData.name}!` : `Ajay Infra Portal`}</h2>
                  <p className="text-slate-500 text-sm font-medium mt-3">{userData?.name ? `Ready to analyze your project in ${userData.location}?` : 'Calculate construction quotes with real-time 2026 price accuracy.'}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-500">
                  {CONSTRUCTION_TASKS.map(task => (
                    <button key={task.id} onClick={() => { setSelectedTask(task); setEstimate(null); }} className="bg-white p-12 rounded-[4rem] border shadow-sm hover:shadow-2xl transition-all text-left group">
                      <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-300">{task.icon}</div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-4">{task.title}</h3>
                      <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6">{task.description}</p>
                      <span className="text-[10px] font-black uppercase text-[#1E3A8A] tracking-widest">Get Quote →</span>
                    </button>
                  ))}
                </div>
                {!isUpgraded && (
                  <div className="bg-[#1E3A8A] p-16 rounded-[5rem] text-white flex flex-col md:flex-row items-center justify-between gap-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/20 to-transparent pointer-events-none"></div>
                    <div className="relative z-10 text-center md:text-left">
                       <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-4">Professional Upgrade</h2>
                       <p className="text-xl opacity-80 font-medium mb-8">Unlimited 2026 Price Index Analysis for ₹{UPGRADE_PRICE}</p>
                       <button onClick={() => setView('upgrade')} className="bg-white text-[#1E3A8A] px-12 py-6 rounded-3xl font-black uppercase text-xs shadow-2xl hover:bg-slate-50 transition-all">Unlock Premium 🚀</button>
                    </div>
                    <div className="relative z-10 w-56 h-56 bg-white/10 rounded-[4rem] backdrop-blur-xl flex items-center justify-center text-9xl">💎</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="lg:col-span-4 bg-white p-10 rounded-[4rem] shadow-xl border sticky top-32 h-fit">
                   <button onClick={handleNavToEstimator} className="text-[10px] font-black text-[#1E3A8A] mb-8 uppercase hover:underline tracking-widest">← Back to Services</button>
                   <form onSubmit={(e) => { e.preventDefault(); executeCalculation(); }} className="space-y-6">
                      {selectedTask.fields?.map(field => {
                        const currentValue = formInputs[field.dependsOn || ''];
                        const isVisible = !field.dependsOn || (Array.isArray(field.showIfValue) ? field.showIfValue.includes(currentValue) : currentValue === field.showIfValue);
                        if (!isVisible) return null;
                        return (
                          <div key={field.name} className="animate-in fade-in slide-in-from-top-2 duration-300">
                             <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">{field.label}</label>
                             {field.type === 'select' ? (
                                <select required value={formInputs[field.name] || ''} className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm cursor-pointer" onChange={(e) => handleInputChange(field.name, e.target.value)}>
                                   <option value="">{field.placeholder}</option>
                                   {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                             ) : (
                                <input required value={formInputs[field.name] || ''} type={field.type} placeholder={field.placeholder} className="w-full bg-slate-50 p-5 rounded-2xl border-2 border-slate-50 focus:border-[#1E3A8A] outline-none font-bold text-sm" onChange={(e) => handleInputChange(field.name, e.target.value)} />
                             )}
                          </div>
                        );
                      })}
                      <button disabled={loading} type="submit" className="w-full bg-[#1E3A8A] text-white py-6 rounded-3xl font-black uppercase text-xs shadow-2xl transition-all active:scale-95 disabled:bg-slate-400">{loading ? "Engineering Sync..." : "Generate Quote"}</button>
                   </form>
                   {estimate && <div className="mt-8 pt-8 border-t flex flex-col gap-4"><button onClick={handleRequestCallBack} className="w-full bg-slate-50 text-slate-900 border px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">📞 Request Support</button></div>}
                </div>
                <div className="lg:col-span-8 space-y-10">
                   {estimate ? (
                     <div className="animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                           <div>
                              <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedTask.title} Result</h2>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{userData?.name || "Client"} • {userData?.location || "Hyderabad"}</p>
                           </div>
                           <button onClick={handleViewInvoice} className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">Official Invoice 📄</button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                           <div className="bg-[#1E3A8A] text-white p-8 rounded-[3rem] shadow-lg border-b-[8px] border-blue-900">
                              <p className="text-[10px] opacity-60 font-black mb-1 uppercase tracking-widest">Grand Total</p>
                              <h4 className="text-4xl font-black">₹{estimate.totalEstimatedCost.toLocaleString('en-IN')}</h4>
                           </div>
                           <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col justify-center text-center group cursor-pointer" onClick={handleRequestCallBack}>
                              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📞</div>
                              <p className="font-black uppercase text-[10px] text-[#1E3A8A] tracking-widest">Callback Request</p>
                           </div>
                           <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col justify-center text-center group cursor-pointer" onClick={handleNotifyWorkOrder}>
                              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏗️</div>
                              <p className="font-black uppercase text-[10px] text-emerald-600 tracking-widest">Place Work Order</p>
                           </div>
                        </div>
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border mb-10 overflow-hidden">
                           <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight mb-8">Engineering Ledger</h3>
                           <div className="overflow-x-auto rounded-[2.5rem] border bg-slate-50/50 mb-8">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest">
                                  <tr><th className="p-5">Material Detail</th><th className="p-5">Quantity</th><th className="p-5 text-right">Cost (₹)</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                  {estimate.materials?.map((m, i) => (
                                    <tr key={i} className="bg-white/50">
                                      <td className="p-5 font-black">{m.name}<div className="text-[8px] text-[#1E3A8A] mt-1 uppercase tracking-widest">{m.brandSuggestion}</div></td>
                                      <td className="p-5 font-bold">{m.quantity}</td>
                                      <td className="p-5 text-right font-black">₹{m.totalPrice.toLocaleString('en-IN')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                           </div>
                           <PaymentSection total={estimate.totalEstimatedCost} />
                        </div>
                        {generatedImage && (
                          <div className="group relative rounded-[5rem] overflow-hidden shadow-2xl border-8 border-white animate-in zoom-in-95 duration-700 bg-slate-200">
                            <img src={generatedImage} className="w-full h-[600px] object-cover transition-transform duration-1000 group-hover:scale-105" alt="Architectural Render" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-16">
                               <p className="text-white font-black text-5xl uppercase tracking-tighter mb-4">Vision Render</p>
                               <p className="text-white/60 font-bold text-xs uppercase tracking-widest max-w-lg">Indicative design concept based on project metrics.</p>
                            </div>
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="h-[600px] flex flex-col items-center justify-center text-center p-20 border-8 border-dashed border-slate-100 rounded-[6rem] opacity-30 select-none">
                        <div className="text-[12rem] mb-8">{loading ? "⏳" : "📊"}</div>
                        <h3 className="text-4xl font-black text-slate-400 uppercase tracking-tighter">Analysis Terminal</h3>
                        <p className="text-sm font-bold text-slate-300 mt-4 uppercase tracking-[0.3em]">{loading ? "Generating Quote & Vision Render..." : "Input parameters to sync with Hub Index"}</p>
                     </div>
                   )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
