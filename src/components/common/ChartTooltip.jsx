import React from 'react';

const ChartTooltip = ({ active, payload, label, unit, isDarkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`text-center px-4 py-3 rounded-2xl shadow-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
        <div className="text-[14px] font-black">{payload[0].value} {unit}</div>
      </div>
    );
  }
  return null;
};

export default ChartTooltip;