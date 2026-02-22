
import React, { useState, useEffect, useRef } from 'react';
import { EstimationResult, TaskConfig, MarketPriceList } from './types';
import { CONSTRUCTION_TASKS } from './constants';
import { getConstructionEstimate, getRawMaterialPriceList, sendMessageToAssistant } from './services/geminiService';
import { notifyCloud } from './services/notificationService';
import { supabase } from './services/supabaseClient';

const BRAND_NAME = "Ajay Projects";
const UPI_ID = "ajay.t.me@icici";
const SUPPORT_EMAIL = "ajay.ai.spoc@gmail.com";
const GUEST_LIMIT = 3;
const SUBSCRIPTION_FEE = 499;

// --- AUTHENTICATION SCREEN ---
const AuthScreen = ({ onGuestMode, onSignupSuccess, forceLogin }: { onGuestMode?: (phone: string) => void, onSignupSuccess: () => void, forceLogin?: boolean }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isGuestPhonePrompt, setIsGuestPhonePrompt] = useState(false);
  const [guestPhone, setGuestPhone] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (isLogin) {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) setMessage({ type: 'success', text: "Access granted. Synchronizing portal..." });
      } else {
        if (!fullName) throw new Error("Full Name required.");
        if (!phone) throw new Error("Phone number required.");
        if (!location) throw new Error("Location required.");
        const { error, data } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: fullName, role: 'agent', phone, location } }
        });
        if (error) throw error;
        if (data.user) {
          // DATABASE FIX: Aligned with schema: id, full_name, phone, location, is_premium
          // We use a robust profile sync that handles cases where a trigger might have already fired.
          const profileData = { 
            id: data.user.id, 
            full_name: fullName, 
            is_premium: false,
            phone: phone,
            location: location
          };

          // Robust profile sync: Try to insert first.
          const { error: insertError } = await supabase.from('profiles').insert(profileData);
          
          if (insertError) {
            // If it already exists (likely created by a trigger), update the existing record
            if (insertError.code === '23505') {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                  full_name: fullName, 
                  phone: phone, 
                  location: location 
                })
                .eq('id', data.user.id);
              
              if (updateError) {
                console.error("Profile update failed:", updateError);
                setMessage({ type: 'error', text: "Account created but profile sync failed. Please contact admin." });
                return;
              }
            } else {
              console.error("Profile insert failed:", insertError);
              setMessage({ type: 'error', text: "Account created but profile sync failed. Please contact admin." });
              return;
            }
          }
          
          setMessage({ type: 'success', text: `Registration successful. Access granted.` });
          onSignupSuccess();
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Auth failed." });
    } finally { setLoading(false); }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestPhone.length < 10) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    if (onGuestMode) onGuestMode(guestPhone);
  };

  if (isGuestPhonePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBFF] p-6 animate-in">
        <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl p-10 sm:p-14 border border-slate-100">
          <div className="text-center mb-10">
            <div className="bg-[#1E3A8A] w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl text-white mx-auto mb-6 shadow-xl">📞</div>
            <h2 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter">Guest Registration</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Required for project tracking</p>
          </div>
          {message && <div className={`mb-8 p-5 rounded-[1.5rem] text-[11px] font-bold uppercase text-center border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{message.text}</div>}
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <input required type="tel" placeholder="Your Mobile Number" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none transition-all" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            <button type="submit" className="w-full bg-[#1E3A8A] text-white py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Start Guest Session</button>
            <button type="button" onClick={() => setIsGuestPhonePrompt(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">← Back to Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FBFF] p-6 animate-in">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl p-10 sm:p-14 border border-slate-100">
        <div className="text-center mb-10">
          <div className="bg-[#1E3A8A] w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl text-white mx-auto mb-6 shadow-xl">🏗️</div>
          <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tighter">{BRAND_NAME}</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Engineering Portal v2026</p>
        </div>
        {message && <div className={`mb-8 p-5 rounded-[1.5rem] text-[11px] font-bold uppercase text-center border ${message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{message.text}</div>}
        
        {!isLogin && (
          <div className="mb-8 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 text-center">
            <h3 className="text-[11px] font-black uppercase text-[#1E3A8A] mb-4 tracking-widest">Scan to Pay One-Time Fee: ₹499</h3>
            <div className="bg-white p-3 rounded-2xl inline-block shadow-md mb-2 border border-slate-100">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=Ajay%20Projects&am=499`)}`} className="w-32 h-32" alt="Subscription QR" />
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">VPA: {UPI_ID}</p>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <input required type="text" placeholder="Full Name" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none transition-all" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input required type="tel" placeholder="Mobile Number" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none transition-all" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input required type="text" placeholder="Location (e.g. Troop Bazar)" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none transition-all" value={location} onChange={(e) => setLocation(e.target.value)} />
            </>
          )}
          <input required type="email" placeholder="Agent Email" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input required type="password" placeholder="Portal Password" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-[#1E3A8A] text-white py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
            {loading ? 'Verifying...' : isLogin ? 'Sign In' : 'Subscribe & Sign Up'}
          </button>
        </form>
        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#1E3A8A] transition-colors">{isLogin ? "New Agent? Sign Up" : "Registered Agent? Login"}</button>
          {!forceLogin && onGuestMode && (
            <div className="mt-6 pt-6 border-t border-slate-50">
              <button onClick={() => setIsGuestPhonePrompt(true)} className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest underline">Quick Access (Guest Mode)</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- CHATBOT COMPONENT ---
const ChatBot = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: "Hello! I'm the Ajay Projects AI Assistant. How can I help with your construction planning today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const msg = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);
    try {
      const stream = await sendMessageToAssistant(msg);
      let fullText = "";
      setMessages(prev => [...prev, { role: 'bot', text: "" }]);
      for await (const chunk of stream) {
        fullText += (chunk as any).text || "";
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = fullText;
          return updated;
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "I'm experiencing a high load. Please try again shortly." }]);
    } finally { setIsTyping(false); }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[350px] sm:w-[400px] h-[550px] bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border border-slate-100 z-[2000] flex flex-col overflow-hidden animate-in no-print">
      <div className="bg-[#1E3A8A] p-6 text-white flex justify-between items-center">
        <div>
          <h4 className="font-black uppercase text-[11px] tracking-widest">AI Site Engineer</h4>
          <p className="text-[9px] text-blue-200 uppercase font-bold mt-1">Active Jan 2026 Index</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F9FBFF]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-xs font-semibold ${m.role === 'user' ? 'bg-[#1E3A8A] text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none shadow-sm border'}`}>{m.text}</div>
          </div>
        ))}
        {isTyping && <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">AI is thinking...</div>}
        <div ref={scrollRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about materials..." className="flex-1 bg-slate-50 border-2 border-transparent rounded-[1.2rem] px-5 py-3 text-xs font-bold outline-none focus:border-[#1E3A8A]" />
        <button onClick={handleSend} className="bg-[#1E3A8A] text-white w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-lg active-scale transition-transform">➤</button>
      </div>
    </div>
  );
};

// --- COMMON UI COMPONENTS ---
const FinancialSummary = ({ total, labor, material }: { total: number, labor: number, material: number }) => (
  <div className="bg-[#1E3A8A] p-10 sm:p-12 rounded-[3rem] text-white mb-12 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative z-10">
    <div className="text-center md:text-left">
      <p className="text-[10px] font-black uppercase text-blue-200 mb-2 tracking-widest">Grand Project Valuation</p>
      <h2 className="text-5xl sm:text-6xl font-black">₹{total.toLocaleString()}</h2>
    </div>
    <div className="h-px md:h-20 w-full md:w-px bg-white/10"></div>
    <div className="text-center md:text-right">
      <p className="text-[10px] font-black uppercase text-blue-200 mb-2 tracking-widest">Total Labour Cost</p>
      <h3 className="text-3xl sm:text-4xl font-black">₹{labor.toLocaleString()}</h3>
      <p className="text-[9px] text-blue-300 font-bold uppercase mt-1 tracking-widest">Material Portion: ₹{material.toLocaleString()}</p>
    </div>
  </div>
);

const MaterialBreakdown = ({ materials, materialTotal }: { materials: any[], materialTotal: number }) => (
  <div className="mb-12 relative z-10">
    <h4 className="text-[11px] font-black uppercase text-[#1E3A8A] mb-8 tracking-[0.2em] flex items-center gap-3">
      <span className="w-8 h-px bg-blue-100"></span> 
      Cost of Materials Breakdown
      <span className="flex-1 h-px bg-blue-100"></span>
    </h4>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-slate-100 uppercase text-[9px] text-slate-400 font-black tracking-widest">
            <th className="py-4 pl-4">Engineering Specification</th>
            <th className="py-4">Unit Qty</th>
            <th className="py-4 text-right pr-4">Cost (₹)</th>
          </tr>
        </thead>
        <tbody className="text-xs font-bold text-slate-700">
          {materials?.map((m, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
              <td className="py-6 pl-4">
                <p className="text-sm font-black text-slate-800 uppercase">{m.name}</p>
                <p className="text-[9px] text-blue-500 uppercase mt-1 tracking-widest">{m.brandSuggestion || 'Verified Index'}</p>
              </td>
              <td className="py-6">{m.quantity}</td>
              <td className="py-6 text-right pr-4 text-sm font-black text-slate-800">₹{m.totalPrice?.toLocaleString() || '0'}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-black">
            <td className="py-8 pl-6 text-lg font-black uppercase text-[#1E3A8A]">Total Material Component</td>
            <td></td>
            <td className="py-8 text-right pr-6 text-xl font-black text-[#1E3A8A]">₹{materialTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ConstructionGuidelines = () => (
  <div className="bg-blue-50/50 p-10 rounded-[2.5rem] border border-blue-100 mb-12 relative z-10">
    <h4 className="text-[11px] font-black uppercase text-[#1E3A8A] mb-6 tracking-widest">Guidelines for Construction Management</h4>
    <ul className="space-y-4">
      {[
        { title: "Verify Material Quality", text: "Check the grade of cement (PPC/OPC) and steel (TMT grade) immediately upon site delivery to match specified indices." },
        { title: "Optimize Curing Process", text: "Ensure newly built walls and concrete slabs are watered consistently for at least 7-10 days to achieve full structural strength." },
        { title: "Maintain Site Hygiene", text: "Keep the construction zone clear of debris. Regular cleanup prevents accidents and minimizes material wastage." },
        { title: "Professional Supervision", text: "Always have a qualified engineer verify the steel reinforcement layout before pouring concrete for slabs or columns." },
        { title: "Proper Material Storage", text: "Store cement bags on a raised wooden platform in a dry, covered area to prevent moisture absorption and hardening." }
      ].map((tip, i) => (
        <li key={i} className="flex gap-4">
          <span className="text-[#1E3A8A] font-black text-xs">0{i+1}.</span>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-800 mb-1">{tip.title}</p>
            <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">{tip.text}</p>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const TermsAndConditions = () => (
  <div className="mb-12 relative z-10">
    <h4 className="text-[11px] font-black uppercase text-slate-400 mb-4 tracking-widest">Terms & Conditions</h4>
    <div className="grid md:grid-cols-2 gap-x-12 gap-y-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
      <p>• Validity: Based on Jan 2026 market indices. Valid for 7 days.</p>
      <p>• Milestones: 5% Advance, 45% on Material Delivery, 50% on Completion.</p>
      <p>• Taxes: All prices are inclusive of GST as per current government norms.</p>
      <p>• Support: Communication strictly via email or registered callback request.</p>
      <p>• Execution: Work start subject to site clearance and advance clearance.</p>
      <p>• Variations: Any additional work will be billed as per current index rates.</p>
    </div>
  </div>
);

const PaymentBlock = ({ total, upiId }: { total: number, upiId: string }) => {
  const advanceAmount = Math.ceil(total * 0.05);
  const getQR = (amt: number) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=Ajay%20Projects&cu=INR&am=${amt}`)}`;
  
  return (
    <div className="border-t-4 border-slate-900 pt-16 grid grid-cols-1 md:grid-cols-2 gap-12 no-print relative z-10">
      <div className="flex flex-col items-center p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-100">
        <h4 className="text-[10px] font-black uppercase text-[#1E3A8A] mb-6 tracking-widest text-center">Scan to Pay 5% Advance Booking</h4>
        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl mb-4">
          <img src={getQR(advanceAmount)} className="w-48 h-48" alt="Advance Payment QR" />
        </div>
        <p className="text-xl font-black text-[#1E3A8A]">₹{advanceAmount.toLocaleString()}</p>
        <p className="text-[9px] font-black text-slate-400 mt-2 uppercase">VPA: {upiId}</p>
      </div>
      <div className="flex flex-col items-center p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
        <h4 className="text-[10px] font-black uppercase text-slate-800 mb-6 tracking-widest text-center">Scan for 100% Full Payment</h4>
        <div className="bg-white p-4 rounded-3xl border-2 border-slate-100 shadow-xl mb-4">
          <img src={getQR(total)} className="w-48 h-48" alt="Full Payment QR" />
        </div>
        <p className="text-xl font-black text-slate-800">₹{total.toLocaleString()}</p>
        <p className="text-[9px] font-black text-slate-400 mt-2 uppercase">VPA: {upiId}</p>
      </div>
    </div>
  );
};

// --- MAIN PORTAL ---
const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [guestPhone, setGuestPhone] = useState<string | null>(null);
  const [view, setView] = useState<'estimator' | 'market' | 'history' | 'payments' | 'invoice' | 'premium'>('estimator');
  const [selectedTask, setSelectedTask] = useState<TaskConfig | null>(null);
  const [formInputs, setFormInputs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimationResult | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPriceList | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [tickerText, setTickerText] = useState("Loading current market indices...");
  
  const [guestCount, setGuestCount] = useState<number>(() => {
    const saved = localStorage.getItem('ajay_guest_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { 
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { 
        setUser(session.user); 
        fetchUserProfile(session.user.id);
        setIsGuest(false); 
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });
    getRawMaterialPriceList().then(data => {
      if (data && data.categories) {
        setMarketPrices(data);
        const segments = data.categories.flatMap(c => (c.items || []).map(i => `${i.brandName} ${i.category}: ₹${i.priceWithGst?.toLocaleString()}/${i.unit}`));
        const text = segments.join(' • ');
        setTickerText(`${text} • ${text}`);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    // DATABASE FIX: Strictly query schema: id, full_name, phone, location, is_premium
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!error && data) {
      setUserProfile(data);
    }
  };

  useEffect(() => {
    if (user && view === 'history') {
      supabase.from('estimations').select('*').eq('agent_id', user.id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setHistory(data || []));
    }
  }, [user, view]);

  useEffect(() => {
    localStorage.setItem('ajay_guest_count', guestCount.toString());
  }, [guestCount]);

  const handleCallback = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!formInputs.clientName || !formInputs.clientPhone) return alert("Enter client details first!");
    setLoading(true);
    await notifyCloud('callback_requested', { 
      clientName: formInputs.clientName, 
      clientPhone: formInputs.clientPhone, 
      agent: user?.email || (guestPhone ? `Guest: ${guestPhone}` : 'Guest'),
      task: selectedTask?.title || 'General'
    });
    alert("Callback Requested! We will contact the registered mobile number shortly.");
    setLoading(false);
  };

  const executeCalculation = async () => {
    if (isGuest && guestCount >= GUEST_LIMIT) {
      alert(`Free limit of ${GUEST_LIMIT} estimates reached. Please Sign Up as a Premium Agent to continue.`);
      return;
    }
    
    // Approval Check: Using is_premium as the primary gate
    const isPremiumActive = userProfile?.is_premium === true;
    if (user && !isPremiumActive) {
      alert("Access Pending. Your account is waiting for admin verification of your payment.");
      return; 
    }

    if (!selectedTask) return;
    if (!formInputs.clientName || !formInputs.clientPhone) return alert("Client Name and Mobile are mandatory!");
    setLoading(true);
    setEstimate(null);
    try {
      const result = await getConstructionEstimate(selectedTask.id, formInputs);
      setEstimate(result);
      if (isGuest) setGuestCount(prev => prev + 1);
      
      await notifyCloud('quote_requested', { 
        task: selectedTask.title, 
        inputs: formInputs, 
        result, 
        agent: user?.email || (guestPhone ? `Guest: ${guestPhone}` : 'Guest'), 
        agentId: user?.id 
      });
    } catch (err: any) { 
      alert(err.message || "Engineering service at capacity. Please try again."); 
    } finally { setLoading(false); }
  };

  const handleGuestModeInit = (phone: string) => {
    setGuestPhone(phone);
    setIsGuest(true);
    notifyCloud('access' as any, { clientPhone: phone, clientName: 'New Guest Access', agent: 'Guest Portal' });
  };

  const isFieldVisible = (f: any) => {
    if (!f.dependsOn) return true;
    const depValue = formInputs[f.dependsOn];
    if (Array.isArray(f.showIfValue)) return f.showIfValue.includes(depValue);
    return depValue === f.showIfValue;
  };

  const materialTotal = estimate?.materials?.reduce((sum, m) => sum + (m.totalPrice || 0), 0) || 0;

  // Global access check aligned with simplified is_premium logic
  const isApproved = userProfile?.is_premium === true;
  const isPending = user && userProfile && userProfile.is_premium === false;

  if (!user && !isGuest) return <AuthScreen onSignupSuccess={() => setView('estimator')} onGuestMode={handleGuestModeInit} />;

  return (
    <div className="min-h-screen bg-[#F9FBFF] font-sans pb-28 flex flex-col md:flex-row relative">
      <ChatBot isVisible={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      <aside className="w-full md:w-20 lg:w-24 bg-[#1E3A8A] md:min-h-screen flex md:flex-col items-center justify-between py-6 px-4 no-print shrink-0 md:sticky md:top-0 z-[1100]">
        <div className="flex flex-col items-center gap-8">
          <div className="bg-white/10 p-3 rounded-2xl">
             <div className="text-2xl text-white">🏗️</div>
          </div>
          <button 
            onClick={() => {if(!user) {setIsGuest(false); setView('estimator'); setSelectedTask(null); setEstimate(null);}}}
            className="group relative flex flex-col items-center gap-2"
          >
            <div className={`p-4 rounded-2xl transition-all ${!user ? 'bg-blue-500 shadow-lg scale-110' : 'bg-white/5 hover:bg-white/10'}`}>
              <div className="text-xl text-white">🔑</div>
            </div>
            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest text-center group-hover:text-white transition-colors">Premium</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="bg-[#1E3A8A] text-white py-2 overflow-hidden whitespace-nowrap no-print border-b border-white/10">
          <div className="inline-block animate-marquee uppercase text-[10px] font-black tracking-widest px-4">
            {tickerText}
          </div>
        </div>

        <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 py-6 px-10 sticky top-0 z-[1000] shadow-sm no-print">
          <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => {setView('estimator'); setSelectedTask(null); setEstimate(null);}}>
              <div>
                <h1 className="text-xl font-black text-[#1E3A8A] uppercase tracking-tighter leading-none">{BRAND_NAME}</h1>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
                  {user ? `Welcome ${userProfile?.full_name || user.email}` : `Guest Mode (${GUEST_LIMIT - guestCount} Left)`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {setView('estimator'); setSelectedTask(null); setEstimate(null);}} className={`px-5 py-3 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest ${view === 'estimator' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Estimator</button>
              <button onClick={() => setView('market')} className={`px-5 py-3 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest ${view === 'market' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>Market</button>
              {user && <button onClick={() => setView('history')} className={`px-5 py-3 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest ${view === 'history' ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-400'}`}>History</button>}
              <button onClick={() => user ? supabase.auth.signOut() : setIsGuest(false)} className="px-5 py-3 rounded-[1.2rem] text-[9px] font-black uppercase bg-red-50 text-red-500">Exit</button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 sm:px-10 pt-16">
          {user && isPending && (
             <div className="animate-in max-w-2xl mx-auto py-20 text-center">
                <div className="bg-orange-50 w-24 h-24 rounded-[3rem] flex items-center justify-center text-5xl mx-auto mb-10 border border-orange-100 shadow-sm">⏳</div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-800 mb-4">Subscription Pending Approval</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] leading-relaxed">
                  Thank you for subscribing! Ajay is currently verifying your ₹499 payment. 
                  Access to the Premium Index is usually granted within 2 hours.
                </p>
                <div className="mt-12 pt-10 border-t border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Need help? Contact Admin</p>
                  <p className="text-sm font-black text-[#1E3A8A] lowercase mt-1">{SUPPORT_EMAIL}</p>
                </div>
             </div>
          )}

          {(!user || isApproved) && view === 'estimator' && !estimate && !selectedTask && (
            <div className="animate-in">
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Engineering Services Portal</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Hyderabad 2026 Material Index Projections</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {CONSTRUCTION_TASKS.map(t => (
                  <div key={t.id} onClick={() => setSelectedTask(t)} className="p-10 bg-white rounded-[3.5rem] border hover:border-[#1E3A8A] transition-all cursor-pointer shadow-sm group relative overflow-hidden">
                    <div className="text-5xl mb-6 bg-slate-50 w-20 h-20 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-50 transition-colors">{t.icon}</div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2 group-hover:text-[#1E3A8A] transition-colors">{t.title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed opacity-60">{t.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!user || isApproved) && selectedTask && !estimate && (
            <div className="max-w-4xl mx-auto bg-white p-10 sm:p-14 rounded-[4rem] border shadow-2xl animate-in">
              <button onClick={() => setSelectedTask(null)} className="mb-10 text-[9px] font-black uppercase text-[#1E3A8A] bg-blue-50 px-6 py-3 rounded-full hover:bg-blue-100 transition-colors">← Back</button>
              <h2 className="text-2xl font-black uppercase mb-12 tracking-tight text-[#1E3A8A]">{selectedTask.title} Configuration</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {selectedTask.fields.filter(isFieldVisible).map(f => (
                  <div key={f.name} className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{f.label}</label>
                    {f.type === 'select' ? (
                      <select 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.2rem] px-6 py-4 text-xs font-bold outline-none"
                        value={formInputs[f.name] || ''}
                        onChange={(e) => setFormInputs({...formInputs, [f.name]: e.target.value})}
                      >
                        <option value="">{f.placeholder}</option>
                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-[#1E3A8A] rounded-[1.2rem] px-6 py-4 text-xs font-bold outline-none" 
                        placeholder={f.placeholder} 
                        type={f.type} 
                        value={formInputs[f.name] || ''}
                        onChange={(e) => setFormInputs({...formInputs, [f.name]: e.target.value})} 
                      />
                    )}
                  </div>
                ))}
              </div>
              <button onClick={executeCalculation} disabled={loading} className="w-full mt-14 py-6 rounded-[1.8rem] bg-[#1E3A8A] text-white font-black uppercase tracking-widest shadow-2xl hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50">
                {loading ? 'Consulting 2026 Indices...' : 'Generate Validated Proposal'}
              </button>
            </div>
          )}

          {estimate && (
            <div className="animate-in max-w-5xl mx-auto space-y-8 pb-20 relative z-10">
              <div className="flex justify-end gap-4 no-print flex-wrap relative z-[200]">
                <button onClick={() => window.print()} className="bg-[#1E3A8A] text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-800 cursor-pointer">Print Proposal</button>
                <button onClick={() => {setEstimate(null); setView('estimator');}} className="bg-slate-50 text-slate-800 px-6 py-3 rounded-xl font-black uppercase text-[10px] border border-slate-200 cursor-pointer">New Estimate</button>
              </div>
              <div className="bg-white p-10 sm:p-20 rounded-[4rem] border shadow-2xl relative overflow-hidden" id="printable-invoice">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[10rem] -mr-32 -mt-32 no-print"></div>
                <div className="flex justify-between items-start mb-16 relative z-10">
                  <div>
                    <div className="bg-[#1E3A8A] w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white mb-6">🏗️</div>
                    <h1 className="text-3xl font-black text-[#1E3A8A] uppercase tracking-tighter mb-1">{BRAND_NAME}</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hyderabad Engineering Index</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ref ID</p>
                    <p className="text-sm font-black text-slate-800 uppercase mb-4">#AJ-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                    <p className="text-sm font-bold text-slate-500 uppercase">{new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="mb-12 relative z-10 border-b border-slate-50 pb-8">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Client Context</h4>
                  <p className="text-2xl font-black text-slate-800 mb-1">{formInputs.clientName}</p>
                  <p className="text-sm font-bold text-slate-500 uppercase">{formInputs.area_location || 'Local Zone'}, Hyderabad</p>
                </div>
                <FinancialSummary total={estimate.totalEstimatedCost} labor={estimate.laborCost} material={materialTotal} />
                <MaterialBreakdown materials={estimate.materials} materialTotal={materialTotal} />
                <ConstructionGuidelines />
                <TermsAndConditions />
                <PaymentBlock total={estimate.totalEstimatedCost} upiId={UPI_ID} />
              </div>
            </div>
          )}

          {view === 'market' && marketPrices?.categories && (
            <div className="grid md:grid-cols-2 gap-10 animate-in pb-20">
              {marketPrices.categories.map((cat, i) => (
                <div key={i} className="bg-white p-12 rounded-[3.5rem] border shadow-sm">
                  <h3 className="text-xl font-black uppercase text-[#1E3A8A] mb-10 border-b-2 border-slate-50 pb-6">{cat.title}</h3>
                  <div className="space-y-8">
                    {cat.items?.map((item, j) => (
                      <div key={j} className="flex justify-between items-center group">
                        <div><p className="text-sm font-black text-slate-800 group-hover:text-[#1E3A8A] transition-colors">{item.brandName}</p><p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">{item.specificType} {item.category}</p></div>
                        <div className="text-right"><p className="text-lg font-black text-[#1E3A8A]">₹{item.priceWithGst?.toLocaleString() || '0'}</p><p className="text-[9px] font-bold text-slate-400 uppercase">per {item.unit}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'history' && (
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in pb-20">
               {history.length > 0 ? history.map((h, i) => (
                 <div key={i} className="bg-white p-10 rounded-[3rem] border shadow-sm cursor-pointer hover:shadow-xl transition-all group" onClick={() => {setEstimate(h.result); setView('estimator');}}>
                   <span className="text-[9px] font-black uppercase bg-slate-100 px-4 py-1.5 rounded-full text-slate-500">{new Date(h.created_at).toLocaleDateString()}</span>
                   <h4 className="text-xl font-black uppercase text-slate-800 mt-6 mb-2 group-hover:text-[#1E3A8A]">{h.client_name}</h4>
                   <div className="pt-6 border-t mt-6 flex justify-between items-center">
                      <p className="text-lg font-black text-[#1E3A8A]">₹{h.result?.totalEstimatedCost?.toLocaleString() || 'N/A'}</p>
                   </div>
                 </div>
               )) : <div className="col-span-full py-32 text-center opacity-30 text-4xl font-black uppercase tracking-widest">📁 NO RECORDS</div>}
             </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 120s linear infinite;
          padding-left: 20px;
          min-width: 100%;
        }
        @media print {
          .no-print { display: none !important; }
          #printable-invoice { border: none !important; box-shadow: none !important; border-radius: 0 !important; padding: 0 !important; }
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
