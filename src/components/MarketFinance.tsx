import React, { useState } from 'react';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  volume: string;
  high24h: number;
  low24h: number;
  history: Record<string, number[]>; // Key is timeline name e.g. "1D", "1W", "1M", "1Y", "5Y"
  news: { title: string; source: string; time: string; summary: string }[];
}

interface IPOData {
  name: string;
  issuePrice: string;
  gmp: string;
  gmpPercent: number;
  gmpPositive: boolean;
  yearsInBusiness: number;
  founded: number;
  status: 'Open' | 'Upcoming' | 'Closed' | 'Listed';
  size: string;
  lotSize: string;
  businessInfo: string;
}

interface NFOData {
  name: string;
  openDate: string;
  closeDate: string;
  minInvestment: string;
  category: string;
  objective: string;
}

const INITIAL_STOCKS: StockData[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    price: 2450.50,
    change: 25.40,
    changePercent: 1.05,
    marketCap: "₹ 16.5 Lakh Cr",
    volume: "3.4M",
    high24h: 2465.00,
    low24h: 2422.10,
    history: {
      "1D": [2425, 2432, 2420, 2445, 2440, 2452, 2450.50],
      "1W": [2390, 2410, 2405, 2422, 2430, 2415, 2450.50],
      "1M": [2320, 2350, 2380, 2365, 2410, 2435, 2450.50],
      "1Y": [2150, 2220, 2180, 2300, 2340, 2410, 2450.50],
      "5Y": [1200, 1550, 1850, 2100, 2220, 2350, 2450.50]
    },
    news: [
      {
        title: "Reliance partners with NVIDIA to build major sovereign AI supercloud",
        source: "Economic Times",
        time: "2 hours ago",
        summary: "Reliance has signed a multi-year partnership with NVIDIA to construct state-of-the-art AI cloud facilities inside India to cater to local Indian enterprises."
      },
      {
        title: "Jio introduces ultra-high speed fiber plans starting at ₹499",
        source: "Business Standard",
        time: "1 day ago",
        summary: "Reliance Jio Infocomm has rolled out upgraded home internet packages designed with enhanced uplink streams suited for corporate remote employees."
      },
      {
        title: "Reliance Retail acquires premium luxury lifestyle operator stakes",
        source: "Mint",
        time: "3 days ago",
        summary: "The retail arm expansion continues with strategic investments in premium lifestyle portals as demand continues to swell."
      }
    ]
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd",
    price: 3850.00,
    change: -42.30,
    changePercent: -1.08,
    marketCap: "₹ 14.1 Lakh Cr",
    volume: "1.2M",
    high24h: 3895.00,
    low24h: 3838.00,
    history: {
      "1D": [3892, 3885, 3870, 3875, 3862, 3848, 3850.00],
      "1W": [3910, 3898, 3875, 3890, 3888, 3872, 3850.00],
      "1M": [3780, 3820, 3850, 3890, 3915, 3880, 3850.00],
      "1Y": [3250, 3400, 3450, 3620, 3750, 3920, 3850.00],
      "5Y": [2200, 2800, 3200, 3500, 3400, 3700, 3850.00]
    },
    news: [
      {
        title: "TCS bags a landmark $420M digital systems cloud transition contract",
        source: "LiveMint",
        time: "5 hours ago",
        summary: "A major Scandinavian public pension provider has selected Tata Consultancy Services to completely overhaul its archaic core infrastructure."
      },
      {
        title: "IT spending indicators show incremental improvements for Q3",
        source: "Bloomberg Quint",
        time: "1 day ago",
        summary: "Enterprise clients across North America have resumed early cloud migration projects, according to corporate analysis notes."
      }
    ]
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    price: 1610.15,
    change: 12.80,
    changePercent: 0.80,
    marketCap: "₹ 12.2 Lakh Cr",
    volume: "4.8M",
    high24h: 1618.00,
    low24h: 1595.00,
    history: {
      "1D": [1598, 1602, 1595, 1612, 1608, 1614, 1610.15],
      "1W": [1580, 1592, 1601, 1598, 1612, 1605, 1610.15],
      "1M": [1520, 1545, 1572, 1560, 1590, 1618, 1610.15],
      "1Y": [1480, 1510, 1495, 1550, 1585, 1630, 1610.15],
      "5Y": [1150, 1380, 1420, 1500, 1410, 1580, 1610.15]
    },
    news: [
      {
        title: "HDFC Bank approves major domestic board restructuring of credit business",
        source: "Financial Express",
        time: "3 hours ago",
        summary: "In a move to optimize operational metrics, HDFC Bank plans to streamline middle-tier corporate lending divisions under a single umbrella."
      },
      {
        title: "Credit card spends hit historic peak of ₹27,500 Cr across retail portals",
        source: "Economic Times",
        time: "2 days ago",
        summary: "Aggressive integration of instant cash-backs on Indian commerce networks has supported higher transaction velocity this summer."
      }
    ]
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    price: 920.40,
    change: 18.60,
    changePercent: 2.06,
    marketCap: "₹ 3.1 Lakh Cr",
    volume: "5.1M",
    high24h: 928.00,
    low24h: 901.10,
    history: {
      "1D": [902, 908, 915, 910, 922, 918, 920.40],
      "1W": [880, 895, 890, 908, 912, 902, 920.40],
      "1M": [850, 862, 885, 878, 898, 912, 920.40],
      "1Y": [620, 680, 720, 790, 850, 905, 920.40],
      "5Y": [180, 240, 390, 480, 520, 790, 920.40]
    },
    news: [
      {
        title: "Tata Motors domestic EV division scales production to target record 1L units",
        source: "CNBC TV18",
        time: "1 hour ago",
        summary: "The automotive giant has launched upgraded solid-state battery cells for long-range commercial transport trucks, cutting charging cycles by 35%."
      },
      {
        title: "Sovereign procurement mandates lift Tata Motors defense logistics wing",
        source: "Mint",
        time: "1 day ago",
        summary: "The Indian Army placed bulk logistics vehicle supply orders with Tata Motors under the state capital self-reliance incentive programs."
      }
    ]
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    price: 1480.00,
    change: 5.30,
    changePercent: 0.36,
    marketCap: "₹ 6.1 Lakh Cr",
    volume: "2.1M",
    high24h: 1492.00,
    low24h: 1475.00,
    history: {
      "1D": [1476, 1485, 1479, 1488, 1482, 1478, 1480.00],
      "1W": [1455, 1464, 1470, 1462, 1485, 1488, 1480.00],
      "1M": [1410, 1435, 1442, 1465, 1495, 1472, 1480.00],
      "1Y": [1320, 1380, 1350, 1420, 1460, 1510, 1480.00],
      "5Y": [950, 1250, 1550, 1720, 1480, 1550, 1480.00]
    },
    news: [
      {
        title: "Infosys launches Topaz Generative AI solution suite for enterprise workflows",
        source: "Business Line",
        time: "4 hours ago",
        summary: "Infosys is helping global financial firms streamline administrative checks using highly localized fine-tuned LLM agents."
      }
    ]
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    price: 1080.50,
    change: -1.20,
    changePercent: -0.11,
    marketCap: "₹ 7.6 Lakh Cr",
    volume: "2.9M",
    high24h: 1088.00,
    low24h: 1076.00,
    history: {
      "1D": [1082, 1085, 1074, 1080, 1083, 1079, 1080.50],
      "1W": [1068, 1075, 1072, 1085, 1081, 1086, 1080.50],
      "1M": [1040, 1052, 1065, 1058, 1076, 1088, 1080.50],
      "1Y": [910, 942, 960, 1010, 1045, 1092, 1080.50],
      "5Y": [450, 620, 710, 820, 890, 990, 1080.50]
    },
    news: [
      {
        title: "ICICI Bank expands automated corporate treasury products with APIs",
        source: "Business Standard",
        time: "6 hours ago",
        summary: "Large industrial corporations can now manage liquid assets, payroll lines, and commercial notes automatically through ICICI developer portals."
      }
    ]
  }
];

const LATEST_IPOS: IPOData[] = [
  {
    name: "Waaree Energies Ltd",
    issuePrice: "₹ 1,503",
    gmp: "+₹ 1,480",
    gmpPercent: 98.4,
    gmpPositive: true,
    yearsInBusiness: 37,
    founded: 1989,
    status: "Listed",
    size: "₹ 4,321 Cr",
    lotSize: "9 Shares",
    businessInfo: "Waaree Energies is India's largest manufacturer of solar PV modules, with an aggregate installed capacity of over 12 GW. They manufacture premium qualitative monocrystalline and polycrystalline premium solar components for utility-scale green projects in India, US, and EU."
  },
  {
    name: "Swiggy Ltd",
    issuePrice: "₹ 390",
    gmp: "+₹ 30",
    gmpPercent: 7.7,
    gmpPositive: true,
    yearsInBusiness: 12,
    founded: 2014,
    status: "Listed",
    size: "₹ 11,327 Cr",
    lotSize: "38 Shares",
    businessInfo: "Swiggy is a leading technology platform connecting diners with delivery partners and restaurant establishments. In addition to quick-commerce delivery services through swiggy instamart, Swiggy is deep into online dinner desk reservations, brand advertising, and subscription-backed privilege coupons."
  },
  {
    name: "Hyundai Motor India Ltd",
    issuePrice: "₹ 1,960",
    gmp: "+₹ 65",
    gmpPercent: 3.3,
    gmpPositive: true,
    yearsInBusiness: 30,
    founded: 1996,
    status: "Listed",
    size: "₹ 27,870 Cr",
    lotSize: "7 Shares",
    businessInfo: "Hyundai passenger car developer established as a wholly owned subsidiary of the South Korean parent model in 1996. Hyundai Motor India stands as the runner-largest passenger auto producer in India, operating an advanced production cluster in Sriperumbudur near Chennai."
  },
  {
    name: "Indegene Ltd",
    issuePrice: "₹ 452",
    gmp: "+₹ 280",
    gmpPercent: 61.9,
    gmpPositive: true,
    yearsInBusiness: 28,
    founded: 1998,
    status: "Listed",
    size: "₹ 1,842 Cr",
    lotSize: "33 Shares",
    businessInfo: "Indegene provides digital-first commercialization services to the global healthcare and pharmaceutical industries. They assist massive medical groups in developing automated sales logs, streamlining pharmacovigilance reports, and modernizing clinical trial marketing."
  },
  {
    name: "Acme Solar Holdings",
    issuePrice: "₹ 289",
    gmp: "-₹ 8",
    gmpPercent: -2.7,
    gmpPositive: false,
    yearsInBusiness: 11,
    founded: 2015,
    status: "Listed",
    size: "₹ 2,900 Cr",
    lotSize: "51 Shares",
    businessInfo: "Acme Solar Holdings builds and handles heavy hybrid alternative energy clusters across central India. It focuses on expanding storage system infrastructures and supply of low-cost power options to states."
  }
];

const LATEST_NFOS: NFOData[] = [
  {
    name: "SBI Energy Opportunities Fund",
    openDate: "June 1, 2026",
    closeDate: "June 15, 2026",
    minInvestment: "₹ 5,000",
    category: "Thematic - Energy & Power",
    objective: "To generate premium capital growth by investing in equity holdings across traditional power distributors, green PV arrays, smart grid technology manufacturers, and coal-miner conglomerates."
  },
  {
    name: "HDFC Defense Fund",
    openDate: "June 10, 2026",
    closeDate: "June 24, 2026",
    minInvestment: "₹ 1,000",
    category: "Thematic - Industrial & Defense",
    objective: "Targets robust wealth scaling through strategic tactical inputs in Indian defense firms, radar developers, shipping builders, aerospace parts suppliers, and sovereign logistical platforms."
  },
  {
    name: "ICICI Prudential Nifty 50 Passive Fund",
    openDate: "June 18, 2026",
    closeDate: "July 02, 2026",
    minInvestment: "₹ 5,000",
    category: "Passive - Large Cap Index",
    objective: "A simplified option designed to yield returns matching the Nifty 50 Index exactly by maintaining precise asset weights. High cost efficiency, minimal tracker decay, suited for retail savings."
  }
];

interface MarketFinanceProps {
  displayName: string;
}

const MarketFinance: React.FC<MarketFinanceProps> = ({ displayName }) => {
  const [selectedStock, setSelectedStock] = useState<StockData>(INITIAL_STOCKS[0]);
  const [selectedTimeline, setSelectedTimeline] = useState<string>("1M");
  const [selectedIpo, setSelectedIpo] = useState<IPOData | null>(null);
  const [stockSearchQuery, setStockSearchQuery] = useState<string>("");
  const [generalStockList, setGeneralStockList] = useState<StockData[]>(INITIAL_STOCKS);

  // Filter stocks based on query
  const filteredStocks = generalStockList.filter(
    s => s.symbol.toUpperCase().includes(stockSearchQuery.toUpperCase()) || 
         s.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  // SVG dimensions for chart
  const paddingX = 40;
  const paddingY = 30;
  const svgWidth = 500;
  const svgHeight = 200;

  // Render responsive coordinates inside current price history arrays
  const historyPoints = selectedStock.history[selectedTimeline] || selectedStock.history["1M"];
  const minPrice = Math.min(...historyPoints) * 0.99;
  const maxPrice = Math.max(...historyPoints) * 1.01;
  const priceRange = maxPrice - minPrice;

  const pointsCount = historyPoints.length;
  const chartCoordinates = historyPoints.map((val, idx) => {
    const x = paddingX + (idx / (pointsCount - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - ((val - minPrice) / priceRange) * (svgHeight - paddingY * 2);
    return { x, y, value: val };
  });

  const svgPathString = chartCoordinates.reduce((path, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, "");

  const fillPathString = `${svgPathString} L ${chartCoordinates[pointsCount - 1].x} ${svgHeight - paddingY} L ${chartCoordinates[0].x} ${svgHeight - paddingY} Z`;

  const isPositiveGrowth = selectedStock.change >= 0;

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* Tab Header block matching others exactly in terminology */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-100 text-[10px] font-black uppercase tracking-widest animate-pulse">
          Market Intelligence Suite for {displayName}
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
          Market Finance Dashboard
        </h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-relaxed">
          {displayName}, you can get real-time info about your favorite stocks, IPO valuations, GMP premiums, and latest list of NFOs here.
        </p>
      </div>

      {/* Primary stock index overview bar (Google Finance style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
        <div className="bg-white border border-slate-100 p-4 px-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nifty 50</span>
          <p className="text-lg font-black text-slate-900 mt-1">22,140.60</p>
          <span className="text-[10px] font-bold text-emerald-600 mt-1">▲ +138.40 (+0.63%)</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 px-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">S&P BSE Sensex</span>
          <p className="text-lg font-black text-slate-900 mt-1">72,996.10</p>
          <span className="text-[10px] font-bold text-emerald-600 mt-1">▲ +452.90 (+0.62%)</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 px-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nifty Bank</span>
          <p className="text-lg font-black text-slate-900 mt-1">47,286.40</p>
          <span className="text-[10px] font-bold text-red-500 mt-1">▼ -88.10 (-0.19%)</span>
        </div>
        <div className="bg-white border border-slate-100 p-4 px-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">USD / INR Market</span>
          <p className="text-lg font-black text-slate-900 mt-1">₹ 83.44</p>
          <span className="text-[10px] font-bold text-slate-500 mt-1">● Constant (0.00%)</span>
        </div>
      </div>

      {/* Main Container Workspace splits */}
      <div className="grid lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">
        
        {/* LEFT COLUMN: Stocks Watchlist (Grid / Index List) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-xs font-black uppercase text-[#1E3A8A] tracking-widest">
              Selected Watchlist
            </h3>
            <span className="text-[9px] font-black bg-blue-50 text-[#1E3A8A] border border-blue-100 px-2 py-0.5 rounded-full uppercase">NSE India</span>
          </div>

          {/* Search Stock Input */}
          <input
            type="text"
            value={stockSearchQuery}
            onChange={(e) => setStockSearchQuery(e.target.value)}
            placeholder="Search stock ticker (RELIANCE, TCS...)"
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#1E3A8A] rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-800 outline-none placeholder:text-slate-400 transition-all"
          />

          {/* Stock items array list */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock) => {
                const stockIsPos = stock.change >= 0;
                const isCurrentSelected = selectedStock.symbol === stock.symbol;

                return (
                  <button
                    key={stock.symbol}
                    id={`stock-btn-${stock.symbol}`}
                    onClick={() => setSelectedStock(stock)}
                    className={`w-full flex justify-between items-center p-3.5 rounded-2xl border transition-all text-left outline-none cursor-pointer ${
                      isCurrentSelected
                        ? 'border-[#1E3A8A] bg-blue-50/50 shadow-sm'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-black text-slate-800">{stock.symbol}</p>
                      <p className="text-[9px] font-semibold text-slate-400 line-clamp-1">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <p className={`text-[9px] font-bold uppercase ${stockIsPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {stockIsPos ? '+' : ''}{stock.changePercent}%
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">No stocks matched query</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Chart & Statistics Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Stock Title Bar */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-6">
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{selectedStock.symbol} (EQUITY)</p>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mt-1">{selectedStock.name}</h3>
                
                {/* Core Live Capital details */}
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-900">₹{selectedStock.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className={`text-xs font-black ${isPositiveGrowth ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isPositiveGrowth ? '▲' : '▼'} {isPositiveGrowth ? '+' : ''}{selectedStock.change.toFixed(2)} ({isPositiveGrowth ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Selector Timeline Period controls */}
              <div className="flex gap-1.5 self-start sm:self-auto bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                {["1D", "1W", "1M", "1Y", "5Y"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedTimeline(period)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                      selectedTimeline === period
                        ? 'bg-[#1E3A8A] text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Chart representation */}
            <div className="relative">
              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-auto overflow-visible select-none"
              >
                {/* Horizontal reference grid lines */}
                {[0, 1, 2, 3].map((val) => {
                  const y = paddingY + (val / 3) * (svgHeight - paddingY * 2);
                  const refPrice = maxPrice - (val / 3) * priceRange;
                  return (
                    <g key={val}>
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={svgWidth - paddingX} 
                        y2={y} 
                        stroke="#E2E8F0" 
                        strokeDasharray="4 4" 
                        strokeWidth="1"
                      />
                      <text 
                        x={paddingX - 8} 
                        y={y + 3} 
                        textAnchor="end" 
                        className="font-mono text-[7px] font-bold fill-slate-400"
                      >
                        ₹{Math.ceil(refPrice).toLocaleString()}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Area Map under price line */}
                <path 
                  d={fillPathString} 
                  fill={isPositiveGrowth ? "url(#positiveGradient)" : "url(#negativeGradient)"}
                />

                {/* Primary Trend Stroke path */}
                <path 
                  d={svgPathString} 
                  fill="none" 
                  stroke={isPositiveGrowth ? "#059669" : "#DC2626"} 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Point indicators & tooltips upon hovering */}
                {chartCoordinates.map((pt, idx) => (
                  <g key={idx} className="group/dot cursor-pointer">
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="4" 
                      fill={isPositiveGrowth ? "#10B981" : "#EF4444"} 
                      className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
                    />
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="8" 
                      fill="transparent"
                    />
                    {/* Tooltip render */}
                    <g className="opacity-0 group-hover/dot:opacity-100 pointer-events-none transition-opacity">
                      <rect 
                        x={pt.x - 45} 
                        y={pt.y - 25} 
                        width="90" 
                        height="18" 
                        rx="4" 
                        fill="#1E293B" 
                      />
                      <text 
                        x={pt.x} 
                        y={pt.y - 13} 
                        textAnchor="middle" 
                        className="font-mono text-[8px] font-extrabold fill-white"
                      >
                        ₹{pt.value.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                      </text>
                    </g>
                  </g>
                ))}

                {/* Gradient Definitions */}
                <defs>
                  <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0"/>
                  </linearGradient>
                  <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold uppercase px-8 pt-2">
                <span>Start Period</span>
                <span>Current Trading session (2026-06-06)</span>
              </div>
            </div>

            {/* General stock key-value parameters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Market Cap (Size)</p>
                <p className="text-md font-black text-slate-800 mt-1">{selectedStock.marketCap}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Aggregate Vol</p>
                <p className="text-md font-black text-slate-800 mt-1">{selectedStock.volume}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">24h Peak Price</p>
                <p className="text-md font-black text-slate-800 mt-1">₹{selectedStock.high24h.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">24h Low Floor</p>
                <p className="text-md font-black text-red-500 mt-1">₹{selectedStock.low24h.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Curated Stock-Specific News board */}
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-[#1E3A8A] tracking-wider border-b border-slate-100 pb-4 flex justify-between items-center">
              <span>Financial News on {selectedStock.symbol}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verified Sources</span>
            </h3>

            <div className="space-y-6">
              {selectedStock.news.map((n, idx) => (
                <div key={idx} className="group space-y-2 border-b border-slate-50 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{n.source}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{n.time}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 group-hover:text-[#1E3A8A] transition-colors leading-snug cursor-pointer">
                    {n.title}
                  </h4>
                  <p className="text-xs text-slate-450 leading-relaxed text-slate-500 font-medium">{n.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* INVESTMENT DEALS: Latest IPOs & Mutual Fund NFOs */}
      <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto items-start">
        
        {/* IPO ANALYSIS BLOCK */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-md font-black uppercase text-[#1E3A8A] tracking-wider">
                Latest IPO Offerings
              </h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Primary Market Valuations & GMP listings</p>
            </div>
            <span className="text-lg">📢</span>
          </div>

          <div className="space-y-3">
            {LATEST_IPOS.map((ipo) => (
              <div 
                key={ipo.name}
                id={`ipo-row-${ipo.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setSelectedIpo(ipo)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                  selectedIpo?.name === ipo.name 
                    ? 'border-[#1E3A8A] bg-blue-50/40 shadow-sm' 
                    : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{ipo.name}</h4>
                    <p className="text-[8px] text-slate-400 font-black uppercase mt-1">Est. {ipo.founded} | {ipo.yearsInBusiness} Yrs in Business</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                      ipo.gmpPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      GMP: {ipo.gmp} ({ipo.gmpPercent}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expanded Selected IPO Pane details */}
          {selectedIpo ? (
            <div id="selected-ipo-details" className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h4 className="text-xs font-black uppercase text-[#1E3A8A] tracking-wider">
                  {selectedIpo.name} Analysis
                </h4>
                <button 
                  onClick={() => setSelectedIpo(null)}
                  className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase cursor-pointer"
                >
                  Dismiss ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Issue Base Price</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{selectedIpo.issuePrice}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Grey Market Premium (GMP)</p>
                  <p className={`text-xs font-black mt-0.5 ${selectedIpo.gmpPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {selectedIpo.gmp} ({selectedIpo.gmpPercent}% premium)
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">IPO size value</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{selectedIpo.size}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Lot allocation size</p>
                  <p className="text-xs font-black text-[#1E3A8A] mt-0.5">{selectedIpo.lotSize}</p>
                </div>
              </div>

              <div className="h-px bg-slate-200"></div>

              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Company background & Business model</p>
                <p className="text-xs font-medium text-slate-600 leading-relaxed text-justify">{selectedIpo.businessInfo}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                <span>Business History tenure:</span>
                <span className="text-slate-800">{selectedIpo.yearsInBusiness} Years since {selectedIpo.founded}</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-405">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Select an IPO above to inspect comprehensive business history, lot sizes and GMP estimations</p>
            </div>
          )}
        </div>

        {/* MUTUAL FUND NFO RELEASES */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-md font-black uppercase text-[#1E3A8A] tracking-wider">
                New Fund Offers (NFOs)
              </h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Recent mutual fund launches open for subscription</p>
            </div>
            <span className="text-lg">📉</span>
          </div>

          <div className="space-y-4">
            {LATEST_NFOS.map((nfo) => (
              <div 
                key={nfo.name} 
                id={`nfo-block-${nfo.name.replace(/\s+/g, '-').toLowerCase()}`}
                className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 p-5 rounded-2xl transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{nfo.name}</h4>
                    <span className="text-[8px] font-bold text-blue-600 bg-blue-100 rounded uppercase tracking-wider mt-1 px-1.5 py-0.5 inline-block">{nfo.category}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase">Subscription Period</p>
                    <p className="text-[9px] font-black text-[#1E3A8A] mt-0.5">{nfo.openDate} - {nfo.closeDate}</p>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-500 leading-relaxed text-justify">{nfo.objective}</p>

                <div className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-slate-200">
                  <span className="text-[8px] font-black uppercase text-slate-400">Min subscription layout:</span>
                  <span className="text-[10px] font-black text-emerald-600">{nfo.minInvestment}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketFinance;
