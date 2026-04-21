import React from 'react';
import { filterConfig } from '../../constants/filterConfig';
import { Filter } from 'lucide-react';

export default function SidebarFilters({
  activeCat, minPrice, setMinPrice, maxPrice, setMaxPrice,
  conditionFilter = [], setConditionFilter, dynamicFilters = {}, setDynamicFilters, t, lang
}) {
  
  const handleConditionToggle = (val) => {
    setConditionFilter(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
  };

  const handleDynamicToggle = (key, val) => {
    setDynamicFilters(prev => {
      const current = prev[key] || [];
      return { ...prev, [key]: current.includes(val) ? current.filter(c => c !== val) : [...current, val] };
    });
  };

  const handleDynamicChange = (key, val) => {
    setDynamicFilters(prev => ({ ...prev, [key]: val }));
  };

  const clearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    setConditionFilter([]);
    setDynamicFilters({});
  };

  const config = activeCat ? filterConfig[activeCat] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-[90px]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
        <h3 className="font-bold flex items-center gap-2"><Filter size={18} /> Filtros</h3>
        <button onClick={clearAll} className="text-[12px] text-slate-500 hover:text-[#84CC16] font-medium transition-colors">Limpiar</button>
      </div>

      {/* Глобальный фильтр: Цена (Доступен во всех категориях) */}
      <div className="mb-6">
        <h4 className="text-[14px] font-semibold mb-3 text-slate-900">Precio (MXN)</h4>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none focus:border-[#84CC16] focus:bg-white transition-colors" />
          <span className="text-slate-400">-</span>
          <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] outline-none focus:border-[#84CC16] focus:bg-white transition-colors" />
        </div>
      </div>

      {/* Глобальный фильтр: Состояние товара */}
      <div className="mb-6 border-b border-slate-100 pb-6">
        <h4 className="text-[14px] font-semibold mb-3 text-slate-900">Condición</h4>
        <div className="space-y-2.5">
          {['nuevo', 'usado'].map(cond => (
            <label key={cond} className="flex items-center gap-3 text-[13px] text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
              <input type="checkbox" checked={conditionFilter.includes(cond)} onChange={() => handleConditionToggle(cond)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
              <span className="capitalize">{cond}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Динамические фильтры EAV JSON (Зависят от выбранной категории) */}
      {config && config.map(field => (
        <div key={field.id} className="mb-6">
          <h4 className="text-[14px] font-semibold mb-3 text-slate-900">{field.label}</h4>
          
          {field.type === 'checkbox' && (
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
              {field.options.map(opt => (
                <label key={opt} className="flex items-center gap-3 text-[13px] text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                  <input type="checkbox" checked={(dynamicFilters[field.id] || []).includes(opt)} onChange={() => handleDynamicToggle(field.id, opt)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}
          
          {field.type === 'select' && (
            <div className="relative">
              <select value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 outline-none focus:border-[#84CC16] focus:bg-white transition-colors cursor-pointer appearance-none">
                <option value="">Cualquiera</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}