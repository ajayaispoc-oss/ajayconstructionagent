
import React, { useState } from 'react';

interface TaxService {
  id: string;
  name: string;
  icon: string;
  url: string;
  description: string;
}

const TAX_SERVICES: TaxService[] = [
  {
    id: 'ghmc',
    name: 'GHMC Property Tax',
    icon: '🏠',
    url: 'https://onlinepayments.ghmc.gov.in/',
    description: 'Greater Hyderabad Municipal Corporation property tax payment portal.'
  },
  {
    id: 'hmwssb',
    name: 'HMWSSB Water Tax',
    icon: '💧',
    url: 'https://www.hyderabadwater.gov.in/en/index.php/services/customers-services/pay-your-bill-online1',
    description: 'Hyderabad Metropolitan Water Supply and Sewerage Board bill payment.'
  },
  {
    id: 'tsspdcl',
    name: 'TSSPDCL Electricity Bill',
    icon: '⚡',
    url: 'https://www.billdesk.com/pgidsk/pgmerc/tsspdclpgi/TSSPDCLPGIDetails.jsp',
    description: 'Southern Power Distribution Company of Telangana electricity bill payment.'
  }
];

interface TaxPaymentDashboardProps {
  displayName: string;
}

const TaxPaymentDashboard: React.FC<TaxPaymentDashboardProps> = ({ displayName }) => {
  const [selectedService, setSelectedService] = useState<TaxService | null>(null);

  const handlePayNow = (service: TaxService) => {
    setSelectedService(service);
  };

  const confirmRedirect = () => {
    if (selectedService) {
      window.open(selectedService.url, '_blank', 'noopener,noreferrer');
      setSelectedService(null);
    }
  };

  return (
    <div className="animate-in">
      <div className="mb-12 text-center space-y-3">
        <span className="px-4 py-1.5 rounded-full bg-blue-50 text-[#1E3A8A] border border-blue-100 text-[10px] font-black uppercase tracking-widest">
          Secure Tax Payments for {displayName}
        </span>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Tax & Utility Payments</h2>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider leading-relaxed">
          {displayName}, you can pay your municipal water tax, property bills, property tax, and TSSPDCL electricity bills securely through direct portals here.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
        {TAX_SERVICES.map((service) => (
          <div 
            key={service.id} 
            className="p-10 bg-white rounded-[3.5rem] border hover:border-[#1E3A8A] transition-all shadow-sm group relative overflow-hidden flex flex-col h-full"
          >
            <div className="text-5xl mb-6 bg-slate-50 w-20 h-20 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-50 transition-colors">
              {service.icon}
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-2 group-hover:text-[#1E3A8A] transition-colors">
              {service.name}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed opacity-60 mb-8 flex-grow">
              {service.description}
            </p>
            <button 
              onClick={() => handlePayNow(service)}
              className="w-full py-4 rounded-[1.5rem] bg-[#1E3A8A] text-white text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
            >
              Pay Now
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-md w-full p-10 shadow-2xl animate-in relative border border-slate-100">
            <div className="text-center mb-8">
              <div className="bg-blue-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6">
                🚀
              </div>
              <h2 className="text-2xl font-black text-[#1E3A8A] uppercase tracking-tighter mb-4">Leaving App</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                You are being redirected to the official <span className="text-[#1E3A8A]">{selectedService.name}</span> portal. 
                Please ensure you are on the correct government website before making any payments.
              </p>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={confirmRedirect}
                className="w-full bg-[#1E3A8A] text-white py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl hover:bg-blue-800 transition-colors"
              >
                Proceed to Payment
              </button>
              <button 
                onClick={() => setSelectedService(null)}
                className="w-full bg-slate-50 text-slate-400 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
            
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-6">
              Secure Redirect • Ajay Projects Fintech UX
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxPaymentDashboard;
