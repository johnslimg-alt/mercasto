import React, { useState, useEffect } from 'react';
import { filterConfig } from '../../constants/filterConfig';
import { MEXICO_STATES, MEXICO_STATES_CITIES } from '../../utils/mexicoStates';
import { Filter, MapPin } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export default function SidebarFilters({
  activeCat, minPrice, setMinPrice, maxPrice, setMaxPrice,
  conditionFilter = [], setConditionFilter, dynamicFilters = {}, setDynamicFilters, t, lang
}) {
  const [apiConfig, setApiConfig] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
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
    setSelectedState(state);
    setSelectedCity('');
    setDynamicFilters(prev => ({ ...prev, location_state: state, location_city: '' }));
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setDynamicFilters(prev => ({ ...prev, location_city: city }));
  };

  const clearAll = () => {
    setMinPrice('');
    setMaxPrice('');
    setConditionFilter([]);
    setDynamicFilters({});
    setSelectedState('');
    setSelectedCity('');
  };

  // i18n helpers
  const tr = (key, fallback) => (t && t[key]) ? t[key] : fallback;

  // Condition labels
  const conditionLabels = {
    nuevo:          tr('cond_new',           'Nuevo'),
    usado:          tr('cond_used',          'Usado'),
    reacondicionado: tr('cond_refurb',       'Reacondicionado'),
    para_piezas:    tr('cond_parts',         'Para piezas'),
  };

  const globalFilters = [
    { id: 'listing_type', label: tr('filter_global_listing_type', 'Tipo de anuncio'), options: [
      tr('gf_venta','Venta'), tr('gf_renta','Renta'), tr('gf_renta_opcion','Renta con opción a compra'),
      tr('gf_traspaso','Traspaso'), tr('gf_gratis','Gratis'), tr('gf_intercambio','Intercambio'),
      tr('gf_compro','Compro'), tr('gf_busco','Busco'), tr('gf_ofrezco','Ofrezco'),
      tr('gf_donacion','Donación'), tr('gf_subasta','Subasta'), tr('gf_liquidacion','Liquidación'),
      tr('gf_outlet','Outlet'), tr('gf_preventa','Preventa'),
    ] },
    { id: 'published_at', label: tr('filter_global_published', 'Publicado'), options: [
      tr('gf_hoy','Hoy'), tr('gf_ayer','Ayer'), tr('gf_3days','Últimos 3 días'),
      tr('gf_week','Última semana'), tr('gf_month','Último mes'), tr('gf_3months','Últimos 3 meses'),
    ] },
    { id: 'seller_type_global', label: tr('filter_global_seller_type', 'Tipo de vendedor'), options: [
      tr('gf_particular','Particular'), tr('gf_tienda','Tienda'), tr('gf_distribuidor','Distribuidor oficial'),
      tr('gf_agencia','Agencia'), tr('gf_inmobiliaria','Inmobiliaria'),
      tr('gf_mayorista','Mayorista'), tr('gf_importador','Importador'),
      tr('gf_fabricante','Fabricante'), tr('gf_freelance','Freelance'),
    ] },
    { id: 'seller_verified', label: tr('filter_global_verification', 'Verificación'), options: [
      tr('gf_verified_seller','Vendedor verificado'), tr('gf_verified_phone','Teléfono verificado'),
      tr('gf_verified_email','Email verificado'), tr('gf_verified_id','Identidad verificada'),
      tr('gf_with_reviews','Con reseñas'), tr('gf_full_profile','Perfil completo'),
      tr('gf_premium','Miembro premium'),
    ] },
    { id: 'media', label: tr('filter_global_content', 'Contenido'), options: [
      tr('gf_with_photos','Con fotos'), tr('gf_with_video','Con video'),
      tr('gf_virtual_tour','Tour virtual 360°'), tr('gf_with_map','Tour / mapa'),
      tr('gf_with_docs','Con documentos'), tr('gf_with_cert','Con certificado'),
    ] },
    { id: 'radius_km', label: tr('filter_global_radius', 'Radio de búsqueda'), type: 'select', options: [
      '1 km', '5 km', '10 km', '25 km', '50 km', '100 km', '200 km', '500 km', tr('all_mexico', 'Todo México'),
    ] },
    { id: 'sort', label: tr('filter_global_sort', 'Ordenar por'), type: 'select', options: [
      tr('sort_newest','Más recientes'), tr('sort_price_asc','Precio menor'),
      tr('sort_price_desc','Precio mayor'), tr('sort_nearest','Más cercanos'),
      tr('sort_popular','Más populares'), tr('sort_top_rated','Mejor valorados'),
      tr('sort_relevance','Relevancia'), tr('sort_most_viewed','Más vistos'),
    ] },
    { id: 'payment_method', label: tr('filter_global_payment', 'Pago aceptado'), options: [
      tr('gf_cash','Efectivo'), tr('gf_spei','Transferencia SPEI'),
      tr('gf_credit_card','Tarjeta de crédito'), tr('gf_debit_card','Tarjeta de débito'),
      tr('gf_escrow','Pago seguro (escrow)'), tr('gf_cod','Contra entrega'),
      'PayPal', tr('gf_crypto','Criptomonedas'),
      tr('gf_own_financing','Financiamiento propio'), tr('gf_bank_credit','Crédito bancario'),
    ] },
    { id: 'seller_response', label: tr('filter_global_response', 'Respuesta del vendedor'), options: [
      tr('gf_fast_response','Responde rápido (< 1 hora)'), tr('gf_replies_today','Responde hoy'),
      tr('gf_available_today','Disponible hoy'), tr('gf_by_chat','Atiende por chat'),
      tr('gf_by_email','Atiende por email'), tr('gf_by_phone','Atiende por teléfono'),
      tr('gf_by_telegram','Atiende por Telegram'),
    ] },
    { id: 'warranty', label: tr('filter_global_warranty', 'Garantía'), options: [
      tr('gf_with_warranty','Con garantía'), tr('gf_factory_warranty','Garantía de fábrica'),
      tr('gf_extended_warranty','Garantía extendida'),
      tr('gf_warranty_30','30 días de garantía'), tr('gf_warranty_90','90 días de garantía'),
      tr('gf_warranty_1y','1 año de garantía'),
    ] },
    { id: 'negotiable', label: tr('filter_global_price_type', 'Precio'), options: [
      tr('gf_fixed_price','Precio fijo'), tr('gf_negotiable','Negociable'),
      tr('gf_accept_offers','Acepto ofertas'), tr('gf_bulk_price','Precio por cantidad'),
      tr('gf_volume_discount','Descuento por volumen'),
    ] },
  ];

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
          <Filter size={18} /> {tr('filter', 'Filtros')}
        </h3>
        <button onClick={clearAll} className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-[#84CC16] font-medium transition-colors">
          {tr('clear_filters', 'Limpiar')}
        </button>
      </div>

      {/* Фильтр по локации: Штат и Город */}
      <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <h4 className={sectionTitleClass}>
          <MapPin size={14} className="inline mr-2 text-[#84CC16]" />
          {tr('location', 'Ubicación')}
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              {tr('state_label', 'Estado')}
            </label>
            <select
              value={selectedState}
              onChange={e => handleStateChange(e.target.value)}
              className={selectClass}
            >
              <option value="">{tr('all_mexico', 'Todo México')}</option>
              {MEXICO_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              {tr('city_label', 'Ciudad / Municipio')}
            </label>
            <select
              value={selectedCity}
              onChange={e => handleCityChange(e.target.value)}
              disabled={!selectedState}
              className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">{selectedState ? tr('all_cities', 'Todas las ciudades') : tr('select_state_first', 'Selecciona un estado')}</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Глобальный фильтр: Цена */}
      <div className="mb-6">
        <h4 className={sectionTitleClass}>{tr('price_mxn', 'Precio (MXN)')}</h4>
        <div className="flex items-center gap-2">
          <input type="number" placeholder={tr('min', 'Min')} value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inputClass} />
          <span className="text-slate-400">-</span>
          <input type="number" placeholder={tr('max', 'Max')} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Глобальный фильтр: Состояние товара */}
      <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <h4 className={sectionTitleClass}>{tr('condition', 'Condición')}</h4>
        {isMobile ? (
          <div className="relative">
            <select
              value={conditionFilter[0] || ''}
              onChange={e => {
                const val = e.target.value;
                setConditionFilter(val ? [val] : []);
              }}
              className={`${selectClass} appearance-none`}
            >
              <option value="">{tr('any', 'Cualquiera')}</option>
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
                <input type="checkbox" checked={conditionFilter.includes(cond)} onChange={() => handleConditionToggle(cond)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
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
            <select value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} className={selectClass}>
              <option value="">{tr('any', 'Cualquiera')}</option>
              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            isMobile ? (
              <div className="relative">
                <select
                  value={dynamicFilters[field.id]?.[0] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    handleDynamicChange(field.id, val ? [val] : []);
                  }}
                  className={`${selectClass} appearance-none`}
                >
                  <option value="">{tr('any', 'Cualquiera')}</option>
                  {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto no-scrollbar">
                {field.options.map(opt => (
                  <label key={opt} className={labelClass}>
                    <input type="checkbox" checked={(dynamicFilters[field.id] || []).includes(opt)} onChange={() => handleDynamicToggle(field.id, opt)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                    <span>{opt}</span>
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
            {tr('category_filters', 'Filtros específicos de categoría')}
          </h4>
          {config.map(field => {
            // Translate field label using filter_label_<id> key, fallback to original label
            const fieldLabel = tr(`filter_label_${field.id}`, field.label);
            const anyLabel = tr('any', 'Cualquiera');
            return (
              <div key={field.id} className="mb-6">
                <h4 className={sectionTitleClass}>{fieldLabel}</h4>

                {field.type === 'checkbox' && Array.isArray(field.options) && (
                  isMobile ? (
                    <div className="relative">
                      <select
                        value={dynamicFilters[field.id]?.[0] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          handleDynamicChange(field.id, val ? [val] : []);
                        }}
                        className={`${selectClass} appearance-none`}
                      >
                        <option value="">{anyLabel}</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                      {field.options.map(opt => (
                        <label key={opt} className={labelClass}>
                          <input type="checkbox" checked={(dynamicFilters[field.id] || []).includes(opt)} onChange={() => handleDynamicToggle(field.id, opt)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )
                )}

                {field.type === 'select' && Array.isArray(field.options) && (
                  <div className="relative">
                    <select value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} className={`${selectClass} appearance-none`}>
                      <option value="">{anyLabel}</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">▼</div>
                  </div>
                )}

                {field.type === 'text' && (
                  <input type="text" value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} placeholder={field.placeholder || ''} className={inputClass} />
                )}

                {field.type === 'range' && (
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder={field.minPlaceholder || tr('from', 'Desde')} value={(dynamicFilters[field.id] || {}).min || ''} onChange={e => handleDynamicChange(field.id, { ...(dynamicFilters[field.id] || {}), min: e.target.value })} className={inputClass} />
                    <span className="text-slate-400">-</span>
                    <input type="number" placeholder={field.maxPlaceholder || tr('to', 'Hasta')} value={(dynamicFilters[field.id] || {}).max || ''} onChange={e => handleDynamicChange(field.id, { ...(dynamicFilters[field.id] || {}), max: e.target.value })} className={inputClass} />
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
