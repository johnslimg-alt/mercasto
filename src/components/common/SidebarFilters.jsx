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

  const globalFilters = [
    { id: 'listing_type', label: 'Tipo de anuncio', options: [
      'Venta', 'Renta', 'Renta con opción a compra', 'Traspaso', 'Gratis', 'Intercambio',
      'Compro', 'Busco', 'Ofrezco', 'Donación', 'Subasta', 'Liquidación', 'Outlet', 'Preventa'
    ] },
    { id: 'published_at', label: 'Publicado', options: [
      'Hoy', 'Ayer', 'Últimos 3 días', 'Última semana', 'Último mes', 'Últimos 3 meses'
    ] },
    { id: 'seller_type_global', label: 'Tipo de vendedor', options: [
      'Particular', 'Tienda', 'Distribuidor oficial', 'Agencia', 'Inmobiliaria',
      'Mayorista', 'Importador', 'Fabricante', 'Freelance'
    ] },
    { id: 'seller_verified', label: 'Verificación', options: [
      'Vendedor verificado', 'Teléfono verificado', 'Email verificado',
      'Identidad verificada', 'Con reseñas', 'Perfil completo', 'Miembro premium'
    ] },
    { id: 'media', label: 'Contenido', options: [
      'Con fotos', 'Con video', 'Tour virtual 360°', 'Tour / mapa', 'Con documentos', 'Con certificado'
    ] },
    { id: 'radius_km', label: 'Radio de búsqueda', type: 'select', options: [
      '1 km', '5 km', '10 km', '25 km', '50 km', '100 km', '200 km', '500 km', 'Todo México'
    ] },
    { id: 'sort', label: 'Ordenar por', type: 'select', options: [
      'Más recientes', 'Precio menor', 'Precio mayor', 'Más cercanos', 'Más populares',
      'Mejor valorados', 'Relevancia', 'Más vistos'
    ] },
    { id: 'payment_method', label: 'Pago aceptado', options: [
      'Efectivo', 'Transferencia SPEI', 'Tarjeta de crédito', 'Tarjeta de débito',
      'Pago seguro (escrow)', 'Contra entrega', 'Mercado Pago', 'PayPal',
      'Criptomonedas', 'Financiamiento propio', 'Crédito bancario'
    ] },
    { id: 'delivery', label: 'Entrega', options: [
      'Entrega local', 'Envío nacional', 'Envío express', 'Recoger en punto seguro',
      'Entrega hoy', 'Envío internacional', 'Envío gratis', 'Instalación incluida'
    ] },
    { id: 'seller_response', label: 'Respuesta del vendedor', options: [
      'Responde rápido (< 1 hora)', 'Responde hoy', 'Disponible hoy',
      'Atiende por chat', 'Atiende por email', 'Atiende por teléfono', 'Atiende por Telegram'
    ] },
    { id: 'warranty', label: 'Garantía', options: [
      'Con garantía', 'Garantía de fábrica', 'Garantía extendida',
      '30 días de garantía', '90 días de garantía', '1 año de garantía'
    ] },
    { id: 'negotiable', label: 'Precio', options: [
      'Precio fijo', 'Negociable', 'Acepto ofertas', 'Precio por cantidad', 'Descuento por volumen'
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
        <h3 className="font-bold flex items-center gap-2 text-slate-950 dark:text-white"><Filter size={18} /> Filtros</h3>
        <button onClick={clearAll} className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-[#84CC16] font-medium transition-colors">Limpiar</button>
      </div>

      {/* Фильтр по локации: Штат и Город */}
      <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <h4 className={sectionTitleClass}>
          <MapPin size={14} className="inline mr-2 text-[#84CC16]" />
          Ubicación
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <select
              value={selectedState}
              onChange={e => handleStateChange(e.target.value)}
              className={selectClass}
            >
              <option value="">Todo México</option>
              {MEXICO_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Ciudad / Municipio</label>
            <select
              value={selectedCity}
              onChange={e => handleCityChange(e.target.value)}
              disabled={!selectedState}
              className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">{selectedState ? 'Todas las ciudades' : 'Selecciona un estado'}</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Глобальный фильтр: Цена */}
      <div className="mb-6">
        <h4 className={sectionTitleClass}>Precio (MXN)</h4>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className={inputClass} />
          <span className="text-slate-400">-</span>
          <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Глобальный фильтр: Состояние товара */}
      <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-6">
        <h4 className={sectionTitleClass}>Condición</h4>
        <div className="space-y-2.5">
          {['nuevo', 'usado', 'reacondicionado', 'para_piezas'].map(cond => (
            <label key={cond} className={labelClass}>
              <input type="checkbox" checked={conditionFilter.includes(cond)} onChange={() => handleConditionToggle(cond)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
              <span className="capitalize">{cond.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      {globalFilters.map(field => (
        <div key={field.id} className="mb-6">
          <h4 className={sectionTitleClass}>{field.label}</h4>
          {field.type === 'select' ? (
            <select value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} className={selectClass}>
              <option value="">Cualquiera</option>
              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <div className="space-y-2.5 max-h-[190px] overflow-y-auto no-scrollbar">
              {field.options.map(opt => (
                <label key={opt} className={labelClass}>
                  <input type="checkbox" checked={(dynamicFilters[field.id] || []).includes(opt)} onChange={() => handleDynamicToggle(field.id, opt)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Динамические фильтры (из API или статического конфига) - зависят от категории */}
      {config && config.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <h4 className="text-[13px] font-bold text-[#84CC16] mb-4 uppercase tracking-wide">
            Filtros específicos de categoría
          </h4>
          {config.map(field => (
            <div key={field.id} className="mb-6">
              <h4 className={sectionTitleClass}>{field.label}</h4>

              {field.type === 'checkbox' && Array.isArray(field.options) && (
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto no-scrollbar">
                  {field.options.map(opt => (
                    <label key={opt} className={labelClass}>
                      <input type="checkbox" checked={(dynamicFilters[field.id] || []).includes(opt)} onChange={() => handleDynamicToggle(field.id, opt)} className="w-4 h-4 rounded text-[#84CC16] focus:ring-[#84CC16] accent-[#84CC16] border-slate-300" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {field.type === 'select' && Array.isArray(field.options) && (
                <div className="relative">
                  <select value={dynamicFilters[field.id] || ''} onChange={e => handleDynamicChange(field.id, e.target.value)} className={`${selectClass} appearance-none`}>
                    <option value="">Cualquiera</option>
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
                  <input type="number" placeholder={field.minPlaceholder || 'Min'} value={(dynamicFilters[field.id] || {}).min || ''} onChange={e => handleDynamicChange(field.id, { ...(dynamicFilters[field.id] || {}), min: e.target.value })} className={inputClass} />
                  <span className="text-slate-400">-</span>
                  <input type="number" placeholder={field.maxPlaceholder || 'Max'} value={(dynamicFilters[field.id] || {}).max || ''} onChange={e => handleDynamicChange(field.id, { ...(dynamicFilters[field.id] || {}), max: e.target.value })} className={inputClass} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
