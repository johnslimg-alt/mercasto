import React, { useState, useEffect } from 'react';
import { filterConfig } from '../../constants/filterConfig';
import { canonicalizeFilterOptionSelection, filterOptionDisplayLabel, filterOptionValue } from '../../utils/filterOptionTranslations';
import { getGlobalFilterDefinitions } from '../../constants/globalFilterOptions';
import { MEXICO_STATES, MEXICO_STATES_CITIES } from '../../utils/mexicoStates';
import { ChevronDown, Filter, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function FilterAccordion({ title, children, defaultOpen = false, selectedCount = 0, testId = '' }) {
  const [open, setOpen] = useState(defaultOpen || selectedCount > 0);
  useEffect(() => {
    if (selectedCount > 0) setOpen(true);
  }, [selectedCount]);
  return (
    <section data-testid={testId || undefined} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="flex h-12 w-full items-center gap-2 px-3 text-left text-[12px] font-bold text-slate-800 transition-colors hover:bg-slate-50 xl:h-10 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {selectedCount > 0 && <span className="rounded-full bg-[#84CC16]/15 px-2 py-0.5 text-[10px] font-black text-[#4D7C0F] dark:text-[#BEF264]">{selectedCount}</span>}
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-2.5 border-t border-slate-100 px-3 py-3 dark:border-slate-800">{children}</div>}
    </section>
  );
}

export default function SidebarFilters({
  activeCat, minPrice, setMinPrice, maxPrice, setMaxPrice,
  conditionFilter = [], setConditionFilter, dynamicFilters = {}, setDynamicFilters, t, lang
}) {
  const [apiConfig, setApiConfig] = useState(null);
  const selectedState = typeof dynamicFilters.location_state === 'string' ? dynamicFilters.location_state : '';
  const selectedCity = typeof dynamicFilters.location_city === 'string' ? dynamicFilters.location_city : '';
  const [isCompact, setIsCompact] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1280 : false);

  useEffect(() => {
    const handleResize = () => setIsCompact(window.innerWidth < 1280);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch category attributes from DB; fallback to hardcoded filterConfig
  useEffect(() => {
    if (!activeCat) { setApiConfig(null); return; }
    let cancelled = false;
    setApiConfig(null);
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(activeCat)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (cancelled) return;
        const nextConfig = Array.isArray(data) && data.length > 0 ? data : null;
        setApiConfig(nextConfig);
        if (!nextConfig) return;
        setDynamicFilters(prev => {
          let changed = false;
          const next = { ...prev };
          nextConfig.forEach(field => {
            const key = field.id || field.key;
            if (!key || !Array.isArray(field.options) || !Object.prototype.hasOwnProperty.call(prev, key)) return;
            const normalized = canonicalizeFilterOptionSelection(field.options, prev[key]);
            if (JSON.stringify(normalized) !== JSON.stringify(prev[key])) {
              next[key] = normalized;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      })
      .catch(() => { if (!cancelled) setApiConfig(null); });
    return () => { cancelled = true; };
  }, [activeCat, setDynamicFilters]);

  // API data takes priority; fallback to static filterConfig
  const config = apiConfig ?? (activeCat ? (filterConfig[activeCat] || null) : null);

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

  const categoryFields = Array.isArray(config)
    ? config.filter((field) => !['condition', 'location_state', 'location_city'].includes(field.id || field.key))
    : [];
  const activeCount = [minPrice, maxPrice, selectedState, selectedCity].filter(Boolean).length
    + conditionFilter.filter(Boolean).length
    + Object.values(dynamicFilters || {}).reduce((total, value) => {
      if (Array.isArray(value)) return total + value.filter(Boolean).length;
      if (value && typeof value === 'object') return total + Object.values(value).filter(Boolean).length;
      return total + (value ? 1 : 0);
    }, 0);


  const panelClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-sm dark:shadow-none';
  const inputClass = 'h-12 w-full px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#84CC16] focus:bg-white xl:h-10 dark:focus:bg-slate-900 transition-colors';
  const selectClass = 'h-12 w-full pl-3 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] text-slate-700 dark:text-slate-100 outline-none focus:border-[#84CC16] focus:bg-white xl:h-10 dark:focus:bg-slate-900 transition-colors cursor-pointer';
  const labelClass = 'flex min-h-12 items-center gap-2.5 text-[12px] text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 xl:min-h-0 dark:hover:text-white transition-colors';

  // Get available cities for selected state
  const availableCities = selectedState && MEXICO_STATES_CITIES[selectedState]
    ? MEXICO_STATES_CITIES[selectedState]
    : [];

  return (
    <div className={panelClass} data-testid="sidebar-filters">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#84CC16]/15 text-[#65A30D] dark:text-[#BEF264]"><Filter size={15} /></span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-black text-slate-950 dark:text-white">{tr('filter')}</h3>
            {activeCount > 0 && <p className="text-[10px] font-bold text-slate-400">{activeCount} {tr('filters') || tr('filter')}</p>}
          </div>
        </div>
        <button type="button" data-testid="sidebar-clear-filters" onClick={clearAll} className="h-12 shrink-0 rounded-lg px-3 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#65A30D] xl:h-8 xl:px-2.5 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-[#BEF264]">
          {tr('clear_filters')}
        </button>
      </div>

      <div className="space-y-2">
        <FilterAccordion title={tr('location')} defaultOpen selectedCount={[selectedState, selectedCity].filter(Boolean).length} testId="sidebar-group-location">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400"><MapPin size={13} className="text-[#84CC16]" /> {tr('location')}</div>
          <select aria-label={tr('state_label') || 'State'} data-testid="sidebar-filter-state" value={selectedState} onChange={e => handleStateChange(e.target.value)} className={selectClass}>
            <option value="">{tr('all_mexico')}</option>
            {MEXICO_STATES.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
          <select aria-label={tr('city_label') || 'City'} data-testid="sidebar-filter-city" value={selectedCity} onChange={e => handleCityChange(e.target.value)} disabled={!selectedState} className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}>
            <option value="">{selectedState ? tr('all_cities') : tr('select_state_first')}</option>
            {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </FilterAccordion>

        <FilterAccordion title={tr('price_mxn')} defaultOpen selectedCount={[minPrice, maxPrice].filter(Boolean).length} testId="sidebar-group-price">
          <div className="grid grid-cols-2 gap-2">
            <input aria-label={`${tr('price_mxn') || 'Price'} ${tr('min') || 'minimum'}`} data-testid="sidebar-filter-min-price" type="number" placeholder={tr('min')} value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inputClass} />
            <input aria-label={`${tr('price_mxn') || 'Price'} ${tr('max') || 'maximum'}`} data-testid="sidebar-filter-max-price" type="number" placeholder={tr('max')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inputClass} />
          </div>
        </FilterAccordion>

        <FilterAccordion title={tr('condition')} selectedCount={conditionFilter.length} testId="sidebar-group-condition">
          {isCompact ? (
            <select aria-label={tr('condition') || 'Condition'} data-testid="sidebar-filter-condition" value={conditionFilter[0] || ''} onChange={e => setConditionFilter(e.target.value ? [e.target.value] : [])} className={`${selectClass} appearance-none`}>
              <option value="">{tr('any')}</option>
              {['nuevo', 'usado', 'reacondicionado', 'para_piezas'].map(cond => <option key={cond} value={cond}>{conditionLabels[cond] || cond}</option>)}
            </select>
          ) : (
            <div className="space-y-2">
              {['nuevo', 'usado', 'reacondicionado', 'para_piezas'].map(cond => (
                <label key={cond} className={labelClass}>
                  <input data-testid={`sidebar-filter-condition-${cond}`} type="checkbox" checked={conditionFilter.includes(cond)} onChange={() => setConditionFilter(prev => prev.includes(cond) ? prev.filter(value => value !== cond) : [...prev, cond])} className="h-5 w-5 shrink-0 rounded accent-[#84CC16] xl:h-4 xl:w-4" />
                  <span>{conditionLabels[cond] || cond}</span>
                </label>
              ))}
            </div>
          )}
        </FilterAccordion>

        {globalFilters.map(field => {
          const raw = dynamicFilters[field.id];
          const selectedCount = Array.isArray(raw) ? raw.filter(Boolean).length : (raw ? 1 : 0);
          return (
            <FilterAccordion key={field.id} title={field.label} defaultOpen={['listing_type', 'sort'].includes(field.id)} selectedCount={selectedCount} testId={`sidebar-group-${field.id}`}>
              {field.type === 'select' || isCompact ? (
                <select aria-label={field.label} data-testid={`sidebar-filter-${field.id}`} value={Array.isArray(raw) ? (raw[0] || '') : (raw || '')} onChange={e => handleDynamicChange(field.id, field.type === 'select' ? e.target.value : (e.target.value ? [e.target.value] : []))} className={selectClass}>
                  <option value="">{tr('any')}</option>
                  {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : (
                <div className="max-h-[168px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
                  {field.options.map(opt => (
                    <label key={opt.value} className={labelClass}>
                      <input data-testid={`sidebar-filter-${field.id}-${opt.value}`} type="checkbox" checked={(Array.isArray(raw) ? raw : []).includes(opt.value)} onChange={() => handleDynamicToggle(field.id, opt.value)} className="h-5 w-5 shrink-0 rounded accent-[#84CC16] xl:h-4 xl:w-4" />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </FilterAccordion>
          );
        })}

        {categoryFields.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <div className="px-1 pb-0.5 pt-1 text-[10px] font-black uppercase tracking-wider text-[#65A30D] dark:text-[#BEF264]">{tr('category_filters')}</div>
            {categoryFields.map(field => {
              const fieldId = field.id || field.key;
              const fieldLabel = tr(`filter_label_${fieldId}`) || field.label || fieldId;
              const raw = dynamicFilters[fieldId];
              const selectedCount = Array.isArray(raw)
                ? raw.filter(Boolean).length
                : (raw && typeof raw === 'object' ? Object.values(raw).filter(Boolean).length : (raw ? 1 : 0));
              return (
                <FilterAccordion key={fieldId} title={fieldLabel} selectedCount={selectedCount} testId={`sidebar-category-group-${fieldId}`}>
                  {field.type === 'checkbox' && Array.isArray(field.options) && (
                    isCompact ? (
                      <select aria-label={fieldLabel} data-testid={`sidebar-category-filter-${fieldId}`} value={Array.isArray(raw) ? (raw[0] || '') : ''} onChange={e => handleDynamicChange(fieldId, e.target.value ? [e.target.value] : [])} className={`${selectClass} appearance-none`}>
                        <option value="">{tr('any')}</option>
                        {field.options.map(opt => { const value = filterOptionValue(opt); return <option key={value} value={value}>{filterOptionDisplayLabel(fieldId, opt, lang)}</option>; })}
                      </select>
                    ) : (
                      <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
                        {field.options.map(opt => {
                          const value = filterOptionValue(opt);
                          return (
                            <label key={value} className={labelClass}>
                              <input data-testid={`sidebar-category-filter-${fieldId}-${value}`} type="checkbox" checked={(Array.isArray(raw) ? raw : []).includes(value)} onChange={() => handleDynamicToggle(fieldId, value)} className="h-5 w-5 shrink-0 rounded accent-[#84CC16] xl:h-4 xl:w-4" />
                              <span>{filterOptionDisplayLabel(fieldId, opt, lang)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  )}
                  {field.type === 'select' && Array.isArray(field.options) && (
                    <select aria-label={fieldLabel} data-testid={`sidebar-category-filter-${fieldId}`} value={raw || ''} onChange={e => handleDynamicChange(fieldId, e.target.value)} className={`${selectClass} appearance-none`}>
                      <option value="">{tr('any')}</option>
                      {field.options.map(opt => { const value = filterOptionValue(opt); return <option key={value} value={value}>{filterOptionDisplayLabel(fieldId, opt, lang)}</option>; })}
                    </select>
                  )}
                  {field.type === 'text' && (
                    <input aria-label={fieldLabel} data-testid={`sidebar-category-filter-${fieldId}`} type="text" value={raw || ''} onChange={e => handleDynamicChange(fieldId, e.target.value)} placeholder={field.placeholder || ''} className={inputClass} />
                  )}
                  {field.type === 'range' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input aria-label={`${fieldLabel} ${field.minPlaceholder || tr('from')}`} data-testid={`sidebar-category-filter-${fieldId}-min`} type="number" placeholder={field.minPlaceholder || tr('from')} value={(raw || {}).min || ''} onChange={e => handleDynamicChange(fieldId, { ...(raw || {}), min: e.target.value })} className={inputClass} />
                      <input aria-label={`${fieldLabel} ${field.maxPlaceholder || tr('to')}`} data-testid={`sidebar-category-filter-${fieldId}-max`} type="number" placeholder={field.maxPlaceholder || tr('to')} value={(raw || {}).max || ''} onChange={e => handleDynamicChange(fieldId, { ...(raw || {}), max: e.target.value })} className={inputClass} />
                    </div>
                  )}
                </FilterAccordion>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

}
