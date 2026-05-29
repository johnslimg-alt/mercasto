import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, Loader2, X, Plus, Image, Pencil, Sparkles, Settings2 } from 'lucide-react';
import SortablePhotoGrid from '../SortablePhotoGrid';
import MEXICO_STATES from '../../utils/mexicoStates';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${STORAGE_URL}/${path}`;
};

const getImageUrls = (pathStr) => {
  if (!pathStr) return [];
  try {
    const arr = JSON.parse(pathStr);
    if (Array.isArray(arr)) return arr.map(getImageUrl);
  } catch (e) {}
  return [getImageUrl(pathStr)];
};

export default function EditAdScreen({ t, lang }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ad, setAd] = useState(null);
  const [categories, setCategories] = useState([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [toast, setToast] = useState(null);
  const [apiCategoryFields, setApiCategoryFields] = useState(null);
  const [loadingCategoryFields, setLoadingCategoryFields] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', price: '', location: '', state: '',
    category: '', condition: 'Nuevo', attributes: {}
  });

  const [images, setImages] = useState([]);

  const token = localStorage.getItem('auth_token');
  const maxPhotos = 10;

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    const fetchAll = async () => {
      try {
        const [adRes, catRes] = await Promise.all([
          fetch(`${API_URL}/ads/${id}/edit`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
          }),
          fetch(`${API_URL}/categories`, { headers: { Accept: 'application/json' } })
        ]);
        if (adRes.status === 403) { navigate('/'); return; }
        if (!adRes.ok) throw new Error(t.error_loading_ad || 'No se pudo cargar el anuncio');
        const adData = await adRes.json();
        const catData = catRes.ok ? await catRes.json() : [];
        setAd(adData);
        setCategories(Array.isArray(catData) ? catData : (catData.data || []));
        let parsedAttrs = {};
        try { parsedAttrs = typeof adData.attributes === 'string' ? JSON.parse(adData.attributes) : (adData.attributes || {}); } catch (e) {}
        const conditionMap = { 'nuevo': 'Nuevo', 'used': 'Bueno', 'usado': 'Bueno' };
        const rawCond = adData.condition || '';
        const normalizedCondition = conditionMap[rawCond.toLowerCase()] || rawCond || 'Nuevo';
        setForm({
          title: adData.title || '',
          description: adData.description || '',
          price: adData.price ?? '',
          location: adData.location || '',
          state: adData.state || '',
          category: adData.category || '',
          condition: normalizedCondition,
          attributes: parsedAttrs
        });
        setImages(getImageUrls(adData.image_url).map(url => ({
          source: 'existing', id: url, url,
          path: url.replace(`${STORAGE_URL}/`, ''), file: null, preview: url
        })));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, token, navigate]);

  useEffect(() => {
    if (!form.category) { setApiCategoryFields(null); setLoadingCategoryFields(false); return; }
    let cancelled = false;
    setLoadingCategoryFields(true);
    fetch(`${API_URL}/category-attributes?category=${encodeURIComponent(form.category)}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setApiCategoryFields(Array.isArray(data) && data.length > 0 ? data : null); })
      .catch(() => { if (!cancelled) setApiCategoryFields(null); })
      .finally(() => { if (!cancelled) setLoadingCategoryFields(false); });
    return () => { cancelled = true; };
  }, [form.category]);

  const categoryFields = useMemo(() => {
    if (!form.category) return [];
    return apiCategoryFields ?? [];
  }, [apiCategoryFields, form.category]);

  const handleAttrChange = (fieldId, value) =>
    setForm(prev => ({ ...prev, attributes: { ...prev.attributes, [fieldId]: value } }));

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > maxPhotos) {
      showToast(t.max_images_alert || `Máximo ${maxPhotos} imágenes`, 'error'); return;
    }
    const newImgs = files.map(file => ({
      source: 'new', id: crypto.randomUUID(), url: null, path: null, file,
      preview: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImgs]);
    e.target.value = '';
  };

  const handleGenerateDescription = async () => {
    if (!form.title) { setAiError(t.ai_needs_title || 'Agrega un título primero.'); return; }
    setAiError(null); setAiLoading(true);
    try {
      const attrs = form.attributes && Object.keys(form.attributes).length > 0 ? form.attributes : undefined;
      const res = await fetch(`${API_URL}/ads/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title: form.title, category: form.category || undefined,
          condition: form.condition || undefined, location: form.location || undefined,
          price: form.price || undefined, attributes: attrs }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || data.message || 'No se pudo generar la descripción.'); return; }
      if (data.description) { setForm(prev => ({ ...prev, description: data.description })); showToast('Descripción generada ✨'); }
    } catch { setAiError('Error de conexión.'); }
    finally { setAiLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const formData = new FormData();
      ['title','description','price','location','category','condition'].forEach(k => formData.append(k, form[k]));
      formData.append('state', form.state || '');
      Object.entries(form.attributes).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach(val => formData.append(`attributes[${k}][]`, val));
        else if (v !== '' && v !== null && v !== undefined) formData.append(`attributes[${k}]`, v);
      });
      images.filter(i => i.source === 'existing').forEach(i => formData.append('existing_images[]', i.path));
      images.filter(i => i.source === 'new').forEach(i => formData.append('images[]', i.file));
      const res = await fetch(`${API_URL}/ads/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || 'Error al guardar'); }
      navigate(`/?ad=${id}`);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-lime-500" /></div>;
  if (error && !ad) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-red-400" />
      <p className="text-slate-600">{error}</p>
      <button onClick={() => navigate(-1)} className="btn bg-slate-100 hover:bg-slate-200 text-slate-700">{t.back || 'Volver'}</button>
    </div>
  );

  const CONDITIONS = ['Nuevo', 'Como nuevo', 'Bueno', 'Regular', 'Para piezas'];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#25D366]'}`}>
          {toast.message}
        </div>
      )}

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors">
        <ChevronLeft size={20} /> {t.back_to_ad || 'Volver al anuncio'}
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-lime-100 flex items-center justify-center">
          <Pencil className="w-5 h-5 text-[#65A30D]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.edit_ad || 'Editar anuncio'}</h1>
          <p className="text-slate-500 text-sm">{t.edit_ad_review_desc || 'Los cambios importantes se enviarán a revisión'}</p>
        </div>
      </div>

      {ad?.status === 'rejected' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">{t.ad_rejected || 'Este anuncio fue rechazado'}</p>
            {ad.rejection_reason && <p className="text-red-600 text-sm mt-1">{ad.rejection_reason}</p>}
            <p className="text-red-600 text-sm mt-1">{t.ad_rejected_edit_desc || 'Edítalo y se enviará a revisión nuevamente.'}</p>
          </div>
        </div>
      )}

      {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.ad_title || 'Título'} *</label>
          <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
            required maxLength={255} placeholder="Ej: iPhone 15 Pro en perfecto estado"
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.ad_price || 'Precio'} *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))}
              required min={0} step="0.01" placeholder="0.00"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.category || 'Categoría'} *</label>
          <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value, attributes: {}}))}
            required className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white">
            <option value="">{t.select_category || 'Seleccionar categoría'}</option>
            {categories.map(cat => (
              <option key={cat.slug} value={cat.slug}>{typeof cat.name === 'object' && cat.name ? (cat.name[lang] || cat.name['es'] || cat.slug) : (cat.name || cat.slug)}</option>
            ))}
          </select>
        </div>

        {form.category && (loadingCategoryFields || categoryFields.length > 0) && (
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings2 size={16} className="text-[#84CC16]" />
              {t.ad_attributes || 'Características del anuncio'}
              {loadingCategoryFields && <Loader2 size={14} className="animate-spin text-slate-400" />}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryFields.map(field => {
                const fieldId = field.id || field.key;
                return (
                  <div key={fieldId}>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{field.label}</label>
                    {(field.type === 'select' || field.type === 'checkbox') ? (
                      <select value={form.attributes[fieldId] || ''} onChange={e => handleAttrChange(fieldId, e.target.value)}
                        required={field.required}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400">
                        <option value="">{t.select || 'Seleccionar'}...</option>
                        {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : field.type === 'range' ? (
                      <input type="number" value={form.attributes[fieldId] || ''} onChange={e => handleAttrChange(fieldId, e.target.value)}
                        min={field.range?.min} max={field.range?.max} step={field.range?.step}
                        placeholder={field.minPlaceholder || '0'} required={field.required}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400" />
                    ) : (
                      <input type="text" value={form.attributes[fieldId] || ''} onChange={e => handleAttrChange(fieldId, e.target.value)}
                        placeholder={field.placeholder || ''} required={field.required}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.state || 'Estado'}</label>
          <select value={form.state || ''} onChange={e => setForm(p => ({...p, state: e.target.value}))}
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white">
            <option value="">{t.select_state || 'Seleccionar estado'}</option>
            {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.city || 'Ciudad'} / {t.location || 'Ubicación'}</label>
          <input type="text" value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))}
            placeholder={t.loc_placeholder || "Ej: Ciudad de México, CDMX"}
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">{t.condition || 'Condición'}</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button key={c} type="button" onClick={() => setForm(p => ({...p, condition: c}))}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                  form.condition === c ? 'bg-[#25D366] border-[#25D366] text-white' : 'border-gray-300 text-gray-600 hover:border-[#25D366]'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-slate-700">{t.ad_desc || 'Descripción'} *</label>
            <button type="button" onClick={handleGenerateDescription} disabled={aiLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[#65A30D] hover:bg-[#84CC16]/10 disabled:opacity-50 transition-colors">
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {aiLoading ? (t.generating || 'Generando…') : (t.generate_ai || '✨ Generar con IA')}
            </button>
          </div>
          {aiError && (
            <div className="mb-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle size={13} /> {aiError}
            </div>
          )}
          <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
            required rows={6} placeholder="Describe tu artículo en detalle..."
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white resize-none" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{t.ad_photos || 'Fotos'}</span>
            <span className={`text-xs ${images.length >= maxPhotos ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
              {images.length} / {maxPhotos}
            </span>
          </div>
          {images.length >= maxPhotos && (
            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-2">
              Has alcanzado el límite de fotos.
            </div>
          )}
          <SortablePhotoGrid photos={images} onReorder={setImages} onDelete={id => setImages(prev => prev.filter(i => i.id !== id))} />
          {images.length < maxPhotos && (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-lime-400 flex items-center justify-center gap-2 text-slate-400 hover:text-lime-500 transition-all bg-slate-50 hover:bg-lime-50">
              <Plus size={20} /><span className="text-xs font-medium">{t.add_photo || 'Agregar foto'}</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpg,image/jpeg,image/png,image/webp,image/gif"
            multiple className="hidden" onChange={handleAddImages} />
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Image size={12} /> {t.first_img_main_hint || 'La primera imagen será la foto principal'}
          </p>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">
            {t.cancel || 'Cancelar'}
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-2xl bg-[#84CC16] hover:bg-[#65A30D] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.saving_word || 'Guardando'}...</> : (t.save_changes || 'Guardar cambios')}
          </button>
        </div>
      </form>
    </div>
  );
}
