import React, { useState, useEffect } from 'react';
import { filterConfig } from '../../constants/filterConfig';
import { filterOptionDisplayLabel, filterOptionValue } from '../../utils/filterOptionTranslations';
import { getGlobalFilterDefinitions } from '../../constants/globalFilterOptions';
import { MEXICO_STATES, MEXICO_STATES_CITIES } from '../../utils/mexicoStates';
import { Filter, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function SidebarFilters({
  activeCat, minPrice, setMinPrice, maxPrice, setMaxPrice,
  conditionFilter = [], setConditionFilter, dynamicFilters = {}, setDynamicFilters, t, lang
}) {
  const [apiConfig, setApiConfig] = useState(null);
  const selectedState = typeof dynamicFilters.location_state === 'string' ? dynamicFilters.location_state : '';
  const selectedCity = typeof dynamicFilters.location_city === 'string' ? dynamicFilters.location_city : '';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch category attributes from DB; fallback to hardcoded filterConfig
  useEffect(() => {
    if (!activeCat) { setApiConfig(null); return; }
    let cancelled = false;
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(activeCat)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setApiConfig(data.length > 0 ? data : null); })
      .catch(() => { if (!cancelled) setApiConfig(null); });
    return () => { cancelled = true; };
  }, [activeCat]);

  // API data takes priority; fallback to static filterConfig
  const config = apiConfig ?? (activeCat ? (filterConfig[activeCat] || null) : null);

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

  const handleStateChange = (state) => {
    setDynamicFilters(prev => ({ ...prev, location_state: state, location_city: '' }));
  };

  const handleCityChange = (city) => {
    setDynamicFilters(prev => ({ ...prev, location_city: city }));
  };

  const clearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    setConditionFilter([]);
    setDynamicFilters({});
  };

  // i18n helpers
  const tr = (key) => t?.[key] || '';

  // Condition labels
  const conditionLabels = {
    nuevo:          tr('cond_new'),
    usado:          tr('cond_used'),
    reacondicionado: tr('cond_refurb'),
    para_piezas:    tr('cond_parts'),
  };

  const globalFilters = getGlobalFilterDefinitions(t);


  const panelClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sticky top-[90px] shadow-sm dark:shadow-none';
  const sectionTitleClass = 'text-[14px] font-semibold mb-3 text-slate-900 dark:text-white';
  const inputClass = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#84CC16] focus:bg-white dark:focus:bg-slate-900 transition-colors';
  const selectClass = 'w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-100 outline-none focus:border-[#84CC16] focus:bg-white dark:focus:bg-slate-900 transition-colors cursor-pointer';
  const labelClass = 'flex items-center gap-3 text-[13px] text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors';

  // Get available cities for selected state
  const availableCities = selectedState && MEXICO_STATES_CITIES[selectedState]
    ? MEXICO_STATES_CITIES[selectedState]
    : [];

  return (
    <div className={panelClass}>
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <h3 className="font-bold flex items-center gap-2 text-slate-950 dark:text-white">
          <Filter size={18} /> {tr('filter')}
        </h3>
        <button type="button" data-testid="sidebar-clear-filters" onClick={clearAll} className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-[#84CC16] font-medium transition-colors">
          {tr('clear_filters')}
        </button>
      </div>

      {/* Фильтр по локации: Штат и Город */}
      <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <h4 className={sectionTitleClass}>
          <MapPin size={14} className="inline mr-2 text-[#84CC16]" />
          {tr('location')}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              {tr('state_label')}
            </label>
            <select
              aria-label={tr('state_label') || 'State'}
              data-testid="sidebar-filter-state"
              value={selectedState}
              onChange={e => handleStateChange(e.target.value)}
              className={selectClass}
            >
              <option value="">{tr('all_mexico')}</option>
              {MEXICO_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              {tr('city_label')}
            </label>
            <select
              aria-label={tr('city_label') || 'City'}
              data-testid="sidebar-filter-city"
              value={selectedCity}
              onChange={e => handleCityChange(e.target.value)}
              disabled={!selectedState}
              className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">{selectedState ? tr('all_cities') : tr('select_state_first')}</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Глобальный фильтр: Цена */}
      <div className="mb-6">
        <h4 className={sectionTitleClass}>{tr('price_mxn')}</h4>
        <div className="flex items-center gap-2">
          <input aria-label={`${tr('price_mxn') || 'Price'} ${tr('min') || 'minimum'}`} data-testid="sidebar-filter-min-price" type="number" placeholder={tr('min')} value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inputClass} />
          <span className="text-slate-400">-</span>
          <input aria-label={`${tr('price_mxn') || 'Price'} ${tr('max') || 'maximum'}`} data-testid="sidebar-filter-max-price" type="number" placeholder={tr('max')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Глобальный фильтр: Состояние товара */}
      <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <h4 className={sectionTitleClass}>{tr('condition')}</h4>
        {isMobile ? (
          <div className="relative">
            <select
              aria-label={tr('condition') || 'Condition'}
              data-testid="sidebar-filter-condition"
              value={conditionFilter[0] || ''}
              onChange={e => {
                const val = e.target.value;
                setConditionFilter(val ? [val] : []);
              }}
              className={`${selectClass} appearance-none`}
            >
              <option value="">{tr('any')}</option>
              {['nuevo', 'usado', 'reacondicionado', 'para_piezas'].map(cond => (
                <option key={cond} value={cond}>{conditionLabels[cond] || cond}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {['nuevo', 'usado', 'reacondicionado', 'para_piezas'].map(cond => (
              <label key={cond} className={labelClass}>
                <input data-testid={`sidebar-filter-condition-${cond}`} type="checkbox" checked={conditionFilter.includes(cond)} onChange={() => handleConditionToggle(cond)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                <span>{conditionLabels[cond] || cond}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {globalFilters.map(field => (
        <div key={field.id} className="mb-6">
          <h4 className={sectionTitleClass}>{field.label}</h4>
          {field.type === 'select' ? (
            <select aria-label={field.label} data-testid={`sidebar-filter-${field.id}`} value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} className={selectClass}>
              <option value="">{tr('any')}</option>
              {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            isMobile ? (
              <div className="relative">
                <select
                  aria-label={field.label}
                  data-testid={`sidebar-filter-${field.id}`}
                  value={dynamicFilters[field.id]?.[0] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    handleDynamicChange(field.id, val ? [val] : []);
                  }}
                  className={`${selectClass} appearance-none`}
                >
                  <option value="">{tr('any')}</option>
                  {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto no-scrollbar">
                {field.options.map(opt => (
                  <label key={opt.value} className={labelClass}>
                    <input data-testid={`sidebar-filter-${field.id}-${opt.value}`} type="checkbox" checked={(dynamicFilters[field.id] || []).includes(opt.value)} onChange={() => handleDynamicToggle(field.id, opt.value)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )
          )}
        </div>
      ))}

      {/* Динамические фильтры (из API или статического конфига) - зависят от категории */}
      {config && config.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <h4 className="text-[13px] font-bold text-[#84CC16] mb-4 uppercase tracking-wide">
            {tr('category_filters')}
          </h4>
          {config.map(field => {
            // Translate field label using filter_label_<id> key, fallback to original label
            const fieldId = field.id || field.key;
            const fieldLabel = tr(`filter_label_${fieldId}`, field.label || fieldId);
            const anyLabel = tr('any');
            return (
              <div key={fieldId} className="mb-6">
                <h4 className={sectionTitleClass}>{fieldLabel}</h4>

                {field.type === 'checkbox' && Array.isArray(field.options) && (
                  isMobile ? (
                    <div className="relative">
                      <select
                        aria-label={fieldLabel}
                        data-testid={`sidebar-category-filter-${fieldId}`}
                        value={dynamicFilters[fieldId]?.[0] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          handleDynamicChange(fieldId, val ? [val] : []);
                        }}
                        className={`${selectClass} appearance-none`}
                      >
                        <option value="">{anyLabel}</option>
                        {field.options.map(opt => { const value = filterOptionValue(opt); return <option key={value} value={value}>{filterOptionDisplayLabel(fieldId, opt, lang)}</option>; })}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                      {field.options.map(opt => (
                        <label key={filterOptionValue(opt)} className={labelClass}>
                          <input data-testid={`sidebar-category-filter-${fieldId}-${filterOptionValue(opt)}`} type="checkbox" checked={(dynamicFilters[fieldId] || []).includes(filterOptionValue(opt))} onChange={() => handleDynamicToggle(fieldId, filterOptionValue(opt))} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                          <span>{filterOptionDisplayLabel(fieldId, opt, lang)}</span>
                        </label>
                      ))}
                    </div>
                  )
                )}

                {field.type === 'select' && Array.isArray(field.options) && (
                  <div className="relative">
                    <select aria-label={fieldLabel} data-testid={`sidebar-category-filter-${fieldId}`} value={dynamicFilters[fieldId] || ''} onChange={e => handleDynamicChange(fieldId, e.target.value)} className={`${selectClass} appearance-none`}>
                      <option value="">{anyLabel}</option>
                      {field.options.map(opt => { const value = filterOptionValue(opt); return <option key={value} value={value}>{filterOptionDisplayLabel(fieldId, opt, lang)}</option>; })}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
                  </div>
                )}

                {field.type === 'text' && (
                  <input aria-label={fieldLabel} type="text" value={dynamicFilters[fieldId] || ''} onChange={e => handleDynamicChange(fieldId, e.target.value)} placeholder={field.placeholder || ''} className={inputClass} />
                )}

                {field.type === 'range' && (
                  <div className="flex items-center gap-2">
                    <input aria-label={`${fieldLabel} ${field.minPlaceholder || tr('from')}`} type="number" placeholder={field.minPlaceholder || tr('from')} value={(dynamicFilters[fieldId] || {}).min || ''} onChange={e => handleDynamicChange(fieldId, { ...(dynamicFilters[fieldId] || {}), min: e.target.value })} className={inputClass} />
                    <span className="text-slate-400">-</span>
                    <input aria-label={`${fieldLabel} ${field.maxPlaceholder || tr('to')}`} type="number" placeholder={field.maxPlaceholder || tr('to')} value={(dynamicFilters[fieldId] || {}).max || ''} onChange={e => handleDynamicChange(fieldId, { ...(dynamicFilters[fieldId] || {}), max: e.target.value })} className={inputClass} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
