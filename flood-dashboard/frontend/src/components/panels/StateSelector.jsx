import { useState, useMemo } from 'react';
import useFloodStore from '../../store/floodStore';

export default function StateSelector() {
  const { states, selectState, loading } = useFloodStore();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!states?.length) return [];
    if (!search) return states;
    return states.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  }, [states, search]);

  // Pre-computed state metadata (risk estimates from historical data)
  const stateInfo = {
    'BIHAR': { districts: 38, risk: 'HIGH' }, 'ASSAM': { districts: 35, risk: 'HIGH' },
    'WEST BENGAL': { districts: 23, risk: 'HIGH' }, 'UTTAR PRADESH': { districts: 75, risk: 'HIGH' },
    'UTTARAKHAND': { districts: 13, risk: 'MEDIUM' }, 'ODISHA': { districts: 30, risk: 'HIGH' },
    'JHARKHAND': { districts: 24, risk: 'MEDIUM' }, 'RAJASTHAN': { districts: 33, risk: 'MEDIUM' },
    'MADHYA PRADESH': { districts: 52, risk: 'MEDIUM' }, 'ANDHRA PRADESH': { districts: 13, risk: 'MEDIUM' },
    'TELANGANA': { districts: 33, risk: 'MEDIUM' }, 'MAHARASHTRA': { districts: 36, risk: 'MEDIUM' },
    'PUNJAB': { districts: 23, risk: 'MEDIUM' }, 'HARYANA': { districts: 22, risk: 'LOW' },
    'HIMACHAL PRADESH': { districts: 12, risk: 'LOW' }, 'JAMMU & KASHMIR': { districts: 22, risk: 'MEDIUM' },
    'MANIPUR': { districts: 16, risk: 'MEDIUM' }, 'NAGALAND': { districts: 16, risk: 'LOW' },
    'MEGHALAYA': { districts: 12, risk: 'MEDIUM' }, 'TRIPURA': { districts: 8, risk: 'MEDIUM' },
    'MIZORAM': { districts: 11, risk: 'LOW' }, 'ARUNACHAL PRADESH': { districts: 26, risk: 'LOW' },
    'SIKKIM': { districts: 6, risk: 'LOW' }, 'CHHATTISGARH': { districts: 33, risk: 'LOW' },
    'KERALA': { districts: 14, risk: 'HIGH' }, 'TAMIL NADU': { districts: 38, risk: 'MEDIUM' },
    'KARNATAKA': { districts: 31, risk: 'MEDIUM' }, 'GOA': { districts: 2, risk: 'LOW' },
    'DELHI': { districts: 11, risk: 'LOW' }, 'GUJARAT': { districts: 33, risk: 'HIGH' },
    'PUDUCHERRY': { districts: 4, risk: 'LOW' }, 'ANDAMAN & NICOBAR': { districts: 3, risk: 'LOW' },
    'LAKSHADWEEP': { districts: 1, risk: 'LOW' }, 'DAMAN & DIU': { districts: 2, risk: 'LOW' },
  };

  const riskBadge = {
    HIGH: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
    MEDIUM: { bg: '#fffbeb', text: '#78350f', border: '#fde68a' },
    LOW: { bg: '#f0fdf4', text: '#14532d', border: '#86efac' },
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f0f4f8] flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🌊</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gov-navy tracking-wide">
            INDIA NATIONAL DISASTER MANAGEMENT SYSTEM
          </h1>
          <p className="text-text-muted text-sm mt-2">Select a State to Begin Flood Monitoring & Analysis</p>
        </div>

        {/* Search */}
        <div className="mb-4 max-w-md mx-auto w-full">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Type to filter states..."
            className="w-full px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all shadow-sm"
            autoFocus
          />
        </div>

        {/* State Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading.states ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(state => {
                const info = stateInfo[state] || { districts: '?', risk: 'LOW' };
                const badge = riskBadge[info.risk] || riskBadge.LOW;
                return (
                  <button
                    key={state}
                    onClick={() => selectState(state)}
                    className="bg-white rounded-xl p-4 text-left border border-border hover:border-accent-primary hover:shadow-md transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="text-sm font-bold text-gov-navy group-hover:text-accent-primary transition-colors leading-tight mb-2">
                      {state}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">{info.districts} districts</span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}
                      >
                        {info.risk}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
