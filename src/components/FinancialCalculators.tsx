import React, { useState } from 'react';

type CalcType = 'emi' | 'sip' | 'gst' | 'inflation';

interface FinancialCalculatorsProps {
  displayName: string;
}

const FinancialCalculators: React.FC<FinancialCalculatorsProps> = ({ displayName }) => {
  const [activeTab, setActiveTab] = useState<CalcType>('emi');

  // EMI Calculator State
  const [emiPrincipal, setEmiPrincipal] = useState(1500000);
  const [emiRate, setEmiRate] = useState(8.5);
  const [emiDuration, setEmiDuration] = useState(15); // Years

  // SIP Calculator State
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // GST Calculator State
  const [gstAmount, setGstAmount] = useState(50000);
  const [gstRate, setGstRate] = useState(18);
  const [gstType, setGstType] = useState<'add' | 'remove'>('add');

  // Inflation Calculator State
  const [inflationAmt, setInflationAmt] = useState(100000);
  const [inflationRate, setInflationRate] = useState(6.5);
  const [inflationYears, setInflationYears] = useState(10);

  // Math Calculations
  // 1. EMI
  const calculateEMI = () => {
    const P = emiPrincipal;
    const r = emiRate / 12 / 100;
    const n = emiDuration * 12;
    if (r === 0) return { emi: P / n, totalPay: P, totalInterest: 0 };
    
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPay = emi * n;
    const totalInterest = totalPay - P;
    return { emi, totalPay, totalInterest };
  };

  // 2. SIP
  const calculateSIP = () => {
    const P = sipMonthly;
    const i = sipRate / 12 / 100;
    const n = sipYears * 12;
    if (i === 0) return { invested: P * n, futureValue: P * n, returns: 0 };

    const futureValue = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const invested = P * n;
    const returns = futureValue - invested;
    return { invested, futureValue, returns };
  };

  // 3. GST
  const calculateGST = () => {
    const amt = gstAmount;
    const rate = gstRate;
    let taxAmount = 0;
    let finalAmount = 0;

    if (gstType === 'add') {
       taxAmount = (amt * rate) / 100;
       finalAmount = amt + taxAmount;
    } else {
       finalAmount = amt / (1 + rate / 100);
       taxAmount = amt - finalAmount;
    }
    return { baseAmount: gstType === 'add' ? amt : finalAmount, taxAmount, total: gstType === 'add' ? finalAmount : amt };
  };

  // 4. Inflation
  const calculateInflation = () => {
    const principal = inflationAmt;
    const rate = inflationRate / 100;
    const n = inflationYears;
    
    // Future Equivalent Buying Power needed
    const futureEquivalentPrice = principal * Math.pow(1 + rate, n);
    // Real Value of present amount in the future
    const realFutureValue = principal / Math.pow(1 + rate, n);
    const lossOfPower = principal - realFutureValue;

    return { futureEquivalentPrice, realFutureValue, lossOfPower };
  };

  const emiResult = calculateEMI();
  const sipResult = calculateSIP();
  const gstResult = calculateGST();
  const inflationResult = calculateInflation();

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-100 text-[10px] font-black uppercase tracking-widest">
          Dynamic Workspace Treasury for {displayName}
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
          Financial Calculator Suite
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-relaxed">
          {displayName}, you can calculate your home, vehicle, and personal loan calculations, compounding interest growth, and inflation indexing here.
        </p>
      </div>

      {/* Selector Tabs */}
      <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto bg-slate-100 p-2 rounded-2xl border border-slate-200">
        {[
          { id: 'emi', label: 'Loan EMI Calculator', icon: '🏦' },
          { id: 'sip', label: 'SIP compounding', icon: '📈' },
          { id: 'gst', label: 'GST Sales Tax', icon: '🧾' },
          { id: 'inflation', label: 'Purchasing Depreciation', icon: '💸' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as CalcType)}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-[#1E3A8A] text-white shadow-lg shadow-[#1E3A8A]/20'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="max-w-5xl mx-auto bg-white border border-slate-100 shadow-xl rounded-[2.5rem] p-8 sm:p-12 text-slate-800">
        {activeTab === 'emi' && (
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="text-md font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4 flex items-center justify-between">
                <span>Principal & Rates</span>
                <span className="text-blue-500">#CorporateDebt</span>
              </h3>

              {/* Loan Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Principal Amount</label>
                  <span className="text-slate-900 font-extrabold">₹{emiPrincipal.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="50000000"
                  step="50000"
                  value={emiPrincipal}
                  onChange={(e) => setEmiPrincipal(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>1 Lakh</span>
                  <span>5 Crores</span>
                </div>
              </div>

              {/* Rate of Interest */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Interest Rate (% p.a.)</label>
                  <span className="text-slate-900 font-extrabold">{emiRate}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="0.1"
                  value={emiRate}
                  onChange={(e) => setEmiRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>5% Min</span>
                  <span>20% Max</span>
                </div>
              </div>

              {/* Duration in Years */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Loan Term / Period</label>
                  <span className="text-slate-900 font-extrabold">{emiDuration} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={emiDuration}
                  onChange={(e) => setEmiDuration(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>1 Year</span>
                  <span>30 Years</span>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Monthly EMI Payment</p>
                <h4 className="text-4xl sm:text-5xl font-black text-emerald-600">₹{Math.ceil(emiResult.emi).toLocaleString()}</h4>
              </div>

              <div className="h-px bg-slate-200"></div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Principal Borrowed</p>
                  <p className="text-md font-extrabold text-[#1E3A8A]">₹{emiPrincipal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Interest Owed</p>
                  <p className="text-md font-extrabold text-blue-600">₹{Math.ceil(emiResult.totalInterest).toLocaleString()}</p>
                </div>
              </div>

              {/* Progress bar representing Principal vs Interest */}
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                  <span>Principal ({Math.round(100 * emiPrincipal / emiResult.totalPay)}%)</span>
                  <span>Interest ({Math.round(100 * emiResult.totalInterest / emiResult.totalPay)}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(emiPrincipal / emiResult.totalPay) * 100}%` }}></div>
                  <div className="bg-[#1E3A8A] h-full" style={{ width: `${(emiResult.totalInterest / emiResult.totalPay) * 100}%` }}></div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-xl p-4 flex justify-between items-center mt-6 shadow-sm">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aggregate repayment valuation:</span>
                <span className="text-xs font-black text-[#1E3A8A]">₹{Math.ceil(emiResult.totalPay).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sip' && (
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="text-md font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4 flex items-center justify-between">
                <span>Wealth Parameters</span>
                <span className="text-emerald-600">#CompoundingFuture</span>
              </h3>

              {/* Monthly Contribution */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Monthly Contribution</label>
                  <span className="text-slate-900 font-extrabold">₹{sipMonthly.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="500000"
                  step="500"
                  value={sipMonthly}
                  onChange={(e) => setSipMonthly(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>₹500</span>
                  <span>5 Lakhs / mo</span>
                </div>
              </div>

              {/* Expected Rate of Return */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Expected Return Rate (% p.a.)</label>
                  <span className="text-slate-900 font-extrabold">{sipRate}%</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="0.5"
                  value={sipRate}
                  onChange={(e) => setSipRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>3% Min</span>
                  <span>30% Max</span>
                </div>
              </div>

              {/* Investment Years */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Investment Tenure</label>
                  <span className="text-slate-900 font-extrabold">{sipYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={sipYears}
                  onChange={(e) => setSipYears(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>1 Year</span>
                  <span>40 Years</span>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Future Portfolio Value</p>
                <h4 className="text-4xl sm:text-5xl font-black text-emerald-600">₹{Math.ceil(sipResult.futureValue).toLocaleString()}</h4>
              </div>

              <div className="h-px bg-slate-200"></div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Invested Capital</p>
                  <p className="text-md font-extrabold text-slate-800">₹{sipResult.invested.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Estimated Growth Generated</p>
                  <p className="text-md font-extrabold text-[#1E3A8A]">₹{Math.ceil(sipResult.returns).toLocaleString()}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                  <span>Capital Owed ({Math.round(100 * sipResult.invested / sipResult.futureValue)}%)</span>
                  <span>Returns growth ({Math.round(100 * sipResult.returns / sipResult.futureValue)}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                  <div className="bg-blue-300 h-full" style={{ width: `${(sipResult.invested / sipResult.futureValue) * 100}%` }}></div>
                  <div className="bg-emerald-500 h-full" style={{ width: `${(sipResult.returns / sipResult.futureValue) * 100}%` }}></div>
                </div>
              </div>

              <p className="text-[9px] font-extrabold text-center text-slate-400 uppercase tracking-widest">
                Compounded growth index projection based on constant deposits
              </p>
            </div>
          </div>
        )}

        {activeTab === 'gst' && (
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="text-md font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4 flex items-center justify-between">
                <span>Tax Config</span>
                <span className="text-[#1E3A8A]">#SalesReceiptTax</span>
              </h3>

              {/* Base Amount */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Base Capital Amount (₹)</label>
                <input
                  type="number"
                  value={gstAmount}
                  onChange={(e) => setGstAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 outline-none transition-all"
                  placeholder="e.g. 50000"
                />
              </div>

              {/* GST Tax Type */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Calculation Class</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setGstType('add')}
                    className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      gstType === 'add'
                        ? 'bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Add GST (Exclusive)
                  </button>
                  <button
                    onClick={() => setGstType('remove')}
                    className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      gstType === 'remove'
                        ? 'bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Remove GST (Inclusive)
                  </button>
                </div>
              </div>

              {/* Standard GST Rates */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Standard Rates (% rate)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 12, 18, 28].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setGstRate(rate)}
                      className={`py-3.5 rounded-xl text-xs font-black uppercase border transition-all ${
                        gstRate === rate
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Unified Price</p>
                <h4 className="text-4xl sm:text-5xl font-black text-emerald-600">₹{Math.ceil(gstResult.total).toLocaleString()}</h4>
              </div>

              <div className="h-px bg-slate-200"></div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold py-2 border-b border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px]">Net Selling price (No Tax)</span>
                  <span className="text-slate-800 font-extrabold">₹{Math.ceil(gstResult.baseAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold py-2 border-b border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px]">GST Tax Component ({gstRate}%)</span>
                  <span className="text-[#1E3A8A] font-extrabold">₹{Math.ceil(gstResult.taxAmount).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mt-6">
                Apportioned as per SGST 50% & CGST 50% split provisions
              </p>
            </div>
          </div>
        )}

        {activeTab === 'inflation' && (
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Inputs */}
            <div className="space-y-6">
              <h3 className="text-md font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4 flex items-center justify-between">
                <span>Value Depreciation</span>
                <span className="text-red-500">#PurchasingLoss</span>
              </h3>

              {/* Present Capital */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Current Principal Value</label>
                  <span className="text-slate-900 font-extrabold">₹{inflationAmt.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="10000000"
                  step="5000"
                  value={inflationAmt}
                  onChange={(e) => setInflationAmt(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>₹5,000</span>
                  <span>1 Crore</span>
                </div>
              </div>

              {/* Expected Inflation rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>inflation rate (% p.a.)</label>
                  <span className="text-slate-900 font-extrabold">{inflationRate}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>1% Min</span>
                  <span>20% Max</span>
                </div>
              </div>

              {/* Number of Years */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                  <label>Depreciation Period</label>
                  <span className="text-slate-900 font-extrabold">{inflationYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={inflationYears}
                  onChange={(e) => setInflationYears(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]"
                />
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase mt-1">
                  <span>1 Year</span>
                  <span>30 Years</span>
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-8">
              <div className="text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Real future Purchasing Power Valuation</p>
                <h4 className="text-4xl sm:text-5xl font-black text-red-500">₹{Math.ceil(inflationResult.realFutureValue).toLocaleString()}</h4>
              </div>

              <div className="h-px bg-slate-200"></div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold py-2 border-b border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px]">Future price equivalent (Due to CAGR hike)</span>
                  <span className="text-slate-800 font-extrabold">₹{Math.ceil(inflationResult.futureEquivalentPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold py-2 border-b border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px]">Depreciation Net Worth Loss of Buying Power</span>
                  <span className="text-red-500 font-extrabold">₹{Math.ceil(inflationResult.lossOfPower).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center mt-6">
                Calculated on compound decay equations utilizing constant annual factors
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialCalculators;
